import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ActivityLine } from "./ActivityLine";

export function LoadingState({ label, className }: { label?: ReactNode; className?: string }) {
  const ui = useTranslations("ui");
  return <div className={cn("football-inline-loading", className)} role="status"><ActivityLine /><span>{label ?? ui("loadingData")}</span></div>;
}

export type LoadingLayout = "page" | "career" | "quick" | "records" | "lobby" | "match" | "setup";

export function RouteLoading({ title, label, layout = "page" }: {
  title: string;
  label: string;
  layout?: LoadingLayout;
}) {
  const hasRail = layout === "career" || layout === "quick" || layout === "match";
  const header = <header className={cn("football-route-loading__header", layout === "quick" && "football-quick-mode__stage-head")}>
      <h1>{title}</h1>
      <p role="status">{label}</p>
      <ActivityLine />
    </header>;
  const workspace = layout === "career" || layout === "quick";
  if (layout === "setup") return <section className="football-route-loading football-route-loading--setup" aria-label={title} aria-busy="true">
    {header}<div className="football-route-loading__setup" aria-hidden="true">
      <div><PlaceholderRows count={3} /></div>
      <div className="football-route-loading__portraits">{Array.from({ length: 6 }, (_, i) => <div key={i} />)}</div>
      <div className="football-route-loading__button" />
    </div>
  </section>;
  return <section className={cn("football-route-loading", layout === "career" && "football-dashboard__main", layout === "quick" && "football-quick-mode football-quick-play")} data-layout={layout} aria-label={title} aria-busy="true">
    {!workspace && header}
    {layout === "quick" ? <>
      <div className="football-route-loading__rail football-quick-play__tracker" aria-hidden="true">
        <div className="football-quick-play__tracker-head"><div className="football-quick-portrait-identity">
          <div className="football-player-portrait football-route-loading__portrait" />
          <div className="football-route-loading__identity"><span /><span /></div>
        </div></div>
      </div>
      <div className="football-route-loading__surface football-quick-play__stage">
        {header}<div className="football-quick-play__controls" aria-hidden="true">
          <div className="football-quick-play__wheel"><div className="football-spinner-wheel">
            <div className="football-spinner-wheel__label"><div className="football-route-loading__wheel-label" /></div>
            <div className="football-spinner-wheel__stage football-route-loading__wheel" />
          </div></div>
          <div className="football-quick-mode__action"><div className="football-route-loading__button" /></div>
        </div>
      </div>
    </> : layout !== "page" && <div className={cn("football-route-loading__layout", layout === "career" && "football-dashboard__grid", layout === "match" && "football-pve-duel", layout === "lobby" && "football-pve-lobby__list")}>
      {hasRail && layout !== "match" && <div className="football-route-loading__rail football-dashboard__story" aria-hidden="true"><PlaceholderRows count={6} /></div>}
      <div className={cn("football-route-loading__surface", layout === "career" && "football-dashboard__actions")}>
        {layout === "career" && header}
        {layout === "records" || layout === "lobby" ? <PlaceholderRows count={layout === "lobby" ? 2 : 6} /> : layout === "match"
          ? <div className="football-route-loading__pitch" aria-hidden="true" /> : <WheelPlaceholder />}
      </div>
      {layout === "lobby" && <div className="football-route-loading__surface" aria-hidden="true"><PlaceholderRows count={2} /></div>}
      {(layout === "career" || layout === "match") && <div className="football-route-loading__rail football-dashboard__dossier" aria-hidden="true">
        {layout === "career" && <div className="football-route-loading__portrait" />}<PlaceholderRows count={6} />
      </div>}
    </div>}
  </section>;
}

function WheelPlaceholder() {
  return <div className="football-route-loading__wheel-area" aria-hidden="true">
    <div className="football-route-loading__wheel-label" />
    <div className="football-spinner-wheel__stage football-route-loading__wheel" />
    <div className="football-route-loading__button" />
  </div>;
}

function PlaceholderRows({ count }: { count: number }) {
  return <div className="football-route-loading__rows">
    {Array.from({ length: count }, (_, index) => <div key={index}><span /><span /></div>)}
  </div>;
}

export function EmptyState({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return <div className="football-state football-state--empty"><strong>{title}</strong>{children && <span>{children}</span>}</div>;
}

export function ErrorState({ title, children }: { title?: ReactNode; children?: ReactNode }) {
  const ui = useTranslations("ui");
  return <div className="football-state football-state--error" role="alert"><AlertCircle aria-hidden="true" size={18} /><strong>{title ?? ui("dataError")}</strong>{children && <span>{children}</span>}</div>;
}
