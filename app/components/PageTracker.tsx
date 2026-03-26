"use client";

import { useEffect } from "react";
import { posthog } from "@/lib/posthog";

export default function PageTracker({ event }: { event: string }) {
  useEffect(() => {
    posthog.capture(event);
  }, [event]);

  return null;
}
