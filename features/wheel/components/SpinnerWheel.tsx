"use client";

import { useMotionValue } from "framer-motion";
import { SpinnerWheelDisc } from "./SpinnerWheelDisc";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";

// ============================================================
// PROPS
// ============================================================

export interface SpinnerItem {
  label: string;
  value: unknown;
  weight?: number;
  active?: boolean;
}

interface Props {
  isSpinning: boolean;
  items: SpinnerItem[];
  targetIndex: number;
  onSpinComplete: () => void;
  stakes?: "low" | "mid" | "high";
}

// ============================================================
// HELPERS
// ============================================================

function computeArcs(items: SpinnerItem[]) {
  const total = items.reduce((s, it) => s + (it.weight ?? 1), 0);
  const arcSizes = items.map((it) => ((it.weight ?? 1) / total) * 360);
  const startAngles: number[] = [];
  let cum = 0;
  for (const arc of arcSizes) {
    startAngles.push(cum);
    cum += arc;
  }
  return { arcSizes, startAngles };
}

function getLabelAtAngle(
  pointerAngle: number,
  items: SpinnerItem[],
  startAngles: number[],
  arcSizes: number[],
): string {
  for (let i = 0; i < items.length; i++) {
    const end = startAngles[i] + arcSizes[i];
    if (pointerAngle >= startAngles[i] && pointerAngle < end) {
      return items[i].label;
    }
  }
  // Wrap-around or rounding edge: return last item
  return items.length > 0 ? items[items.length - 1].label : "";
}

// Preserve the original wheel's gameplay beat while making the braking phase
// deliberately visible. The wheel cruises first, then uses a cubic ease-out
// whose initial velocity matches the cruise velocity and reaches exactly zero
// at the authoritative target. `finishNotBefore` is a hard lifecycle guard:
// the result callback can never fire before the wheel has had time to complete
// the gameplay animation, even if a parent re-renders around the target update.
const WHEEL_MIN_SPIN_MS = 4000;
const WHEEL_CRUISE_SPEED = 900;
const WHEEL_ACCELERATION = WHEEL_CRUISE_SPEED * 4;

interface SpinController {
  frameId: number | null;
  startedAt: number;
  finishNotBefore: number;
  lastTimestamp: number;
  velocity: number;
  targetRotation: number | null;
  completed: boolean;
  snapshot: SpinSnapshot;
  deceleration: {
    startRotation: number;
    startTimestamp: number;
    durationMs: number;
    distance: number;
  } | null;
}

interface SpinSnapshot {
  items: SpinnerItem[];
  arcSizes: number[];
  startAngles: number[];
}

// ============================================================
// COMPONENT
// ============================================================

