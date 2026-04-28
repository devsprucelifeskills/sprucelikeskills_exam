import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import mongoose from "mongoose";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import User from "./model/user.model.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 9002;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = [process.env.CLIENT_URL, "http://localhost:3000"];
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true
}));

// MongoDB Connections
import { authConnection, examConnection } from "./config/db.js";

// Passport Setup
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.SERVER_URL || `http://localhost:${process.env.PORT || 9002}`}/api/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value;

        // Find user by email
        let user = await User.findOne({ email });

        if (!user) {
            // No Signup Option: Only allow existing users
            return done(null, false, { message: "Unauthorized. Your email is not registered." });
        }

        // Update user with googleId if not already set
        if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
        }

        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));

// Routes
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import examRoutes from "./routes/exam.routes.js";

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/exam", examRoutes);

app.get("/", (req, res) => {
    res.send("SpruceExam Backend is running.");
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
