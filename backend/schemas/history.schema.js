import { z } from 'zod';
export const historySchema = z.object({
    ticketID: z.number().min(1),
    action: z.string().min(1),
    performer: z.email().min(1),
    details: z.string().min(1)
});

export const historyBatchSchema = z.array(historySchema);
