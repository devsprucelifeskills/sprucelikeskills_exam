import mongoose from "mongoose";
import { examConnection } from "../config/db.js";

const examResultSchema = new mongoose.Schema(
    {
        examId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Exam",
            required: true,
        },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        studentName: {
            type: String,
            required: true,
        },
        studentEmail: {
            type: String,
            required: true,
        },
        score: {
            type: Number,
            required: true,
        },
        isPassed: {
            type: Boolean,
            required: true,
        },
        startedAt: {
            type: Date,
            default: null,
        },
        answers: [{
            questionIndex: Number,
            selectedOptionIndex: Number,
        }],
    },
    {
        timestamps: true,
    }
);

examResultSchema.index({ studentId: 1, examId: 1 }, { unique: true });
examResultSchema.index({ examId: 1, createdAt: -1 });
examResultSchema.index({ studentId: 1, createdAt: -1 });

const ExamResult = examConnection.model("ExamResult", examResultSchema);

export default ExamResult;
