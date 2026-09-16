import mongoose from "mongoose";
import { authConnection } from "../config/db.js";

// Course Schema (Read-only representation of spruceDB.courses)
const courseSchema = new mongoose.Schema({
    title: String,
    // Add other fields if necessary, but title is enough for dropdowns
}, { strict: false }); // strict: false allows us to read docs even if we don't define all fields

// Batch Schema (Read-only representation of spruceDB.batches)
const batchSchema = new mongoose.Schema({
    name: String,
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course"
    },
    students: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]
}, { strict: false });

// Event Schema (Read-only representation of spruceDB.events)
const eventSchema = new mongoose.Schema({
    title: String,
    hasTest: Boolean
}, { strict: false });

export const Course = authConnection.model("Course", courseSchema, "courses");
export const Batch = authConnection.model("Batch", batchSchema, "batches");
export const Event = authConnection.model("Event", eventSchema, "events");

