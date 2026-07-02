import { z } from 'zod';

// ── Shared base fields (both student types) ────────────────────────────────
const studentBaseSchema = {
  fullName: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name too long"),

  gender: z.enum(["Male", "Female", "Other"], {
    errorMap: () => ({ message: "Please select a gender" })
  }),

  dateOfBirth: z.string().nullable().optional(),

  religion: z.string().nullable().optional(),

  caste: z.string().nullable().optional(),

  fatherName: z.string().min(1, "Father's name is required"),

  motherName: z.string().nullable().optional(),

  mobile1: z.union([
    z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
    z.literal(""),
    z.null(),
    z.undefined()
  ]).optional(),

  mobile2: z.union([
    z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit number"),
    z.literal(""),
    z.null(),
    z.undefined()
  ]).optional(),

  address: z.string().nullable().optional(),

  state: z.string().nullable().optional(),

  country: z.string().default("India"),

  className: z.string().min(1, "Class is required"),

  previousSchool: z.string().nullable().optional(),
  aadhaarNumber: z.union([
    z.string().regex(/^\d{12}$/, "Enter a valid 12-digit Aadhaar Card Number"),
    z.literal(""),
    z.null(),
    z.undefined()
  ]).optional(),
  parentAadhaarNumber: z.union([
    z.string().regex(/^\d{12}$/, "Enter a valid 12-digit Aadhaar Card Number"),
    z.literal(""),
    z.null(),
    z.undefined()
  ]).optional(),
};

// ── Branch A: New Student ──────────────────────────────────────────────────
const newStudentSchema = z.object({
  isExisting: z.literal(false),

  admissionDate: z.string().optional(),
  // Server fills today's date if omitted

  joiningYear: z.any().optional(),
  // Ignored for new students; server sets from current year

  previousDue: z.coerce.number({ invalid_type_error: "Must be a number" })
    .int("Must be a whole number")
    .min(0, "Previous due cannot be negative")
    .default(0),
  // Always 0 for new students, but form might send 0 which should be accepted

  ...studentBaseSchema,
});

// ── Branch B: Existing Student ─────────────────────────────────────────────
const existingStudentSchema = z.object({
  isExisting: z.literal(true),

  admissionNumber: z.string()
    .min(1, "Admission number is required")
    .regex(/^\s*ADM-\d{4}-\d{4}\s*$/, "Wrong format! Expected: ADM-2020-0150")
    .transform(val => val.trim().toUpperCase()),
  // Mandatory format: ADM-YEAR-SEQUENCE

  admissionDate: z.string()
    .min(1, "Original admission date is required"),
  // The date they ORIGINALLY joined — NOT today

  joiningYear: z.coerce.number()
    .int("Must be a whole number")
    .min(1990, "Year seems too early — check again")
    .max(new Date().getFullYear(), "Joining year cannot be in the future"),

  previousDue: z.coerce.number({ invalid_type_error: "Must be a number" })
    .int("Must be a whole number")
    .min(0, "Previous due cannot be negative")
    .default(0),
  // Total rupees owed from ALL previous sessions combined

  ...studentBaseSchema,
});

// ── Discriminated union (Zod auto-picks branch by isExisting) ─────────────
export const createStudentSchema = z.discriminatedUnion("isExisting", [
  newStudentSchema,
  existingStudentSchema,
]);

// ── Update schema (all fields optional, immutable fields excluded) ─────────
// isExisting, admissionNumber, joiningYear cannot be changed post-creation
export const updateStudentSchema = z.object({
  admissionNumber: z.string()
    .min(1, "Admission number is required")
    .regex(/^\s*ADM-\d{4}-\d{4}\s*$/, "Wrong format! Expected: ADM-2020-0150")
    .transform(val => val.trim().toUpperCase())
    .optional(),
  previousDue: z.coerce.number({ invalid_type_error: "Must be a number" })
    .int("Must be a whole number")
    .min(0, "Previous due cannot be negative")
    .optional(),
  fullName: z.string().min(2).optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  dateOfBirth: z.string().nullable().optional(),
  religion: z.string().nullable().optional(),
  caste: z.string().nullable().optional(),
  fatherName: z.string().min(1).optional(),
  motherName: z.string().nullable().optional(),
  mobile1: z.union([
    z.string().regex(/^[6-9]\d{9}$/),
    z.literal(""),
    z.null(),
    z.undefined()
  ]).optional(),
  mobile2: z.union([
    z.string().regex(/^[6-9]\d{9}$/),
    z.literal(""),
    z.null(),
    z.undefined()
  ]).optional(),
  address: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().optional(),
  className: z.string().min(1).optional(),
  previousSchool: z.string().nullable().optional(),
  aadhaarNumber: z.union([
    z.string().regex(/^\d{12}$/, "Enter a valid 12-digit Aadhaar Card Number"),
    z.literal(""),
    z.null(),
    z.undefined()
  ]).optional(),
  parentAadhaarNumber: z.union([
    z.string().regex(/^\d{12}$/, "Enter a valid 12-digit Aadhaar Card Number"),
    z.literal(""),
    z.null(),
    z.undefined()
  ]).optional(),
  isFeeExempt: z.boolean().optional(),
  exemptionReason: z.string().nullable().optional(),
});

// ── Query schema for GET /api/students ────────────────────────────────────
export const studentQuerySchema = z.object({
  search: z.string().optional(),
  class: z.string().optional(),
  status:     z.enum(["paid", "pending", "legacy_due", "all"]).optional(),
  isExisting: z.enum(["true", "false"]).optional(),
  session: z.coerce.number().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(0).max(10000).default(20),
});
