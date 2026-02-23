import { z } from 'zod';

export const ticketMergeSchema = z.object({
    body: z.object({
        title: z.string().min(1, "Title is required"),
        summary: z.string().min(1, "Summary is required"),
        categories: z.array(z.string()).optional(),
        suggestedSolutions: z.string().optional(),
        deadline: z.string().nullable().optional(),
        assigneeEmails: z.array(z.email("Invalid email format")).optional(),
        draftTicketIDs: z.array(z.number().int()).min(1, "At least one draft ticket ID is required")
    })
});

export const ticketUpdateAdminSchema = z.object({
    body: z.object({
        title: z.string().optional(),
        summary: z.string().optional(),
        solution: z.string().optional(),
        deadline: z.string().optional().nullable(),
        categories: z.array(z.string()).optional(),
        assigneeEmail: z.array(z.email("Invalid email format")).optional(),
        status: z.string().optional(),
        resolutionComment: z.string().optional(),
    }),
    params: z.object({
        id: z.string().trim().min(1, "Ticket ID is required")
    })
});

export const ticketUnlinkSchema = z.object({
    params: z.object({
        parentTicketId: z.string().trim().min(1, "Parent ticket ID is required"),
        childUserRequestID: z.string().trim().min(1, "Child user request ID is required")
    })
});
