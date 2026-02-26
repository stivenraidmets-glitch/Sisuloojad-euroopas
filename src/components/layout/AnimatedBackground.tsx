"use client";

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base: dark only */}
      <div className="absolute inset-0 dark:bg-[#030712]" />
      {/* Animated gradient orbs - dark theme only */}
      <div className="absolute -left-[40%] -top-[40%] hidden h-[80%] w-[80%] animate-blob rounded-full bg-cyan-500/20 blur-3xl dark:block" />
      <div className="animation-delay-2000 absolute -right-[30%] top-[10%] hidden h-[70%] w-[70%] animate-blob rounded-full bg-blue-500/15 blur-3xl dark:block" />
      <div className="animation-delay-4000 absolute bottom-[10%] left-[20%] hidden h-[60%] w-[60%] animate-blob rounded-full bg-violet-500/15 blur-3xl dark:block" />
      {/* Grid overlay */}
      <div
        className="grid-bg absolute inset-0 hidden opacity-[0.04] dark:block"
        style={{ backgroundSize: "60px 60px" }}
      />
      {/* Noise texture */}
      <div
        className="absolute inset-0 hidden opacity-[0.015] dark:block"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
