import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const signupSchema = z.object({
  username:  z.string().min(3, "Username must be at least 3 characters"),
  password:  z.string().min(6, "Password must be at least 6 characters"),
  role:      z.enum(["ADMIN", "MANAGER", "USER"]).default("USER"),
  secretKey: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Min 6 characters"),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});
