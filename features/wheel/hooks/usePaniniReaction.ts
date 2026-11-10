import { useEffect, useState } from "react";
import { takeTransferPortraitCue, type PortraitCue } from "../lib/portrait-reactions";

export function usePaniniReaction(showTab: (tab: "panini") => void, modalOpen = false, processing = false, returnedPlayerId?: string) {
  const [waiting, setWaiting] = useState<(PortraitCue & { released?: boolean })[]>([]);
  const [reaction, setReaction] = useState<PortraitCue | null>(null);
  const ready = waiting.find((cue) => cue.surface === "panini" || (cue.released && !processing));

  useEffect(() => {
    if (!returnedPlayerId) return;
    const cue = takeTransferPortraitCue(returnedPlayerId);
    if (cue) setWaiting((previous) => [...previous, cue]);
  }, [returnedPlayerId]);

  useEffect(() => {
    if (reaction || modalOpen || !ready) return;
    setReaction(ready);
    setWaiting((previous) => previous.filter((cue) => cue !== ready));
    showTab("panini");
  }, [reaction, modalOpen, ready, showTab]);

  useEffect(() => {
    if (!reaction) return;
    const timer = window.setTimeout(() => setReaction(null), 5500);
    return () => window.clearTimeout(timer);
  }, [reaction]);

  function queue(next: PortraitCue | null) {
    if (next) setWaiting((previous) => [...previous, next]);
  }

  function release(surface: string) {
    setWaiting((previous) => previous.map((cue) => (
      cue.surface === surface && !cue.released ? { ...cue, released: true } : cue
    )));
  }

  const pending = Boolean(reaction || waiting.some((cue) => cue.released || cue.surface === "panini"));
  return { reaction, pending, queue, release, clear: () => setReaction(null) };
}
