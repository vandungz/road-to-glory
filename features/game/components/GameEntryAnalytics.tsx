"use client";

import { Analytics } from "@vercel/analytics/react";

export function GameEntryAnalytics() {
  return (
    <Analytics
      debug={false}
      route={null}
      beforeSend={(event) => {
        // This integration measures the guest funnel only.
        if (event.type !== "event") return null;
        const url = new URL(event.url, window.location.origin);
        url.search = "";
        url.hash = "";
        return { ...event, url: url.href };
      }}
    />
  );
}
