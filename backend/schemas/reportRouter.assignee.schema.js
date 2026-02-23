import { z } from 'zod';

export const reportAssigneeSchema = z.object({
    query: z.looseObject({
        email: z.email("Invalid email"),
        days: z.string().optional().transform(val => val ? Math.max(1, parseInt(val, 10)) : 30)
    })
});
