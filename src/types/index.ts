export type RaceStatus = "pre-race" | "live" | "finished";

export type WheelOutcome = {
  type: "CREDITS" | "FREE_PENALTY" | "NOTHING" | "RESPIN" | "HALF_OFF_PENALTY";
  value: number;
  probability: number;
};

export type TeamLocation = {
  teamId: number;
  lat: number;
  lng: number;
  lastUpdatedAt: string;
};
