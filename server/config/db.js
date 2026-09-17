import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = (uri, name) => {
    if (!uri) {
        console.error(`❌ CRITICAL ERROR: Environment variable for '${name}' is undefined! Check your Vercel Environment Variables.`);
    }

    const conn = mongoose.createConnection(uri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
    });

    conn.on("connected", () => console.log(`✅ MongoDB Connected: ${name}`));
    conn.on("error", (err) => console.error(`❌ MongoDB Connection Error (${name}):`, err));

    return conn;
};

export const authConnection = connectDB(process.env.AUTH_DB_URI, "Auth Database");
export const examConnection = connectDB(process.env.EXAM_DB_URI, "Exam Database");

