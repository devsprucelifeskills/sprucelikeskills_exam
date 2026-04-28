import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import User from "./model/user.model.js";

dotenv.config();

const seedUser = async () => {
    try {
        await mongoose.connect(process.env.AUTH_DB_URI);
        console.log("MongoDB Connected for seeding");

        const testEmail = "testuser@example.com"; // CHANGE THIS to your email to test
        const testPassword = "password123"; // Test password
        const existingUser = await User.findOne({ email: testEmail });

        if (existingUser) {
            console.log("User already exists. Updating password for local login test.");
            existingUser.password = await bcrypt.hash(testPassword, 10);
            await existingUser.save();
        } else {
            const hashedPassword = await bcrypt.hash(testPassword, 10);
            await User.create({
                name: "Test Admin",
                email: testEmail,
                role: "admin",
                password: hashedPassword
            });
            console.log(`User ${testEmail} created with admin role and password: ${testPassword}`);
        }

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

seedUser();
