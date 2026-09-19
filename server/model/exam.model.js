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
        isPublic: {
            type: Boolean,
            default: false,
        },
        enableAntiCheating: {
            type: Boolean,
            default: false,
        },
        eventId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Event',
            default: null
        },
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            // Not required for public exams
        },
        batchIds: [{
            type: mongoose.Schema.Types.ObjectId,
            // Not required for public exams
        }],
        allowedStudents: [{
            type: mongoose.Schema.Types.ObjectId,
            // Not required for public exams
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

examSchema.index({ createdBy: 1 });
examSchema.index({ eventId: 1 });
examSchema.index({ isPublic: 1, isActive: 1 });
examSchema.index({ allowedStudents: 1, isActive: 1 });

const Exam = examConnection.model("Exam", examSchema);

export default Exam;
