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
app.set("trust proxy", 1);
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
import ExamResult from "./model/examResult.model.js";

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/exam", examRoutes);

app.get("/", (req, res) => {
    res.send("SpruceExam Backend is running.");
});

// Health check
app.get("/ping", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// import fs from "fs/promises";

// const examResult = await ExamResult.find({
//   createdAt: {
//     $gte: new Date("2026-07-04T00:00:00.000Z"),
//     $lt: new Date("2026-07-05T00:00:00.000Z")
//   },
//   examId: "6a1484131c004e15272522f8"
// }).lean(); // <-- IMPORTANT
// console.log("Exam Results Count:", examResult.length);

// const studentTimeMap = {
//   "mshruti829@gmail.com": {
//     startedAt: "7/4/2026, 11:52:23 AM",
//     submittedAt: "7/4/2026, 1:10:01 PM"
//   },
//   "laxmirahangdale775@gmail.com": {
//     startedAt: "7/4/2026, 11:44:12 AM",
//     submittedAt: "7/4/2026, 1:06:17 PM"
//   },
//   "kusramrinku6@gmail.com": {
//     startedAt: "7/4/2026, 11:56:47 AM",
//     submittedAt: "7/4/2026, 1:04:46 PM"
//   },
//   "ugalevaishnu28@gmail.com": {
//     startedAt: "7/4/2026, 11:45:32 AM",
//     submittedAt: "7/4/2026, 1:03:46 PM"
//   },
//   "abhaylawhale@gmail.com": {
//     startedAt: "7/4/2026, 11:51:26 AM",
//     submittedAt: "7/4/2026, 12:58:47 PM"
//   },
//   "kashishtopre@gmail.com": {
//     startedAt: "7/4/2026, 11:52:23 AM",
//     submittedAt: "7/4/2026, 12:52:33 PM"
//   },
//   "shrushtimeshram465@gmail.com": {
//     startedAt: "7/4/2026, 11:41:05 AM",
//     submittedAt: "7/4/2026, 12:52:15 PM"
//   },
//   "vaibhavipashine03@gmail.com": {
//     startedAt: "7/4/2026, 11:43:17 AM",
//     submittedAt: "7/4/2026, 12:51:51 PM"
//   },
//   "bhagyashriranotkar@gmail.com": {
//     startedAt: "7/4/2026, 11:57:02 AM",
//     submittedAt: "7/4/2026, 12:51:51 PM"
//   },
//   "payaldhabale26@gmail.com": {
//     startedAt: "7/4/2026, 11:59:29 AM",
//     submittedAt: "7/4/2026, 12:48:10 PM"
//   },
//   "mohanlalsahada@gmail.com": {
//     startedAt: "7/4/2026, 11:48:22 AM",
//     submittedAt: "7/4/2026, 12:47:59 PM"
//   },
//   "adityakhaparde034@gmail.com": {
//     startedAt: "7/4/2026, 11:46:11 AM",
//     submittedAt: "7/4/2026, 12:46:32 PM"
//   },
//   "tiplekajal13@gmail.com": {
//     startedAt: "7/4/2026, 11:41:09 AM",
//     submittedAt: "7/4/2026, 12:45:42 PM"
//   },
//   "sweetygajbhiye9@gmail.com": {
//     startedAt: "7/4/2026, 11:55:38 AM",
//     submittedAt: "7/4/2026, 12:45:33 PM"
//   },
//   "avantikaakre2002@gmail.com": {
//     startedAt: "7/4/2026, 11:58:44 AM",
//     submittedAt: "7/4/2026, 12:44:26 PM"
//   },
//   "pratiksha2018abc@gmail.com": {
//     startedAt: "7/4/2026, 11:54:56 AM",
//     submittedAt: "7/4/2026, 12:44:23 PM"
//   },
//   "mishrashruti81493@gmail.com": {
//     startedAt: "7/4/2026, 11:53:45 AM",
//     submittedAt: "7/4/2026, 12:44:10 PM"
//   },
//   "rajashrihole@gmail.com": {
//     startedAt: "7/4/2026, 11:56:44 AM",
//     submittedAt: "7/4/2026, 12:43:58 PM"
//   },
//   "kumkumtiwari7061@gmail.com": {
//     startedAt: "7/4/2026, 11:57:27 AM",
//     submittedAt: "7/4/2026, 12:43:26 PM"
//   },
//   "loherutuja@gmail.com": {
//     startedAt: "7/4/2026, 11:49:58 AM",
//     submittedAt: "7/4/2026, 12:43:13 PM"
//   },
//   "himaniwarghat2001@gmail.com": {
//     startedAt: "7/4/2026, 11:52:55 AM",
//     submittedAt: "7/4/2026, 12:42:33 PM"
//   },
//   "aashikaharne@gmail.com": {
//     startedAt: "7/4/2026, 11:56:47 AM",
//     submittedAt: "7/4/2026, 12:41:59 PM"
//   },
//   "chinchalkarhimanshu@gmail.com": {
//     startedAt: "7/4/2026, 11:51:26 AM",
//     submittedAt: "7/4/2026, 12:40:50 PM"
//   },
//   "rohanlanjewar2000@gmail.com": {
//     startedAt: "7/4/2026, 11:54:57 AM",
//     submittedAt: "7/4/2026, 12:40:47 PM"
//   },
//   "praut8301@gmail.com": {
//     startedAt: "7/4/2026, 11:49:01 AM",
//     submittedAt: "7/4/2026, 12:40:27 PM"
//   },
//   "gangboirdigamber@gmail.com": {
//     startedAt: "7/4/2026, 11:43:54 AM",
//     submittedAt: "7/4/2026, 12:40:15 PM"
//   },
//   "vsen32388@gmail.com": {
//     startedAt: "7/4/2026, 11:44:28 AM",
//     submittedAt: "7/4/2026, 12:40:12 PM"
//   },
//   "sagarmungmode0703@gmail.com": {
//     startedAt: "7/4/2026, 11:59:36 AM",
//     submittedAt: "7/4/2026, 12:38:39 PM"
//   },
//   "dhanrajchanodkar@gmail.com": {
//     startedAt: "7/4/2026, 11:53:20 AM",
//     submittedAt: "7/4/2026, 12:38:38 PM"
//   },
//   "ganesh2003.123@gmail.com": {
//     startedAt: "7/4/2026, 11:58:42 AM",
//     submittedAt: "7/4/2026, 12:35:42 PM"
//   },
//   "kalyanipatrikar0508@gmail.com": {
//     startedAt: "7/4/2026, 11:56:44 AM",
//     submittedAt: "7/4/2026, 12:35:27 PM"
//   },
//   "sonalitelang86@gmail.com": {
//     startedAt: "7/4/2026, 11:57:53 AM",
//     submittedAt: "7/4/2026, 12:35:09 PM"
//   },
//   "ankitakadao7@gmail.com": {
//     startedAt: "7/4/2026, 11:44:22 AM",
//     submittedAt: "7/4/2026, 12:34:50 PM"
//   },
//   "agrawalpallu9@gmail.com": {
//     startedAt: "7/4/2026, 11:52:46 AM",
//     submittedAt: "7/4/2026, 12:34:23 PM"
//   },
//   "kajeltembhare77@gmail.com": {
//     startedAt: "7/4/2026, 11:48:02 AM",
//     submittedAt: "7/4/2026, 12:32:32 PM"
//   },
//   "jyotism2426@gmail.com": {
//     startedAt: "7/4/2026, 11:50:50 AM",
//     submittedAt: "7/4/2026, 12:32:16 PM"
//   },
//   "shrutisuryawanshi44@gmail.com": {
//     startedAt: "7/4/2026, 11:57:19 AM",
//     submittedAt: "7/4/2026, 12:32:13 PM"
//   },
//   "kunalpande135@gmail.com": {
//     startedAt: "7/4/2026, 11:53:24 AM",
//     submittedAt: "7/4/2026, 12:32:00 PM"
//   },
//   "mayurikurve706@gmail.com": {
//     startedAt: "7/4/2026, 11:54:33 AM",
//     submittedAt: "7/4/2026, 12:31:59 PM"
//   },
//   "kajalnagpure909@gmail.com": {
//     startedAt: "7/4/2026, 11:55:58 AM",
//     submittedAt: "7/4/2026, 12:31:56 PM"
//   },
//   "pthakre288@gmail.com": {
//     startedAt: "7/4/2026, 11:49:52 AM",
//     submittedAt: "7/4/2026, 12:31:56 PM"
//   },
//   "surajbisen2004@gmail.com": {
//     startedAt: "7/4/2026, 11:42:01 AM",
//     submittedAt: "7/4/2026, 12:30:30 PM"
//   },
//   "lanjeprashan.1234@gmail.com": {
//     startedAt: "7/4/2026, 11:53:26 AM",
//     submittedAt: "7/4/2026, 12:30:22 PM"
//   },
//   "pakansha666@gmail.com": {
//     startedAt: "7/4/2026, 11:56:41 AM",
//     submittedAt: "7/4/2026, 12:29:41 PM"
//   },
//   "prachichopde95@gmail.com": {
//     startedAt: "7/4/2026, 11:43:59 AM",
//     submittedAt: "7/4/2026, 12:28:59 PM"
//   },
//   "payalghubade32@gmail.com": {
//     startedAt: "7/4/2026, 11:41:00 AM",
//     submittedAt: "7/4/2026, 12:28:46 PM"
//   },
//   "daminikukade711@gmail.com": {
//     startedAt: "7/4/2026, 11:59:47 AM",
//     submittedAt: "7/4/2026, 12:27:55 PM"
//   },
//   "saharenikki786@gmail.com": {
//     startedAt: "7/4/2026, 11:59:56 AM",
//     submittedAt: "7/4/2026, 12:27:35 PM"
//   },
//   "vaibhavijambhole14@gmail.com": {
//     startedAt: "7/4/2026, 11:52:48 AM",
//     submittedAt: "7/4/2026, 12:26:58 PM"
//   },
//   "katreprachi123@gmail.com": {
//     startedAt: "7/4/2026, 11:56:23 AM",
//     submittedAt: "7/4/2026, 12:25:43 PM"
//   },
//   "gnirvikar@gmail.com": {
//     startedAt: "7/4/2026, 11:54:56 AM",
//     submittedAt: "7/4/2026, 12:25:08 PM"
//   },
//   "rahulsomkuwar1998@gmail.com": {
//     startedAt: "7/4/2026, 11:51:04 AM",
//     submittedAt: "7/4/2026, 12:25:04 PM"
//   },
//   "prajapatianjali2710@gmail.com": {
//     startedAt: "7/4/2026, 11:56:19 AM",
//     submittedAt: "7/4/2026, 12:24:47 PM"
//   },
//   "kolamkarrasika12@gmail.com": {
//     startedAt: "7/4/2026, 11:54:44 AM",
//     submittedAt: "7/4/2026, 12:24:43 PM"
//   },
//   "aditiambekar01@gmail.com": {
//     startedAt: "7/4/2026, 11:52:06 AM",
//     submittedAt: "7/4/2026, 12:21:03 PM"
//   },
//   "humerajuhi786@gmail.com": {
//     startedAt: "7/4/2026, 11:49:32 AM",
//     submittedAt: "7/4/2026, 12:19:32 PM"
//   },
//   "janudashhare18@gmail.com": {
//     startedAt: "7/4/2026, 11:46:38 AM",
//     submittedAt: "7/4/2026, 12:16:11 PM"
//   },
//   "bhagyshreegohane124@gmail.com": {
//     startedAt: "7/4/2026, 11:58:45 AM",
//     submittedAt: "7/4/2026, 12:13:38 PM"
//   }
// };
// const formattedResults = examResult.map((record) => {
//   const timing = studentTimeMap[record.studentEmail] || {};

//   return {
//     _id: record._id,
//     examId: record.examId,
//     studentId: record.studentId,
//     studentName: record.studentName,
//     studentEmail: record.studentEmail,
//     score: record.score,
//     isPassed: record.isPassed,
//     answers: record.answers,

//     // New fields
//     startedAt: timing.startedAt || null,
//     submittedAt:
//       timing.submittedAt  
//   };
// });

// await fs.writeFile(
//   "exam-results-final.json",
//   JSON.stringify(formattedResults, null, 2),
//   "utf8"
// );

// console.log("✅ exam-results-final.json created successfully.");
// console.log(`Total Records: ${formattedResults.length}`);

