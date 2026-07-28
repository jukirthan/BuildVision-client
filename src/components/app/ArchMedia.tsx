"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  ASSET_FOCUS,
  BRAND_ASSETS,
  type BrandAssetKey,
} from "@/lib/brand-assets";

type Overlay = "ink" | "sunset" | "soft" | "glass" | "none";

const OVERLAY: Record<Overlay, string> = {
  none: "",
  ink: "bg-gradient-to-br from-[#020617]/80 via-[#020617]/55 to-[#020617]/70",
  /** Darkest on the left so left-aligned copy reads, subject stays visible. */
  sunset: "bg-gradient-to-r from-[#020617]/85 via-[#020617]/50 to-[#020617]/25",
  /** Light veil — keeps dark body text readable over photography. */
  soft: "bg-gradient-to-b from-white/78 via-white/88 to-white",
  glass: "bg-[#020617]/40 backdrop-blur-[1px]",
};

export function ArchImage({
  asset,
  className,
  imageClassName,
  overlay = "none",
  priority,
  sizes = "100vw",
  objectPosition,
}: {
  asset: BrandAssetKey;
  className?: string;
  imageClassName?: string;
  overlay?: Overlay;
  priority?: boolean;
  sizes?: string;
  objectPosition?: string;
}) {
  const meta = BRAND_ASSETS[asset];
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <Image
        src={meta.src}
        alt={meta.alt}
        fill
        priority={priority}
        sizes={sizes}
        className={cn(
          "object-cover transition-transform duration-700 ease-out",
          imageClassName
        )}
        style={{ objectPosition: objectPosition ?? ASSET_FOCUS[asset] }}
      />
      {overlay !== "none" && (
        <div className={cn("absolute inset-0", OVERLAY[overlay])} aria-hidden />
      )}
    </div>
  );
}

/** Soft photo wash behind signed-in page content. */
export function AppAtmosphere({ asset = "sunset" }: { asset?: BrandAssetKey }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <ArchImage
        asset={asset}
        className="absolute -inset-x-[6%] -top-[10%] h-[60%] min-h-[20rem] opacity-25"
        imageClassName="scale-105"
        overlay="soft"
        sizes="120vw"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-canvas/75 to-canvas" />
    </div>
  );
}

/**
 * Full-page backdrop for public pages: the photo occupies the top of the
 * viewport and dissolves into the canvas, so dark-on-light content still reads.
 */
export function PageBackdrop({
  asset,
  intensity = "soft",
}: {
  asset: BrandAssetKey;
  intensity?: "soft" | "bold";
}) {
  if (intensity === "bold") {
    return (
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[85vh] overflow-hidden"
        aria-hidden
      >
        <ArchImage
          asset={asset}
          className="absolute inset-0"
          overlay="sunset"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-canvas" />
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] min-h-[26rem] overflow-hidden"
      aria-hidden
    >
      <ArchImage
        asset={asset}
        className="absolute inset-0 opacity-30"
        imageClassName="scale-105"
        priority
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white/72 via-white/90 to-canvas" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/85 to-transparent" />
    </div>
  );
}

/** Dark photo band used behind page titles inside the app shell. */
export function PhotoBanner({
  asset,
  className,
  priority,
}: {
  asset: BrandAssetKey;
  className?: string;
  priority?: boolean;
}) {
  return (
    <>
      <ArchImage
        asset={asset}
        className={cn("absolute inset-0", className)}
        overlay="sunset"
        priority={priority}
        sizes="100vw"
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-[#020617]/80 via-[#020617]/45 to-transparent"
        aria-hidden
      />
    </>
  );
}
