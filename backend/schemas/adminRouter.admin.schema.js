import { z } from 'zod';

export const adminPatchUserSchema = z.object({
    params: z.object({
        email: z.email({ message: "Invalid email format" }),
    }),
    body: z.object({
        perm: z.number({ required_error: "Permission level is required" })
    })
});
