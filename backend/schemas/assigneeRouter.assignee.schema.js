import { z } from 'zod';

export const assigneeGetProfileSchema = z.object({
    query: z.object({
        email: z.email({ message: "Invalid email format" })
    })
});