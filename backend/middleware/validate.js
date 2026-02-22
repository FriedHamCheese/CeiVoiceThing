import { z } from 'zod';

/**
 * auth.js
 */
export const loginLocalSchema = z.object({
    email: z.email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    captchaToken: z.string().min(1, "Captcha token is required"),
});

export const registerSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
    // Enforce a minimum length for security
    password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
    captchaToken: z.string().min(1, { message: "Captcha token is required" })
});

export const googleCallbackSchema = z.object({
    googleId: z.string(),
    email: z.email(),
    name: z.string()
});

/**
 * balancer.js
 */
export const balancerSchema = z.object({
    pool: z.any(),
    scopeTag: z.string().min(1, "Scope tag is required"),
    fallbackEmail: z.email("Invalid fallback email"),
});

/**
 * classifier.js
 */
export const classifierSchema = z.object({
    classifierUrl: z.url("Invalid URL"),
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
    text: z.string().min(1, "Text is required"),
});

/**
 * email.js
 */
export const sendConfirmationEmailSchema = z.object({
    toEmail: z.email("Invalid email"),
    trackingToken: z.string().min(1, "Tracking token is required"),
});

export const sendStatusUpdateEmailSchema = z.object({
    toEmail: z.email("Invalid email"),
    ticketTitle: z.string().min(1, "Ticket title is required"),
    newStatus: z.string().min(1, "New status is required"),
    trackingToken: z.string().min(1, "Tracking token is required"),
});

export const sendCommentNotificationEmailSchema = z.object({
    toEmail: z.email("Invalid email"),
    ticketTitle: z.string().min(1, "Ticket title is required"),
    commenterName: z.string().min(1, "Commenter name is required"),
    commentText: z.string().min(1, "Comment text is required"),
    link: z.url("Invalid URL"),
    isInternal: z.boolean("isInternal must be a boolean"),
});

export const sendAssignmentNotificationEmailSchema = z.object({
    toEmail: z.email("Invalid email"),
    ticketTitle: z.string().min(1, "Ticket title is required"),
    assignerEmail: z.email("Invalid email"),
    link: z.url("Invalid URL"),
});

/**
 * report.js
 */
export const reportAdminSchema = z.object({
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
});
export const reportAssigneeSchema = z.object({
    email: z.email("Invalid email"),
    days: z.number().min(1, "Days is required"),
});
