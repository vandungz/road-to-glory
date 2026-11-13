import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ActivityLine } from "./ActivityLine";

export function LoadingState({ label, className }: { label?: ReactNode; className?: string }) {
  const ui = useTranslations("ui");
  return <div className={cn("football-inline-loading", className)} role="status"><ActivityLine /><span>{label ?? ui("loadingData")}</span></div>;
}

type LoadingLayout = "page" | "career" | "quick" | "records" | "match";

export function RouteLoading({ title, label, layout = "page" }: {
  title: string;
  label: string;
  layout?: LoadingLayout;
}) {
  const hasRail = layout === "career" || layout === "quick" || layout === "match";
  return <section className="football-route-loading" data-layout={layout} aria-label={title}>
    <header className="football-route-loading__header">
      <h1>{title}</h1>
      <p role="status">{label}</p>
      <ActivityLine />
    </header>
    {layout !== "page" && <div className="football-route-loading__layout" aria-hidden="true">
      {hasRail && layout !== "match" && <div className="football-route-loading__rail"><PlaceholderRows count={3} /></div>}
      <div className="football-route-loading__surface">
        {layout === "records" ? <PlaceholderRows count={3} /> : (
          <div className={layout === "match" ? "football-route-loading__pitch" : "football-route-loading__wheel"} />
        )}
      </div>
      {(layout === "career" || layout === "match") && <div className="football-route-loading__rail"><PlaceholderRows count={3} /></div>}
    </div>}
  </section>;
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
