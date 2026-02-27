import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Returns whether email (magic link) is configured. No secrets exposed.
 */
export async function GET() {
  const hasServer = Boolean(process.env.EMAIL_SERVER?.trim());
  const hasFrom = Boolean(process.env.EMAIL_FROM?.trim());
  const configured = hasServer && hasFrom;

  const hint = configured
    ? process.env.EMAIL_FROM?.includes("onboarding@resend.dev")
      ? "Kasutad Resend test-saatjat (onboarding@resend.dev). See võib nõuda domeeni kinnitamist Resend dashboard'is, et saata teistele e-mailidele."
      : undefined
    : undefined;

  return NextResponse.json({
    configured,
    hint,
  });
}
