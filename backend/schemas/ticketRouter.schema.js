import { z } from 'zod';

export const createRequestSchema = z.object({
    body: z.object({
        requestText: z.string().min(1, "Request text is required").max(2048, "Request text is too long"),
        fromEmail: z.email("Invalid email format").max(64, "Email is too long")
    })
});

export const getCommentsSchema = z.object({
    params: z.object({
        id: z.string().min(1, "Ticket ID is required")
    })
});

export const addCommentSchema = z.object({
    params: z.object({
        id: z.string().min(1, "Ticket ID is required")
    }),
    body: z.object({
        text: z.string().min(1, "Comment text required"),
        isInternal: z.boolean().optional()
    })
});

export const toggleFollowSchema = z.object({
    params: z.object({
        id: z.string().min(1, "Ticket ID is required")
    })
});

export const userRequestsSchema = z.object({
    body: z.object({
        email: z.email("Invalid email format")
    })
});

export const creatorSchema = z.object({
    params: z.object({
        ticketID: z.string().min(1, "Ticket ID is required")
    })
});
