import Image from "next/image";

export default function Loading() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center gap-4 overflow-hidden bg-[#070B12] text-sm text-white/55">
      <div
        className="pointer-events-none absolute inset-0 bg-brand-glow opacity-80"
        aria-hidden
      />
      <Image
        src="/buildvision.webp"
        alt="BuildVision"
        width={72}
        height={72}
        className="relative h-16 w-16 object-contain"
        priority
      />
      <p className="relative">Loading…</p>
    </div>
  );
}
