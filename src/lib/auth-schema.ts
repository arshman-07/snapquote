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
//
// It also collects a little profile: the account type plus a name (and, for
// contractors, a company name). Which fields are required depends on the type,
// so the cross-field rules live in a superRefine rather than per-field.
export const registerSchema = z
  .object({
    // Optional in the object so an unselected form validates cleanly; the
    // superRefine below makes it effectively required with a friendly message.
    userType: z.enum(['contractor', 'homeowner']).optional(),
    fullName: z.string(),
    companyName: z.string(),
    email: z.email('Enter a valid email address.'),
    password: z.string().min(8, 'Use at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Re-enter your password.'),
  })
  .superRefine((values, ctx) => {
    // Must pick a type — it decides which of the fields below apply.
    if (!values.userType) {
      ctx.addIssue({
        code: 'custom',
        path: ['userType'],
        message: 'Choose contractor or homeowner.',
      });
    }
    // A name is required either way; only its label differs by type
    // (the person's own name vs the company owner's name).
    if (!values.fullName.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['fullName'],
        message:
          values.userType === 'contractor'
            ? "Enter the company owner's name."
            : 'Enter your name.',
      });
    }
    // Contractors also give their company name.
    if (values.userType === 'contractor' && !values.companyName.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['companyName'],
        message: 'Enter your company name.',
      });
    }
    // Confirmation must match the password.
    if (values.password !== values.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'Passwords do not match.',
      });
    }
  });

export type RegisterForm = z.infer<typeof registerSchema>;
