import User from "../model/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import EmailVerification from "../model/email_varification.model.js";
import resend from "../config/resend.config.js";


export const registerUser = async (req, res) => {
    try {
        const { name, email, password, cpassword, contact } = req.body;


        if (!name || !email || !password || !cpassword) {
            return res.status(400).json({
                success: false,
                message: "All fields are required.",
            });
        }

        if (name.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: "Name must be at least 3 characters long.",
            });
        }


        const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format.",
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long.",
            });
        }

        if (password !== cpassword) {
            return res.status(400).json({
                success: false,
                message: "Password and Confirm Password do not match.",
            });
        }


        if (contact && !/^[6-9]\d{9}$/.test(contact)) {
            return res.status(400).json({
                success: false,
                message: "Invalid contact number. Enter a 10-digit Indian mobile number.",
            });
        }


        const userExist = await User.findOne({ email });
        if (userExist) {
            return res.status(400).json({
                success: false,
                message: "User already exists with this email.",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);


        const newUser = await User.create({
            name,
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            contact: contact || "",
        });


        return res.status(201).json({
            success: true,
            message: "User registered successfully.",
            user: {
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                contact: newUser.contact,
                role: newUser.role,
            },
        });

    } catch (error) {
        console.error("Register Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const googleRegister = async (req, res) => {
    try {
        const { name, email, image, contact } = req.body;

        // 1. Check if user already exists
        let user = await User.findOne({ email: email.toLowerCase().trim() });

        // 2. If user DOES NOT exist, create a new one
        if (!user) {
            user = await User.create({
                name,
                email: email.toLowerCase().trim(),
                // NOTE: Setting a default password for Google sign-ins.
                // This password should be unusable (e.g., a long random string)
                // if you want to enforce Google login for this account.
                password: "default123",
                contact: contact || "",
                // You might want to save the 'image' and a flag like 'isGoogleUser: true'
            });
        }

        // 3. User exists (either found or newly created), now generate token
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
        );

        // 4. Send success response
        return res.status(200).json({
            message: "Login successful.",
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                // Include other necessary user fields
            },
        });
    } catch (error) {
        // Log the actual error for debugging
        console.error("Google Register Error:", error);
        res.status(500).json({ message: "Server error", error: error.message }); // Send a more specific error detail
    }
};

export const loginUser = async (req, res) => {
    try {

        const { email, password } = req.body;

        if (!email || !password)
            return res.status(400).json({ message: "All fields are required." });

        const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format.",
            });
        }

        const user = await User.findOne({ email });
        if (!user)
            return res.status(400).json({ message: "Invalid email or password." });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
            return res.status(400).json({ message: "Invalid email or password." });

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
        );

        return res.status(200).json({
            message: "Login successful.",
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};


export const isLogin = async (req, res) => {
    try {
        const user = req.user; // added by isLoggedIn middleware

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized. Token missing or invalid."
            });
        }

        const userData = await User.findById(user.id).select("-password");

        if (!userData) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "User authenticated successfully.",
            user: {
                _id: userData._id,
                name: userData.name,
                email: userData.email,
                role: userData.role,
                contact: userData.contact
            }
        });

    } catch (error) {
        console.error("isLogin Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error.",
            error: error.message
        });
    }
};

export const VerifyEmail = async (req, res) => {
    try {
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({ success: false, message: "Name and Email are required." });
        }
        const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format.",
            });
        }

        const user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({
                success: false,
                message: "Email already exists.",
            });
        }

        const transport = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            },
        });

        const otp = Math.floor(100000 + Math.random() * 900000);


        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Verify Your Email Address",
            html: `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <h2 style="color: #2E7D32;">Hello ${name},</h2>

    <p>Thank you for registering with <strong>Spruce LifeSkills</strong>.</p>

    <p>Please use the following OTP to verify your email address:</p>

    <div style="
      font-size: 24px;
      font-weight: bold;
      letter-spacing: 6px;
      background: #f4f4f4;
      padding: 15px;
      text-align: center;
      border-radius: 6px;
      margin: 20px 0;
    ">
      ${otp}
    </div>

    <p>This OTP is valid for <strong>10 minutes</strong>.</p>

    <p>If you did not request this, please ignore this email.</p>

    <br/>

    <p>
      Best regards,<br/>
      <strong>Spruce LifeSkills Team</strong>
    </p>
  </div>
`
            ,
        };

        // await transport.sendMail(mailOptions);

        const { data, error } = await resend.emails.send(mailOptions);
        if (error) {
            console.error("Resend Error:", error);
            return res.status(500).json({
                success: false,
                message: "Server error sending verification email.",
                error: error.message,
            });
        }

        console.log("Resend Data:", data);

        await EmailVerification.create({
            email,
            otp,
            expiresAt: new Date(Date.now() + 600 * 1000), // 10 minutes
        });

        return res.status(200).json({
            success: true,
            message: "Verification email sent successfully.",
        });
    } catch (error) {
        console.error("VerifyEmail Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error sending verification email.",
            error: error.message,
        });
    }
}

