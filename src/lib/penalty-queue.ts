import { prisma } from "@/lib/db";

export type CurrentPenalty = {
  title: string;
  type: string;
  endsAt: string | null; // null when no duration (e.g. DETOUR)
  durationMinutes: number;
};

export type QueuedPenalty = {
  title: string;
  durationMinutes: number | null;
};

/**
 * Get ACTIVE penalties for a team (ordered by createdAt), advance the queue
 * (mark ended ones COMPLETED, start the next queued), and return current + queued.
 */
export async function getTeamPenaltyQueue(teamId: number): Promise<{
  current: CurrentPenalty | null;
  queued: QueuedPenalty[];
}> {
  const now = new Date();
  const active = await prisma.penalty.findMany({
    where: { teamId, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    include: {
      penaltyOption: {
        select: { title: true, type: true, durationMinutes: true },
      },
    },
  });

  if (active.length === 0) {
    return { current: null, queued: [] };
  }

  const durationMs = (min: number | null) =>
    min != null ? min * 60 * 1000 : 0;

  // Advance queue: complete expired, start next
  for (let i = 0; i < active.length; i++) {
    const p = active[i];
    const option = p.penaltyOption;
    const durationMin = option?.durationMinutes ?? 0;
    const startsAt = p.startsAt ? new Date(p.startsAt) : null;
    const endsAt =
      startsAt && durationMin > 0
        ? new Date(startsAt.getTime() + durationMs(durationMin))
        : null;

    if (startsAt && endsAt && endsAt <= now) {
      await prisma.penalty.update({
        where: { id: p.id },
        data: { status: "COMPLETED" },
      });
      continue;
    }

    if (!startsAt) {
      await prisma.penalty.update({
        where: { id: p.id },
        data: { startsAt: now },
      });
      const newEndsAt =
        durationMin > 0
          ? new Date(now.getTime() + durationMs(durationMin))
          : null;
      if (option) {
        const current: CurrentPenalty = {
          title: option.title,
          type: option.type,
          endsAt: newEndsAt?.toISOString() ?? null,
          durationMinutes: durationMin,
        };
        const queued: QueuedPenalty[] = active.slice(i + 1).map((q) => ({
          title: q.penaltyOption?.title ?? "—",
          durationMinutes: q.penaltyOption?.durationMinutes ?? null,
        }));
        return { current, queued };
      }
      continue;
    }

    if (option && (!endsAt || endsAt > now)) {
      const current: CurrentPenalty = {
        title: option.title,
        type: option.type,
        endsAt: endsAt && endsAt > now ? endsAt.toISOString() : null,
        durationMinutes: durationMin,
      };
      const queued: QueuedPenalty[] = active.slice(i + 1).map((q) => ({
        title: q.penaltyOption?.title ?? "—",
        durationMinutes: q.penaltyOption?.durationMinutes ?? null,
      }));
      return { current, queued };
    }
  }

  return { current: null, queued: [] };
}

/**
 * When creating a new ACTIVE penalty for a team, set startsAt only if no other ACTIVE exists.
 */
export async function shouldStartPenaltyImmediately(teamId: number): Promise<boolean> {
  const count = await prisma.penalty.count({
    where: { teamId, status: "ACTIVE" },
  });
  return count === 0;
}
