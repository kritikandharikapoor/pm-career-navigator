"use client";

import { useEffect } from "react";
import { posthog } from "@/lib/posthog";

export default function LandingTracker() {
  useEffect(() => {
    posthog.capture("landing_page_viewed");
  }, []);

  return null;
}
