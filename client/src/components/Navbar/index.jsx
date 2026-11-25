import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Icon } from "../ui/Icons";
import { getSystemInfo } from "../../services/api";
import { navLinks, pageTitles } from "../../utils/navigation";

const statusStyles = {
  checking: "bg-slate-100 text-slate-600",
  online: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  offline: "bg-red-50 text-red-700 hover:bg-red-100",
};

const statusDots = {
  checking: "bg-slate-400",
  online: "bg-emerald-500",
  offline: "bg-red-500",
};

const statusLabels = {
  checking: "Checking API",
  online: "API online",
  offline: "API offline",
};

function Topbar() {
  const { pathname } = useLocation();
  const [status, setStatus] = useState("checking");

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    getSystemInfo()
      .then(() => {
        if (active) setStatus("online");
      })
      .catch(() => {
        if (active) setStatus("offline");
      });

    return () => {
      active = false;
    };
  }, [pathname, attempt]);

  const check = () => {
    setStatus("checking");
    setAttempt((value) => value + 1);
  };

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Icon name="sparkles" className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold text-slate-500">Jarvis AI</span>
          </span>
          <span className="hidden truncate text-sm font-semibold text-slate-900 sm:block">
            {pageTitles[pathname] || "Page not found"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={check}
            disabled={status === "checking"}
            title="Check the local API again"
            aria-label={`${statusLabels[status]}. Check again`}
            className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition disabled:cursor-default sm:inline-flex ${statusStyles[status]}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${statusDots[status]}`} />
            {statusLabels[status]}
          </button>
          <Link
            to="/settings"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Settings"
          >
            <Icon name="settings" className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <nav
        aria-label="Sections"
        className="flex flex-wrap gap-1 border-t border-slate-100 px-3 py-2 lg:hidden"
      >
        {navLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              `rounded-md px-3 py-1.5 text-xs font-medium transition ${
                isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

export default Topbar;
