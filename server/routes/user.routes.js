import express from "express";
import isAuthenticated from "../middleware/isAuthenticated.js";

import User from "../model/user.model.js";
import Exam from "../model/exam.model.js";

const router = express.Router();

// Role-based access control middleware
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Role (${req.user.role}) is not allowed to access this resource`
            });
        }
        next();
    };
};

router.get("/dashboard-data", isAuthenticated, async (req, res) => {
    try {
        if (req.user.role === "admin" || req.user.role === "trainer") {
            const studentCount = await User.countDocuments({ role: "student" });
            const totalExams = await Exam.countDocuments({ createdBy: req.user.id });
            const activeExams = await Exam.countDocuments({ 
                createdBy: req.user.id,
                isActive: true
            });

            res.json({
                success: true,
                data: {
                    message: "Welcome to the Admin/Trainer Dashboard",
                    stats: { 
                        students: studentCount, 
                        exams: totalExams, 
                        activeExams: activeExams 
                    }
                }
            });
        } else {
            // For students, fetch upcoming exams they are allowed to take
            const upcomingExams = await Exam.find({
                allowedStudents: req.user.id,
                isActive: true,
                startTime: { $gt: new Date() }
            })
            .select("title startTime")
            .limit(5)
            .lean();

            res.json({
                success: true,
                data: {
                    message: "Welcome to the Student Dashboard",
                    upcomingExams: upcomingExams.map(e => ({
                        id: e._id,
                        name: e.title,
                        date: new Date(e.startTime).toLocaleDateString()
                    }))
                }
            });
        }
    } catch (err) {
        console.error("Dashboard Data Error:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

export default router;
