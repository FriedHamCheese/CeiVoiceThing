import { z } from 'zod';

export const ticketRequestsSchema = z.object({
    params: z.object({
        id: z.string().min(1, "Ticket ID is required")
    })
});

export const ticketHistorySchema = z.object({
    params: z.object({
        id: z.string().min(1, "Ticket ID is required")
    })
});
