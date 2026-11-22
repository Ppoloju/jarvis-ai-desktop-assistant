import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Icon } from "../ui/Icons";
import { getSystemInfo } from "../../services/api";
import { navLinks, pageTitles } from "../../utils/navigation";

function Topbar() {
  const { pathname } = useLocation();
  const [status, setStatus] = useState("checking");

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
  }, [pathname]);

  const statusStyles = {
    checking: "bg-slate-100 text-slate-600",
    online: "bg-emerald-50 text-emerald-700",
    offline: "bg-red-50 text-red-700",
  };

  const statusLabel = {
    checking: "Checking API",
    online: "API online",
    offline: "API offline",
  };

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white lg:hidden">
            <Icon name="sparkles" className="h-4 w-4" />
          </span>
          <h1 className="text-sm font-semibold text-slate-900">
            {pageTitles[pathname] || "Not found"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex ${statusStyles[status]}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status === "online"
                  ? "bg-emerald-500"
                  : status === "offline"
                    ? "bg-red-500"
                    : "bg-slate-400"
              }`}
            />
            {statusLabel[status]}
          </span>
          <Link
            to="/settings"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            aria-label="Settings"
          >
            <Icon name="settings" className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 lg:hidden">
        {navLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium ${
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
