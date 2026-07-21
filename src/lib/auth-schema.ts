import { z } from 'zod';

// Validation for the auth screens. Login stays permissive on the password —
// the server is the judge of whether it's right; we only stop empty submits.
export const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

export type LoginForm = z.infer<typeof loginSchema>;

// Sign-up is stricter than login: the password is being *set* here, so we
// enforce a baseline length and a matching confirmation up front. The server
// is still the final judge (a stricter Directus PASSWORD_POLICY would reject
// on submit), but catching the obvious cases client-side avoids round-trips.
export const registerSchema = z
  .object({
    email: z.email('Enter a valid email address.'),
    password: z.string().min(8, 'Use at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Re-enter your password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type RegisterForm = z.infer<typeof registerSchema>;
