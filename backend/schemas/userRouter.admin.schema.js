import { z } from 'zod';

export const setUserRoleSchema = z.object({
  body: z.object({
    userEmail: z.email({ error: "User email is required or invalid" }),
    perm: z.int({ error: "Permission level must be an integer" }),
  })
});

export const getScopeTagsSchema = z.object({
  headers: z.looseObject({
    email: z.email({ error: "Valid email is required in headers" }),
  })
});

export const setScopeTagsSchema = z.object({
  body: z.object({
    email: z.email({ error: "Email is required" }),
    scopeTags: z.array(z.string()).min(1, { error: "Scope tags array is required" })
  })
});