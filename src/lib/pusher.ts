import Pusher from "pusher";

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY ?? process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER ?? "eu",
  useTLS: true,
});

export const PUSHER_CHANNEL = "race";
export const PUSHER_EVENT_LOCATION = "location-update";
export const PUSHER_EVENT_VOTES = "votes-update";