export const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ success: false, message: "Email and OTP are required." });
        }

        const verification = await EmailVerification.findOne({ email });
        if (!verification) {
            return res.status(404).json({ success: false, message: "Verification record not found." });
        }

        console.log(typeof verification.otp, typeof otp);
        if (verification.otp !== parseInt(otp)) {
            return res.status(400).json({ success: false, message: "Invalid OTP." });
        }

        if (verification.expiresAt < Date.now()) {
            return res.status(400).json({ success: false, message: "Verification code has expired." });
        }



        return res.status(200).json({
            success: true,
            message: "Email verified successfully.",
        });


    } catch (error) {
        console.error("verifyOtp Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error verifying OTP.",
            error: error.message,
        });
    }
}

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        console.log("Email:", email);
        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required." });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }


        const otp = Math.floor(100000 + Math.random() * 900000);


        console.log("email details", process.env.EMAIL_USER, process.env.EMAIL_PASSWORD, process.env.EMAIL_HOST, process.env.EMAIL_PORT);

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Reset Your Password",
            html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #2E7D32;">Hello ${user.name},</h2>
          <p>We received a request to reset your password for your <strong>Spruce LifeSkills</strong> account.</p>
          <p>Please use the following OTP to reset your password:</p>
          <div style="
            font-size: 24px;
            font-weight: bold;
            letter-spacing: 6px;
            background: #f4f4f4;
            padding: 15px;
            text-align: center;
            border-radius: 6px;
            margin: 20px 0;
          ">
            ${otp}
          </div>
          <p>This OTP is valid for <strong>10 minutes</strong>.</p>
          <p>If you did not request this, please ignore this email.</p>
          <br/>
          <p>Best regards,<br/><strong>Spruce LifeSkills Team</strong></p>
        </div>
      `,
        };
        console.log("Mail Options:", mailOptions);

        // await transport.sendMail(mailOptions);
        const { data, error } = await resend.emails.send(mailOptions);
        if (error) {
            console.error("Resend Error:", error);
            return res.status(500).json({
                success: false,
                message: "Server error sending verification email.",
                error: error.message,
            });
        }

        console.log("Resend Data:", data);

        console.log("OTP sent to email:", email);

        // Save/Update OTP in DB
        await EmailVerification.findOneAndUpdate(
            { email },
            { otp, expiresAt: new Date(Date.now() + 600 * 1000) }, // 10 mins
            { upsert: true, new: true }
        );

        return res.status(200).json({ success: true, message: "OTP sent to your email." });

    } catch (error) {
        console.error("forgotPassword Error:", error);
        return res.status(500).json({ success: false, message: "Server error sending OTP.", error: error.message });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ success: false, message: "All fields are required." });
        }

        // Verify OTP
        const verification = await EmailVerification.findOne({ email });
        if (!verification) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
        }

        if (verification.otp !== parseInt(otp)) {
            return res.status(400).json({ success: false, message: "Invalid OTP." });
        }

        if (verification.expiresAt < Date.now()) {
            return res.status(400).json({ success: false, message: "OTP has expired." });
        }

        // Update User Password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.findOneAndUpdate({ email }, { password: hashedPassword });

        // Delete OTP record
        await EmailVerification.deleteOne({ email });

        return res.status(200).json({ success: true, message: "Password reset successfully." });

    } catch (error) {
        console.error("resetPassword Error:", error);
        return res.status(500).json({ success: false, message: "Server error resetting password.", error: error.message });
    }
};
//demo