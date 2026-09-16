import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import axios from "axios";
import User from "../model/user.model.js";

const router = express.Router();


// Local Email/Password Sign Up
router.post("/register", async (req, res) => {
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

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: "user",
            contact: contact ? contact.trim() : ""
        });

        // Generate JWT
        const token = jwt.sign(
            { id: newUser._id, role: newUser.role, name: newUser.name, email: newUser.email },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        // Send token in cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
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
router.post("/login", async (req, res) => {
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

        // Generate JWT
        const token = jwt.sign(
            { id: user._id, role: user.role, name: user.name, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        // Send token in cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
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
            // Redirect to frontend with error message
            const message = info ? info.message : "Authentication failed";
            return res.redirect(`${process.env.CLIENT_URL || "http://localhost:3000"}/?error=${encodeURIComponent(message)}`);
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user._id, role: user.role, name: user.name, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        // Send token in cookie (HttpOnly for security)
        res.cookie("token", token, {
            httpOnly: true,
            secure: true, // Must be true for SameSite: None
            sameSite: "none", // Required for cross-site cookies
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Redirect to dashboard
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
// Single-Backend verifySsoTicket returns:
//   { success: true, user: { _id, name, email, contact }, eventId, eventTitle }
router.post("/sso-login", async (req, res) => {
    try {
        const { ticket } = req.body;

        if (!ticket) {
            return res.status(400).json({ success: false, message: "SSO ticket is required" });
        }

        // Call Main Backend ticket verification endpoint
        const configuredUrl = process.env.MAIN_BACKEND_URL || "http://localhost:5000";
        const ssoSecret = process.env.EXAM_PLATFORM_SSO_SECRET || "spruce_exam_sso_secret_key_987654321_secure";

        // Candidate URLs to try in case of connection refused (port differences, IPv4/v6, or domain variations)
        const candidateUrls = Array.from(new Set([
            configuredUrl,
            configuredUrl.replace("localhost", "127.0.0.1"),
            "http://localhost:5000",
            "http://127.0.0.1:5000",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
            "http://localhost:5001",
            "http://127.0.0.1:5001",
            "https://spruceacademia.com",
            "https://api.spruceacademia.com"
        ]));

        let verifyRes = null;
        let lastError = null;

        for (const targetUrl of candidateUrls) {
            try {
                verifyRes = await axios.post(
                    `${targetUrl}/api/v6/events/sso/verify-ticket`,
                    { ticket },
                    {
                        headers: { "x-sso-secret": ssoSecret },
                        timeout: 5000
                    }
                );
                console.log(`[SSO] Ticket successfully verified via ${targetUrl}`);
                break;
            } catch (err) {
                lastError = err;
                // If it's not a connection error (e.g. 400 Bad Request, 401 Unauthorized), stop retrying other ports
                if (err.response) {
                    break;
                }
            }
        }

        if (!verifyRes) {
            throw lastError || new Error("Failed to reach main backend server");
        }

        if (!verifyRes.data || !verifyRes.data.success) {
            return res.status(401).json({ success: false, message: verifyRes.data?.message || "Invalid or expired SSO ticket" });
        }

        // Destructure matching Single-Backend's actual response shape
        const { user: mainUser, eventId, eventTitle } = verifyRes.data;

        if (!mainUser) {
            return res.status(401).json({ success: false, message: "Invalid SSO ticket payload" });
        }

        // Look up user in shared MongoDB by _id (Single-Backend returns _id) or fallback to email
        let dbUser = null;
        const userId = mainUser._id || mainUser.id;
        if (userId) {
            dbUser = await User.findById(userId);
        }
        if (!dbUser && mainUser.email) {
            dbUser = await User.findOne({ email: mainUser.email.toLowerCase() });
        }

        if (!dbUser) {
            console.log(`[SSO] Auto-creating user record for ${mainUser.email} (${userId || "no-id"})`);
            const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
            dbUser = await User.create({
                ...(userId ? { _id: userId } : {}),
                name: mainUser.name || mainUser.email.split("@")[0] || "Student User",
                email: mainUser.email.toLowerCase(),
                password: randomPassword,
                role: mainUser.role || "user",
                contact: mainUser.contact || ""
            });
        }

        // Generate SpruceExam JWT
        const token = jwt.sign(
            { id: dbUser._id, role: dbUser.role || "user", name: dbUser.name, email: dbUser.email },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        // Send token in HttpOnly cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Normalize event into { id, title } shape for the frontend
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


