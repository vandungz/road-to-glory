
import { ScrollArea } from "@/components/ui/ScrollArea";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { HeroPanel } from "./HeroPanel";

export function AuthLayoutClient({ children }: { children: ReactNode }) {
  const ui = useTranslations("ui");
  return (
    <div className="football-auth-shell">
      <div className="football-auth-stage">
        <HeroPanel />
        <section className="football-auth-form-column" aria-label={ui("authentication")}>
          <ScrollArea className="football-auth-form-column__body" data-mount="page">{children}</ScrollArea>
          <footer className="football-auth-form-column__footer">
            <span>{ui("footballLife202526Season")}</span>
          </footer>
        </section>
      </div>
    </div>
  );
}
