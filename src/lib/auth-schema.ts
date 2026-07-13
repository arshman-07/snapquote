import { z } from 'zod';

// Validation for the auth screens. Login stays permissive on the password —
// the server is the judge of whether it's right; we only stop empty submits.
export const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

export type LoginForm = z.infer<typeof loginSchema>;
