import { z } from "zod";

export const UtmsSchema = z
  .object({
    utm_source: z.string(),
    utm_medium: z.string(),
    utm_campaign: z.string(),
    utm_content: z.string(),
    utm_term: z.string(),
  })
  .partial();

export const ContactSchema = z.object({
  email: z.string().email("Invalid email format").optional(),
  phone: z.string().min(7).optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
});

export const PixelPayloadSchema = z.object({
  orgKey: z.string().min(1, "orgKey is required"),
  sessionId: z.string().min(1, "sessionId is required"),
  fingerprint: z.string().min(1, "fingerprint is required"),
  type: z.enum(["page_view", "form_submit"]),
  url: z.string().url("url must be a valid URL"),
  path: z.string().min(1),
  referrer: z.string().nullable().optional(),
  utms: UtmsSchema.optional().default({}),
  data: z
    .object({
      contact: ContactSchema.optional(),
      formAction: z.string().optional(),
      formId: z.string().nullable().optional(),
      formPath: z.string().optional(), // original form page path — used for dedup when firing from confirmation page
      title: z.string().optional(),
    })
    .optional(),
  ts: z.number().int().positive(),
});

export type PixelPayload = z.infer<typeof PixelPayloadSchema>;
