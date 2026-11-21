import { z } from 'zod';

export const loginLocalSchema = z.object({
    body: z.object({
        email: z.email("Invalid email"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        captchaToken: z.string().min(1, "Captcha token is required"),
    })
});

export const registerSchema = z.object({
    body: z.object({
        email: z.email({ message: "Invalid email address" }),
        password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
        captchaToken: z.string().min(1, { message: "Captcha token is required" })
    })
});

export const googleCallbackSchema = z.object({
    body: z.object({
        googleId: z.string(),
        email: z.email(),
        name: z.string()
    })
});
