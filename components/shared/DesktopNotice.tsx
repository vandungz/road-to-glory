import { Monitor } from "lucide-react";
import Link from "next/link";

/** CSS keeps a running career mounted if its window is temporarily narrowed. */
export function DesktopNotice() {
  return (
    <section className="football-desktop-notice" aria-labelledby="desktop-notice-title">
      <Link href="/" className="football-desktop-notice__brand">Road to Glory</Link>
      <div className="football-desktop-notice__body">
        <Monitor size={56} strokeWidth={1.5} aria-hidden="true" />
        <h1 id="desktop-notice-title">Hãy mở game trên máy tính</h1>
        <p>Football Life hiện dành cho desktop. Mở bằng máy tính hoặc mở rộng cửa sổ trình duyệt để tiếp tục.</p>
        <span>Cửa sổ tối thiểu 1024px</span>
      </div>
      <p className="football-desktop-notice__footer">Football Life / Road to Glory</p>
    </section>
  );
}
