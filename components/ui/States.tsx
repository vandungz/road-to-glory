import { AlertCircle, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export function LoadingState({ label = "Đang tải dữ liệu" }: { label?: ReactNode }) {
  return <div className="rtg-state" role="status"><Loader2 className="animate-spin" aria-hidden="true" size={18} /><span>{label}</span></div>;
}

export function EmptyState({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return <div className="rtg-state rtg-state--empty"><strong>{title}</strong>{children && <span>{children}</span>}</div>;
}

export function ErrorState({ title = "Không thể tải dữ liệu", children }: { title?: ReactNode; children?: ReactNode }) {
  return <div className="rtg-state rtg-state--error" role="alert"><AlertCircle aria-hidden="true" size={18} /><strong>{title}</strong>{children && <span>{children}</span>}</div>;
}
