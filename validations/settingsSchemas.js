import { z } from 'zod';

export const schoolSettingsSchema = z.object({
  schoolName: z.string().min(1, "School name is required"),
  address: z.string().nullish(),
  contactNumber: z.string().regex(/^[6-9]\d{9}$/, "Invalid contact format — must be 10 digits starting with 6-9").nullish().or(z.literal("")),
  ownerName: z.string().nullish(),
  upiId: z.string().nullish().or(z.literal("")),
  bankName: z.string().nullish().or(z.literal("")),
  accountHolder: z.string().nullish().or(z.literal("")),
  accountNumber: z.string().nullish().or(z.literal("")),
  ifscCode: z.string().nullish().or(z.literal("")),
  branch: z.string().nullish().or(z.literal("")),
  logoBase64: z.string().nullish()
});

// For API / Database (Flat array of strings)
export const systemSettingsSchema = z.object({
  defaultClasses: z.array(z.string().min(1)).min(1),
  feeTypes: z.array(z.string().min(1)).min(1)
});

// For UI Forms (Array of objects for react-hook-form useFieldArray)
export const systemFormSchema = z.object({
  defaultClasses: z.array(z.object({
    value: z.string().min(1, "Value required")
  })).min(1, "Define at least one class")
});
