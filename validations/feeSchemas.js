import { z } from 'zod';

export const createFeeSchema = z.object({
  className: z.string().min(1, "Class name required"),
  monthlyFee: z.coerce.number({ invalid_type_error: "Must be a number" }).min(0, "Monthly fee must be positive"),
  admissionFee: z.coerce.number({ invalid_type_error: "Must be a number" }).min(0, "Admission fee must be positive"),
  examFee: z.coerce.number({ invalid_type_error: "Must be a number" }).min(0, "Examination fee must be positive"),
  vanChargeFee: z.coerce.number({ invalid_type_error: "Must be a number" }).min(0, "Transport fee must be positive"),
  extraFees: z.array(z.object({
    name: z.string().min(1, "Fee name required"),
    amount: z.coerce.number().min(0, "Amount must be positive")
  })).optional()
});

export const updateFeeSchema = createFeeSchema.partial().omit({ className: true });
