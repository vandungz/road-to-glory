"use client";

import { useState } from "react";
import { setMotionPreference, useMotionPreference } from "../game-motion";

export function MotionSettings() {
  const reduce = useMotionPreference();
  const [storageBlocked, setStorageBlocked] = useState(false);

  return (
    <fieldset className="football-account-options" aria-describedby="motion-description">
      <legend>Chuyển động</legend>
      <p id="motion-description">Giảm hiệu ứng vòng quay, chuyển cảnh và hoạt ảnh chân dung.</p>
      <label><input type="radio" name="motion" checked={!reduce} onChange={() => setStorageBlocked(!setMotionPreference(false))} /> Theo hệ thống</label>
      <label><input type="radio" name="motion" checked={reduce} onChange={() => setStorageBlocked(!setMotionPreference(true))} /> Luôn giảm chuyển động</label>
      <p className="football-account-note" role="status">{storageBlocked
        ? "Trình duyệt chặn lưu tùy chọn. Thay đổi áp dụng trong tab này đến khi tải lại."
        : "Tùy chọn được lưu trên trình duyệt này."}</p>
    </fieldset>
  );
}
