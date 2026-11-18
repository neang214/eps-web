import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { X as CloseIcon, Loader2 } from "lucide-react";
import { useSettings } from "../store";

export function Switch({ id, checked, onChange, label }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label htmlFor={id} className="flex min-h-12 cursor-pointer items-center justify-between gap-4 py-1">
      <span className="font-medium text-zinc-900">{label}</span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-6 w-11 shrink-0 cursor-pointer accent-indigo-600"
      />
    </label>
  );
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const { t } = useSettings();
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, []);

  const trapTab = (e: ReactKeyboardEvent) => {
    if (e.key !== "Tab") return;
    const nodes = ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!nodes || nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === ref.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-xs sm:items-center">
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={trapTab}
        className="max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-zinc-100 pb-3">
          <h2 className="text-lg font-bold tracking-tight text-zinc-900">{title}</h2>
          <button type="button" className="btn btn-secondary min-h-9 min-w-9 p-1.5" onClick={onClose} aria-label={t("common.close")}>
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function LoadingBlock() {
  const { t } = useSettings();
  return (
    <div className="card my-4 flex flex-col items-center justify-center gap-2 p-10 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      <p role="status" className="muted font-medium">
        {t("common.loading")}
      </p>
    </div>
  );
}

export function Ko({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span lang="ko" className={className}>
      {children}
    </span>
  );
}

/** Text in the learner's translation language, marked with the right lang attribute. */
export function Tr({ lang, children, className }: { lang: "km" | "en"; children: ReactNode; className?: string }) {
  return (
    <span lang={lang} className={className}>
      {children}
    </span>
  );
}

export function SampleBadge() {
  const { t } = useSettings();
  return (
    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
      {t("common.sampleBadge")}
    </span>
  );
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="mb-4 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{children}</h1>;
}

export function formatDuration(ms: number, t: (k: string, v?: Record<string, string | number>) => string): string {
  const total = Math.round(ms / 1000);
  return t("results.minutesShort", { m: Math.floor(total / 60), s: total % 60 });
}

/** A thin progress bar with a text label, for "12 of 94 learned". */
export function ProgressBar({ value, total, label }: { value: number; total: number; label: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <p className="muted text-sm font-semibold" role="status">{label}</p>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-200" aria-hidden="true">
        <span className="block h-full rounded-full bg-indigo-600" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
