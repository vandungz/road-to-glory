import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { ClassicLobbyIntro, ClassicLobbyContent } from "@/features/game/components/ClassicLobbyIntro";
import { previewClassicSessions } from "../design-preview/fixtures";

export default function ClassicPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <AppShell className="football-classic-lobby-shell" userEmail="classic.preview@example.test" headerIdentityMeta={<span>Classic</span>}>
    <section className="football-classic-lobby">
      <Link className="football-classic-lobby__back" href="/"><ChevronLeft aria-hidden="true" size={14} /> Chọn chế độ</Link>
      <ClassicLobbyIntro sessionCount={previewClassicSessions.length} />
      <ClassicLobbyContent sessions={previewClassicSessions} />
    </section>
  </AppShell>;
}
