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
            required: true, // References User in auth DB
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
        answers: [{
            questionIndex: Number,
            selectedOptionIndex: Number,
        }],
    },
    {
        timestamps: true,
    }
);

const ExamResult = examConnection.model("ExamResult", examResultSchema);

export default ExamResult;
