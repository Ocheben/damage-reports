"use client";

import { Car } from "lucide-react";
import { useState } from "react";

import type { DamageReport } from "@/lib/reports";

export function ReportImage({
  report,
  className,
  size = "thumb",
}: {
  report: DamageReport;
  className?: string;
  size?: "thumb" | "hero";
}) {
  const [failed, setFailed] = useState(false);
  const src = pickImageSrc(report);

  if (failed || !src) {
    return (
      <div
        className={`grid place-items-center bg-slate-100 text-slate-400 ${className ?? ""}`}
        aria-hidden
      >
        <Car className={size === "hero" ? "h-12 w-12" : "h-6 w-6"} />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${report.vehicle_make ?? ""} ${report.vehicle_model ?? ""}`.trim() ||
        report.reference}
      className={`object-cover ${className ?? ""}`}
      onError={() => setFailed(true)}
    />
  );
}

function pickImageSrc(report: DamageReport): string | null {
  if (report.cover_image_url) return report.cover_image_url;
  if (report.photos && report.photos.length > 0 && report.photos[0]?.url) {
    return report.photos[0].url;
  }
  return null;
}
