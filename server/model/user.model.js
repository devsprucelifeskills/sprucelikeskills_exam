import mongoose from "mongoose";
import { authConnection } from "../config/db.js";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            minlength: [3, "Name must be at least 3 characters long"],
        },

        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [
                /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                "Please provide a valid email",
            ],
        },

        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [6, "Password must be at least 6 characters long"],
        },

        role: {
            type: String,
            enum: ["user", "admin", "trainer"],
            default: "user",
        },

        contact: {
            type: String,
            trim: true,
            match: [
                /^[6-9]\d{9}$/,
                "Please enter a valid 10-digit mobile number",
            ],
            default: "" // Optional
        },
        image: {
            type: String, // Base64 or URL
            default: ""
        },
        googleId: {
            type: String,
            unique: true,
            sparse: true // Allows users with no googleId (e.g. manual entry)
        }
    },
    {
        timestamps: true,
    }
);

const User = authConnection.model("User", userSchema);

export default User;