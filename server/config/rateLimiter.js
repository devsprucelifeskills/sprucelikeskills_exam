import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { success: false, message: "Too many requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});

export const registerLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { success: false, message: "Too many registration attempts, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});

export const ssoLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { success: false, message: "Too many SSO attempts, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});

export const examSubmitLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 3,
    message: { success: false, message: "Too many submission attempts, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});
