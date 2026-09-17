import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = (uri, name) => {
    const conn = mongoose.createConnection(uri);

    conn.on("connected", () => console.log(`MongoDB Connected: ${name}`));
    conn.on("error", (err) => console.error(`MongoDB Connection Error (${name}):`, err));

    return conn;
};

export const authConnection = connectDB(process.env.AUTH_DB_URI, "Auth Database");
export const examConnection = connectDB(process.env.EXAM_DB_URI, "Exam Database");
