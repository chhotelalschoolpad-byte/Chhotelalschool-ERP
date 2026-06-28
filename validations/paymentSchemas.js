import { z } from 'zod';

export const createPaymentSchema = z.object({
  studentId: z.string().uuid("Invalid student ID"),
  month: z.string().regex(/^\d{4}-\d{2}$|^$/, "Invalid month format"), // Allow empty for legacy-only
  paymentMode: z.enum(["Cash", "UPI", "Transfer", "Bank Transfer"]),
  discount: z.number().min(0).default(0),
  previousDueAmount: z.number().min(0).default(0),
  selectedItems: z.array(z.object({
    type: z.string().min(1),
    amount: z.number().min(0)
  })).default([]) // Allow empty array
}).refine(data => data.selectedItems.length > 0 || data.previousDueAmount > 0, {
  message: "Select at least one fee item or enter legacy due amount",
  path: ["selectedItems"]
});
