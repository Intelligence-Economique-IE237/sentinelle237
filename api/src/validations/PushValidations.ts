import { z } from "zod";

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
  alertes: z.boolean().optional(),
  dossiers: z.boolean().optional(),
});
export type PushSubscribeInput = z.infer<typeof pushSubscribeSchema>;

export const pushEndpointSchema = z.object({
  endpoint: z.string().url().max(1000),
});
export type PushEndpointInput = z.infer<typeof pushEndpointSchema>;

export const pushPreferencesSchema = z.object({
  endpoint: z.string().url().max(1000),
  alertes: z.boolean().optional(),
  dossiers: z.boolean().optional(),
});
export type PushPreferencesInput = z.infer<typeof pushPreferencesSchema>;
