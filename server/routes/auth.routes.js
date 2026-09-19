import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import axios from "axios";
import User from "../model/user.model.js";
import { authLimiter, registerLimiter, ssoLimiter } from "../config/rateLimiter.js";

const router = express.Router();

const BCRYPT_ROUNDS = 6;

// Local Email/Password Sign Up
router.post("/register", registerLimiter, async (req, res) => {
    try {
        const { name, email, password, contact } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "Name, email, and password are required" });
        }

        if (name.trim().length < 3) {
            return res.status(400).json({ success: false, message: "Name must be at least 3 characters long" });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters long" });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "An account with this email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

        const newUser = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: "user",
            contact: contact ? contact.trim() : ""
        });

        const token = jwt.sign(
            { id: newUser._id, role: newUser.role, name: newUser.name, email: newUser.email },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(201).json({
            success: true,
            message: "Account created successfully",
            user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role }
        });
    } catch (err) {
        console.error("Register Error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// Local Email/Password Login
router.post("/login", authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role, name: user.name, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(200).json({
            success: true,
            message: "Login successful",
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        console.error("Login Error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// Google OAuth Login
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// Google OAuth Callback
router.get("/google/callback", (req, res, next) => {
    passport.authenticate("google", { session: false }, (err, user, info) => {
        if (err) return res.status(500).json({ message: "Internal server error" });
        if (!user) {
            const message = info ? info.message : "Authentication failed";
            return res.redirect(`${process.env.CLIENT_URL || "http://localhost:3000"}/?error=${encodeURIComponent(message)}`);
        }

        const token = jwt.sign(
            { id: user._id, role: user.role, name: user.name, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        const redirectUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/dashboard`;
        res.redirect(redirectUrl);
    })(req, res, next);
});

// Logout
router.post("/logout", (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: true,
        sameSite: "none"
    });
    res.json({ success: true, message: "Logged out successfully" });
});

// SSO Login Endpoint
router.post("/sso-login", ssoLimiter, async (req, res) => {
    try {
        const { ticket } = req.body;

        if (!ticket) {
            return res.status(400).json({ success: false, message: "SSO ticket is required" });
        }

        const configuredUrl = process.env.MAIN_BACKEND_URL || "http://localhost:5000";
        const ssoSecret = process.env.EXAM_PLATFORM_SSO_SECRET || "spruce_exam_sso_secret_key_987654321_secure";

        const candidateUrls = [
            configuredUrl,
            configuredUrl.replace("localhost", "127.0.0.1"),
            "https://spruceacademia.com",
            "https://api.spruceacademia.com"
        ];

        const makeRequest = (url) => axios.post(
            `${url}/api/v6/events/sso/verify-ticket`,
            { ticket },
            { headers: { "x-sso-secret": ssoSecret }, timeout: 5000 }
        );

        let verifyRes;
        try {
            verifyRes = await Promise.any(candidateUrls.map(makeRequest));
        } catch (aggErr) {
            return res.status(502).json({ success: false, message: "Main server backend is unreachable" });
        }

        if (!verifyRes.data || !verifyRes.data.success) {
            return res.status(401).json({ success: false, message: verifyRes.data?.message || "Invalid or expired SSO ticket" });
        }

        const { user: mainUser, eventId, eventTitle } = verifyRes.data;

        if (!mainUser) {
            return res.status(401).json({ success: false, message: "Invalid SSO ticket payload" });
        }

        let dbUser = null;
        const userId = mainUser._id || mainUser.id;
        if (userId) {
            dbUser = await User.findById(userId);
        }
        if (!dbUser && mainUser.email) {
            dbUser = await User.findOne({ email: mainUser.email.toLowerCase() });
        }

        if (!dbUser) {
            const randomPassword = await bcrypt.hash(Math.random().toString(36), BCRYPT_ROUNDS);
            dbUser = await User.create({
                ...(userId ? { _id: userId } : {}),
                name: mainUser.name || mainUser.email.split("@")[0] || "Student User",
                email: mainUser.email.toLowerCase(),
                password: randomPassword,
                role: mainUser.role || "user",
                contact: mainUser.contact || ""
            });
        }

        const token = jwt.sign(
            { id: dbUser._id, role: dbUser.role || "user", name: dbUser.name, email: dbUser.email },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        const event = eventId ? { id: eventId, title: eventTitle || "" } : null;

        return res.status(200).json({
            success: true,
            message: "SSO Login successful",
            token,
            user: { id: dbUser._id, name: dbUser.name, email: dbUser.email, role: dbUser.role || "user" },
            event
        });
    } catch (err) {
        console.error("SSO Login Error:", err?.response?.data || err.message);
        const errorMessage =
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            (err.code === "ECONNREFUSED" ? "Main server backend is unreachable (Connection refused)" : null) ||
            err.message ||
            "Failed to verify SSO ticket";

        return res.status(401).json({ success: false, message: errorMessage });
    }
});

// Verify Current User
router.get("/me", (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ success: false, message: "No token provided" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ success: true, user: decoded });
    } catch (err) {
        res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
});

export default router;
