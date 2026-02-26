import { prisma } from "./db";

const SYSTEM_EMAIL = "system@voistlus.internal";
const MAX_BODY = 500;

export async function getOrCreateSystemUser(): Promise<string> {
  let user = await prisma.user.findUnique({
    where: { email: SYSTEM_EMAIL },
    select: { id: true },
  });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: SYSTEM_EMAIL,
        name: "Süsteem",
        creditsBalance: 0,
        hasSpunWheel: true,
      },
      select: { id: true },
    });
  }
  return user.id;
}

export async function notifyPenaltyToChat(
  teamName: string,
  penaltyTitle: string,
  isActive: boolean
): Promise<void> {
  try {
    const systemUserId = await getOrCreateSystemUser();
    const body = isActive
      ? `❄️ Meeskond ${teamName} sai karistuse: ${penaltyTitle}!`
      : `Meeskond ${teamName} sai karistuse: ${penaltyTitle} (ootel).`;
    const truncated = body.slice(0, MAX_BODY);
    await prisma.chatMessage.create({
      data: { userId: systemUserId, body: truncated },
    });
  } catch (e) {
    console.error("Chat notify error:", e);
  }
}
