import mongoose from "mongoose";
import { examConnection } from "../config/db.js";

const examSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Exam title is required"],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        duration: {
            type: Number, // in minutes
            required: true,
            default: 60,
        },
        startTime: {
            type: Date,
            required: true,
        },
        endTime: {
            type: Date,
            required: true,
        },
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true, // References course in auth DB
        },
        batchIds: [{
            type: mongoose.Schema.Types.ObjectId,
            required: true, // References batches in auth DB
        }],
        allowedStudents: [{
            type: mongoose.Schema.Types.ObjectId,
            required: true, // Specific students targeted for this exam
        }],
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            required: true, // References user in auth DB
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        passingScore: {
            type: Number,
            required: true,
            default: 40,
        },
        totalMarks: {
            type: Number,
            required: true,
            default: 100,
        },
        questions: [{
            text: { type: String, required: true },
            options: [{ type: String, required: true }],
            correctOptionIndex: { type: Number, required: true },
            marks: { type: Number, default: 1 },
            image: { type: String } // URL to Cloudinary image
        }]
    },
    {
        timestamps: true,
    }
);

const Exam = examConnection.model("Exam", examSchema);

export default Exam;
