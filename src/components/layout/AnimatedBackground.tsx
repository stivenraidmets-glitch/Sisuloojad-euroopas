"use client";

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Simple dark base */}
      <div className="absolute inset-0 dark:bg-[#0a0a0f]" />
      {/* Soft moving orbs – violet/indigo hue, slow and subtle */}
      <div className="absolute -left-[35%] -top-[35%] hidden h-[75%] w-[75%] animate-blob rounded-full bg-violet-500/15 blur-[100px] dark:block" />
      <div className="animation-delay-2000 absolute -right-[30%] top-[5%] hidden h-[65%] w-[65%] animate-blob rounded-full bg-indigo-500/12 blur-[100px] dark:block" />
      <div className="animation-delay-4000 absolute bottom-[5%] left-[15%] hidden h-[55%] w-[55%] animate-blob rounded-full bg-purple-600/10 blur-[100px] dark:block" />
      <div className="animation-delay-6000 absolute right-[20%] bottom-[20%] hidden h-[45%] w-[45%] animate-blob-slow rounded-full bg-violet-600/8 blur-[80px] dark:block" />
      {/* Subtle grid */}
      <div className="grid-bg absolute inset-0 hidden opacity-[0.06] dark:block" />
      {/* Light noise */}
      <div
        className="absolute inset-0 hidden opacity-[0.02] dark:block"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
