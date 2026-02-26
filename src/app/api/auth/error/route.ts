import { NextResponse } from "next/server";

export function GET(req: Request) {
  const url = new URL(req.url);
  const error = url.searchParams.get("error") ?? "Callback";
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, url.origin));
}
