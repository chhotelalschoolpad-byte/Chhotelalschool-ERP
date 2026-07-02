import { z } from 'zod';

export const createPaymentSchema = z.object({
  studentId: z.string().uuid("Invalid student ID"),
  month: z.string().optional(), // For backward compatibility
  months: z.array(z.object({
    month: z.string().min(1),
    year: z.coerce.number().int()
  })).default([]),
  paymentMode: z.enum(["Cash", "UPI", "Transfer", "Bank Transfer"]),
  discount: z.number().min(0).default(0),
  previousDueAmount: z.number().min(0).default(0),
  paymentItems: z.array(z.object({
    type: z.string().min(1),
    months: z.array(z.string()).optional(),
    rate: z.coerce.number().min(0),
    quantity: z.coerce.number().min(1),
    total: z.coerce.number().min(0)
  })).default([]),
  selectedItems: z.any().optional() // For backward compatibility
}).refine(data => data.paymentItems.length > 0 || data.previousDueAmount > 0 || (data.selectedItems && data.selectedItems.length > 0), {
  message: "Select at least one fee item or enter legacy due amount",
  path: ["paymentItems"]
});