export function SpinnerWheel({ isSpinning, items, targetIndex, onSpinComplete, stakes = "low" }: Props) {
  const rotateValue = useMotionValue(0);
  const spinControllerRef = useRef<SpinController | null>(null);
  const [spinSnapshot, setSpinSnapshot] = useState<SpinSnapshot | null>(null);
  const itemSignature = useMemo(
    () => items.map((item) => `${item.label}\u0000${item.weight ?? 1}`).join("\u0001"),
    [items],
  );
  const stableItemsRef = useRef(items);
  const stableSignatureRef = useRef(itemSignature);
  if (stableSignatureRef.current !== itemSignature) {
    stableSignatureRef.current = itemSignature;
    stableItemsRef.current = items;
  }
  const stableItems = stableItemsRef.current;
  const [activeLabel, setActiveLabel] = useState<string>(() => stableItems[0]?.label ?? "");
  const activeLabelRef = useRef(activeLabel);

  const { arcSizes: stableArcSizes, startAngles: stableStartAngles } = useMemo(() => computeArcs(stableItems), [stableItems]);
  const displayItems = spinSnapshot?.items ?? stableItems;
  const { arcSizes, startAngles } = spinSnapshot
    ? { arcSizes: spinSnapshot.arcSizes, startAngles: spinSnapshot.startAngles }
    : { arcSizes: stableArcSizes, startAngles: stableStartAngles };
  const setLiveLabel = useCallback((nextLabel: string) => {
    if (activeLabelRef.current === nextLabel) return;
    activeLabelRef.current = nextLabel;
    setActiveLabel(nextLabel);
  }, []);

  const onSpinCompleteRef = useRef(onSpinComplete);
  useEffect(() => { onSpinCompleteRef.current = onSpinComplete; });

  // Sync active label on items change (substep changed). While a spin is in
  // progress, keep reading the immutable session snapshot so a parent
  // re-render cannot switch the labels/pool underneath the animation.
  useEffect(() => {
    if (displayItems.length === 0) return;
    const r = rotateValue.get();
    const pointerAngle = ((90 - (r % 360)) % 360 + 360) % 360;
    setLiveLabel(getLabelAtAngle(pointerAngle, displayItems, startAngles, arcSizes));
  }, [displayItems, startAngles, arcSizes, rotateValue, setLiveLabel]);

  // Subscribe to rotation → update live label
  useEffect(() => {
    const unsubscribe = rotateValue.on("change", (r) => {
      const pointerAngle = ((90 - (r % 360)) % 360 + 360) % 360;
      setLiveLabel(getLabelAtAngle(pointerAngle, displayItems, startAngles, arcSizes));
    });
    return () => unsubscribe();
  }, [rotateValue, displayItems, startAngles, arcSizes, setLiveLabel]);

  // One motion profile is used for every wheel spin. The authoritative target
  // may arrive after the click, but it must not introduce a second animation
  // with a different speed/easing profile.
  useEffect(() => {
    if (!isSpinning) {
      const controller = spinControllerRef.current;
      if (controller?.frameId !== null && controller?.frameId !== undefined) {
        cancelAnimationFrame(controller.frameId);
      }
      spinControllerRef.current = null;
      setSpinSnapshot(null);
      return;
    }

    if (spinControllerRef.current) return;

    const snapshot: SpinSnapshot = {
      items: stableItems,
      arcSizes: stableArcSizes,
      startAngles: stableStartAngles,
    };

    const startedAt = performance.now();
    const controller: SpinController = {
      frameId: null,
      startedAt,
      finishNotBefore: startedAt + WHEEL_MIN_SPIN_MS,
      lastTimestamp: startedAt,
      velocity: 0,
      targetRotation: null,
      deceleration: null,
      completed: false,
      snapshot,
    };
    spinControllerRef.current = controller;
    setSpinSnapshot(snapshot);

    const tick = (timestamp: number) => {
      if (spinControllerRef.current !== controller) return;

      const elapsed = Math.min(Math.max((timestamp - controller.lastTimestamp) / 1000, 0), 0.05);
      controller.lastTimestamp = timestamp;
      const currentRotation = rotateValue.get();

      if (controller.deceleration) {
        const { startRotation, startTimestamp, durationMs, distance } = controller.deceleration;
        const progress = Math.min((timestamp - startTimestamp) / durationMs, 1);
        // Ease-out cubic. Its derivative at progress 0 is 3, so the duration
        // is chosen as 3 * distance / velocity below to make the hand-off
        // from cruise to braking continuous instead of visibly snapping.
        const remaining = 1 - progress;
        const travelled = distance * (1 - remaining * remaining * remaining);
        rotateValue.set(startRotation + travelled);
        if (progress >= 1 && !controller.completed) {
          const finishDelayMs = controller.finishNotBefore - timestamp;
          if (finishDelayMs > 0) {
            // The target is already visually stopped. Keep the completion
            // callback behind the minimum gameplay duration instead of
            // revealing the next step early.
            controller.frameId = requestAnimationFrame(tick);
            return;
          }

          controller.completed = true;
          // The motion value is updated in this frame, but React must not
          // reveal the result in the same callback. Give the browser two paint
          // opportunities: one for the exact stopped wheel, one for the
          // result hand-off. This prevents the result panel from appearing
          // while the disc is still visually finishing its last frame.
          controller.frameId = requestAnimationFrame(() => {
            controller.frameId = requestAnimationFrame(() => {
              if (spinControllerRef.current !== controller) return;
              controller.frameId = null;
              spinControllerRef.current = null;
              onSpinCompleteRef.current();
            });
          });
          return;
        }
      } else {
        controller.velocity = Math.min(
          WHEEL_CRUISE_SPEED,
          controller.velocity + WHEEL_ACCELERATION * elapsed,
        );
        const nextRotation = currentRotation + controller.velocity * elapsed;
        rotateValue.set(nextRotation);

        if (controller.targetRotation !== null && controller.velocity >= WHEEL_CRUISE_SPEED) {
          const distanceToTarget = controller.targetRotation - nextRotation;
          const elapsedSinceStart = timestamp - controller.startedAt;
          const remainingMinimumMs = Math.max(0, WHEEL_MIN_SPIN_MS - elapsedSinceStart);
          // Keep the result hand-off at or after the original 3.5s beat. Any
          // added distance is a full 360° turn, so the pointer still lands on
          // the exact authoritative item.
          const minimumDistance = (remainingMinimumMs / 1000) * controller.velocity / 3;
          const additionalTurns = Math.max(
            0,
            Math.ceil((minimumDistance - distanceToTarget) / 360),
          );
          controller.targetRotation += additionalTurns * 360;
          const distance = controller.targetRotation - nextRotation;
          // `timestamp` is in milliseconds, so keep the controller's duration
          // in the same unit. Mixing seconds and milliseconds makes the
          // cubic brake finish in a few milliseconds and leaves the UI waiting
          // while the wheel is already visually stopped.
          const durationMs = (3 * distance / controller.velocity) * 1000;
          controller.deceleration = {
            startRotation: nextRotation,
            startTimestamp: timestamp,
            durationMs,
            distance,
          };
        }
      }

      controller.frameId = requestAnimationFrame(tick);
    };

    controller.frameId = requestAnimationFrame(tick);
    return () => {
      if (controller.frameId !== null) cancelAnimationFrame(controller.frameId);
      if (spinControllerRef.current === controller) spinControllerRef.current = null;
    };
    // This effect intentionally starts/stops only at the isSpinning boundary.
    // Do not make it depend on the rendered item pool: unrelated parent
    // updates must never cancel a live gameplay animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpinning]);

  useEffect(() => {
    const controller = spinControllerRef.current;
    if (!controller || !isSpinning || controller.targetRotation !== null) return;
    const sessionItems = controller.snapshot.items;
    const sessionArcSizes = controller.snapshot.arcSizes;
    const sessionStartAngles = controller.snapshot.startAngles;
    if (targetIndex < 0 || targetIndex >= sessionItems.length) return;

    const targetMidAngle = sessionStartAngles[targetIndex] + sessionArcSizes[targetIndex] / 2;
    const rotationToTarget = ((90 - targetMidAngle) % 360 + 360) % 360;
    const currentRotation = rotateValue.get();
    const currentAngle = ((currentRotation % 360) + 360) % 360;
    const extraTurnToTarget = ((rotationToTarget - currentAngle) % 360 + 360) % 360;
    // Keep at least two full turns after the authoritative target arrives.
    // The deceleration controller will preserve the current cruise velocity.
    controller.targetRotation = currentRotation + 720 + extraTurnToTarget;
  }, [isSpinning, targetIndex, rotateValue]);

  return (
    <div className={`football-spinner-wheel football-spinner-wheel--${stakes}`}>

      {/* ── LIVE LABEL ── */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="football-spinner-wheel__label"
      >
        <span
          className="football-spinner-wheel__label-text"
        >
          {activeLabel || "—"}
        </span>
      </div>

      {/* ── WHEEL + POINTER WRAPPER ── */}
      <SpinnerWheelDisc items={displayItems} arcSizes={arcSizes} startAngles={startAngles} rotateValue={rotateValue} />
    </div>
  );
}
