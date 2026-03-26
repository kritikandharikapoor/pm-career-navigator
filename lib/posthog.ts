import posthog from "posthog-js";

export function initPostHog() {
  if (typeof window === "undefined") return;
  if ((posthog as unknown as { __loaded?: boolean }).__loaded) return;

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: "https://us.i.posthog.com",
    capture_pageview: false,
    persistence: "localStorage",
  });
}

export { posthog };
