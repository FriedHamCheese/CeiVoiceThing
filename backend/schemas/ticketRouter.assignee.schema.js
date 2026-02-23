import { z } from 'zod';

export const historySchema = z.object({
    ticketID: z.number().min(1),
    action: z.string().min(1),
    performer: z.email().min(1),
    details: z.string().min(1)
});

export const historyBatchSchema = z.array(historySchema);

export const ticketUpdateSchema = z.object({
    body: z.object({
        status: z.string().optional(),
        resolutionComment: z.string().nullable().optional(),
        assigneeEmail: z.array(z.email("Invalid email format")).optional(),
    }),
    params: z.object({
        id: z.string().trim().min(1, "Ticket ID is required")
    })
});

export const getHistorySchema = z.object({
    params: z.object({
        id: z.string().trim().min(1, "Ticket ID is required")
    })
});
