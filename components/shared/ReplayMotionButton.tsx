"use client";

export function ReplayMotionButton() {
  function replay() {
    window.dispatchEvent(new Event("rtg:replay-motion"));
  }

  return (
    <button type="button" className="rtg-app-shell__replay" onClick={replay}>
      ↻ Chạy lại chuyển động
    </button>
  );
}
