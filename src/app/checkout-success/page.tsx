"use client";

import { useEffect } from "react";

/**
 * Shown in popup after Stripe checkout (or test-admin buy).
 * Signals parent page and closes – no full refresh, map updates live via Pusher.
 */
export default function CheckoutSuccessPage() {
  useEffect(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const status = params.get("checkout");

    if (typeof window === "undefined") return;

    if (window.opener) {
      if (status === "success") {
        window.opener.postMessage(
          { type: "checkout-success", source: "sisuloojad" },
          window.location.origin
        );
      }
      window.close();
      return;
    }

    // Opened directly (e.g. bookmark) – redirect to home
    window.location.href = "/";
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <p className="text-muted-foreground">
        {typeof window !== "undefined" && window.opener ? "Suunan tagasi…" : "Suunan avalehele…"}
      </p>
    </div>
  );
}
