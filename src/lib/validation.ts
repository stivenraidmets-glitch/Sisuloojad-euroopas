import { z } from "zod";

export const broadcastBodySchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  teamId: z.number().int().min(1).max(2),
  secret: z.string().min(1),
});

export const voteBodySchema = z.object({
  teamId: z.number().int().min(1).max(2),
});

export const wheelSpinSchema = z.object({});

export type BroadcastBody = z.infer<typeof broadcastBodySchema>;
export type VoteBody = z.infer<typeof voteBodySchema>;
