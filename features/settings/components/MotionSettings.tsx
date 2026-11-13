"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { setMotionPreference, useMotionPreference } from "../game-motion";

export function MotionSettings() {
  const ui = useTranslations("ui");
  const reduce = useMotionPreference();
  const [storageBlocked, setStorageBlocked] = useState(false);

  return (
    <fieldset className="football-account-options" aria-describedby="motion-description">
      <legend>{ui("motion")}</legend>
      <p id="motion-description">{ui("reduceWheelTransitionAndPortraitAnimation")}</p>
      <label><input type="radio" name="motion" checked={!reduce} onChange={() => setStorageBlocked(!setMotionPreference(false))} /> {ui("followSystem")}</label>
      <label><input type="radio" name="motion" checked={reduce} onChange={() => setStorageBlocked(!setMotionPreference(true))} /> {ui("alwaysReduceMotion")}</label>
      <p className="football-account-note" role="status">{storageBlocked
        ? ui("yourBrowserBlockedSavingTheChangeAppliesUntilYouReloadThisTab")
        : ui("savedOnThisBrowser")}</p>
    </fieldset>
  );
}
