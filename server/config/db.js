import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = (uri, name) => {
    const conn = mongoose.createConnection(uri, {
        serverSelectionTimeoutMS: 15000,
    });

    conn.on("connected", () => console.log(`MongoDB Connected: ${name}`));
    conn.on("error", (err) => console.error(`MongoDB Connection Error (${name}):`, err.message || err));

    return conn;
};

export const examConnection = connectDB(process.env.EXAM_DB_URI, "Exam Database");

const getDbNameFromUri = (uri, fallback) => {
    if (!uri) return fallback;
    try {
        const pathPart = uri.split("?")[0].split("/").pop();
        return pathPart || fallback;
    } catch {
        return fallback;
    }
};

const authClusterHost = process.env.AUTH_DB_URI?.split("@")[1]?.split("/")[0];
const examClusterHost = process.env.EXAM_DB_URI?.split("@")[1]?.split("/")[0];
const isSameCluster = authClusterHost && examClusterHost && authClusterHost === examClusterHost;

const authDbName = getDbNameFromUri(process.env.AUTH_DB_URI, "spruceDB");

export const authConnection = isSameCluster
    ? examConnection.useDb(authDbName, { useCache: true })
    : connectDB(process.env.AUTH_DB_URI, "Auth Database");

if (isSameCluster) {
    examConnection.on("connected", () => {
        console.log(`MongoDB Connected: Auth Database (sharing cluster connection -> ${authDbName})`);
    });
}
