"use client";

import { useRef } from "react";
import { Search, X } from "lucide-react";

export function SearchField({ label, value, onChange, placeholder, disabled = false, maxLength }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; disabled?: boolean; maxLength?: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  return <div className="football-search-field">
    <Search aria-hidden="true" size={16} />
    <input ref={input} className="football-search-input" type="search" aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} disabled={disabled} maxLength={maxLength} />
    {value && <button type="button" aria-label={`Xóa ${label.toLowerCase()}`} disabled={disabled} onClick={() => { onChange(""); input.current?.focus(); }}><X aria-hidden="true" size={16} /></button>}
  </div>;
}
