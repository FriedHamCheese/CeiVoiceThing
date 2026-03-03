import { z } from 'zod';

export const reportAdminSchema = z.object({
    query: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        category: z.string().optional(),
        status: z.string().optional(),
    })
});
