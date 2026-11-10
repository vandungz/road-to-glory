"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export interface FilterOption {
  value: string;
  label: string;
  description?: string;
  keywords?: string;
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
}

/** Single-choice filter. Native popover keeps menus above clipped lists and modals. */
export function FilterSelect({ label, value, options, onChange, searchable = false, disabled = false }: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  searchable?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<CSSProperties & { "--filter-list-height"?: string }>({});
  const selected = options.find((option) => option.value === value);
  const visible = options.filter((option) => normalize(`${option.label} ${option.keywords ?? ""}`).includes(normalize(query)));

  useEffect(() => {
    if (!open) return;
    function dismiss(event: Event) {
      if (!(event.target instanceof Node) || !popup.current?.contains(event.target)) popup.current?.hidePopover();
    }
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => { window.removeEventListener("resize", dismiss); window.removeEventListener("scroll", dismiss, true); };
  }, [open]);

  function close() {
    popup.current?.hidePopover();
    trigger.current?.focus();
  }

  function show() {
    if (disabled || !trigger.current || !popup.current) return;
    if (popup.current.matches(":popover-open")) { close(); return; }
    const rect = trigger.current.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - 16;
    const above = rect.top - 16;
    const upwards = below < 240 && above > below;
    const height = Math.min(360, upwards ? above : below);
    const width = Math.min(Math.max(rect.width, searchable ? 320 : 260), window.innerWidth - 32);
    setPosition({
      left: Math.max(16, Math.min(rect.left, window.innerWidth - width - 16)), width,
      ...(upwards ? { bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8 }),
      maxHeight: height, "--filter-list-height": `${Math.max(80, height - (searchable ? 72 : 20))}px`,
    });
    setQuery("");
    popup.current.showPopover();
    requestAnimationFrame(() => {
      if (searchable) search.current?.focus();
      else popup.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
    });
  }

  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (event.key === "Tab") { popup.current?.hidePopover(); return; }
    const fromSearch = event.target === search.current;
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) || (fromSearch && ["Home", "End"].includes(event.key))) return;
    event.preventDefault();
    const buttons = [...(popup.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])];
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
      : event.key === "ArrowDown" ? Math.min(current + 1, buttons.length - 1) : current < 0 ? buttons.length - 1 : Math.max(0, current - 1);
    buttons[next]?.focus();
  }

  return <div className="football-filter">
    <button ref={trigger} type="button" className="football-filter__trigger" role="combobox"
      aria-label={label} aria-expanded={open} aria-haspopup="dialog" aria-controls={id} disabled={disabled}
      onClick={show} onKeyDown={(event) => { if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); show(); } }}>
      <span>{selected?.label ?? label}</span><ChevronDown aria-hidden="true" size={16} />
    </button>
    <div ref={popup} id={id} popover="auto" role="dialog" aria-label={label} className="football-filter__popup" style={position}
      onToggle={(event) => setOpen(event.newState === "open")} onKeyDown={navigate}>
      {searchable && <label className="football-filter__search"><Search aria-hidden="true" size={16} />
        <input ref={search} className="football-search-input" aria-label={`Tìm trong ${label.toLowerCase()}`} placeholder="Tìm tùy chọn..." value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>}
      <div className="football-filter__options" role="listbox" aria-label={label}>
        {visible.map((option) => <button key={option.value} type="button" role="option" tabIndex={-1} aria-selected={option.value === value}
          onClick={() => { onChange(option.value); close(); }}>
          <span><span>{option.label}</span>{option.description && <small>{option.description}</small>}</span>
          {option.value === value && <Check aria-hidden="true" size={16} />}
        </button>)}
        {visible.length === 0 && <p role="status">Không tìm thấy tùy chọn.</p>}
      </div>
    </div>
  </div>;
}
