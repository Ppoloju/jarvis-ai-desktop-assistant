import { useEffect, useState } from "react";
import { Icon } from "./Icons";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed";

const buttonVariants = {
  primary:
    "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-600 disabled:shadow-none",
  secondary:
    "border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-600 disabled:shadow-none",
  ghost: "text-slate-600 hover:bg-slate-100 disabled:opacity-50",
  danger:
    "border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:border-slate-200 disabled:bg-white disabled:text-slate-600",
};

const buttonSizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  className = "",
  children,
  disabled,
  ...props
}) {
  return (
    <button
      className={`${buttonBase} ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : (
        icon && <Icon name={icon} className="h-4 w-4" />
      )}
      {children}
    </button>
  );
}

export function ConfirmButton({
  onConfirm,
  children = "Delete",
  confirmLabel = "Confirm delete",
  confirmAriaLabel,
  timeout = 4000,
  className = "",
  "aria-label": ariaLabel,
  ...props
}) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return undefined;

    const timer = setTimeout(() => setConfirming(false), timeout);

    return () => clearTimeout(timer);
  }, [confirming, timeout]);

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={confirming ? confirmAriaLabel || confirmLabel : ariaLabel}
      icon={confirming ? "alert" : "trash"}
      className={`${confirming ? "bg-red-50 text-red-700" : "text-red-600 hover:bg-red-50"} ${className}`}
      onClick={() => {
        if (confirming) {
          setConfirming(false);
          onConfirm();
          return;
        }

        setConfirming(true);
      }}
      {...props}
    >
      {confirming ? confirmLabel : children}
    </Button>
  );
}

export function Card({ title, description, action, children, className = "" }) {
  return (
    <section className={`flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            {title && (
              <h2 className="text-sm font-semibold tracking-tight text-slate-900">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 break-words text-sm text-slate-500">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className="flex-1 px-5 py-4">{children}</div>
    </section>
  );
}

export function PageHeader({ title, description, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Input({ label, hint, className = "", ...props }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      )}
      <input
        className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 ${className}`}
        {...props}
      />
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Textarea({ label, className = "", ...props }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      )}
      <textarea
        className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${className}`}
        {...props}
      />
    </label>
  );
}

const alertStyles = {
  success: ["border-emerald-200 bg-emerald-50 text-emerald-800", "check"],
  error: ["border-red-200 bg-red-50 text-red-800", "alert"],
  info: ["border-slate-200 bg-slate-50 text-slate-700", "info"],
};

export function Alert({ tone = "info", onDismiss, children }) {
  const [styles, icon] = alertStyles[tone] || alertStyles.info;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm ${styles}`}
    >
      <Icon name={icon} className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 whitespace-pre-line">{children}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="-mr-1 rounded p-0.5 transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = "info", title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {description && <p className="max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Stat({ icon, label, value, hint }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon name={icon} className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 truncate text-lg font-semibold tabular-nums text-slate-900" title={value}>
        {value}
      </p>
      {hint && <p className="truncate text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
