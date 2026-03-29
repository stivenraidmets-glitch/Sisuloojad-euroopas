/**
 * Cloudflare Turnstile server-side verification.
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

export async function verifyTurnstileToken(token: string, remoteip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!token || typeof token !== "string") return false;

  // Dev fallback: Cloudflare test secret always passes (only when no real secret)
  const effectiveSecret =
    secret ||
    (process.env.NODE_ENV === "development" ? "1x0000000000000000000000000000000AA" : "");

  if (!effectiveSecret) return false;

  const body = new URLSearchParams();
  body.set("secret", effectiveSecret);
  body.set("response", token);
  if (remoteip) body.set("remoteip", remoteip);

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
