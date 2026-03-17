import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Include at least one uppercase letter')
    .regex(/[0-9]/, 'Include at least one number'),
});

export const startSessionSchema = z.object({
  topic: z.string().max(200).optional(),
  context: z.string().max(500).optional(),
});

export const feedbackSchema = z
  .object({
    feedbackReason: z.enum([
      'missed_core_issue',
      'inaccurate_partner_perspective',
      'too_generic',
      'other',
    ]),
    feedbackText: z.string().optional(),
  })
  .refine(
    (data) => data.feedbackReason !== 'other' || (data.feedbackText && data.feedbackText.length > 0),
    { message: 'Please describe your feedback', path: ['feedbackText'] },
  );

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type StartSessionFormData = z.infer<typeof startSessionSchema>;
export type FeedbackFormData = z.infer<typeof feedbackSchema>;
