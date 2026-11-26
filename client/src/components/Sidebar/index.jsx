import { NavLink } from "react-router-dom";
import { Icon } from "../ui/Icons";
import { navSections } from "../../utils/navigation";

function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-slate-800 bg-slate-900 lg:flex">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500 text-white shadow-lg shadow-indigo-500/30">
          <Icon name="sparkles" className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-white">Orbit</p>
          <p className="text-xs text-slate-400">Desktop assistant</p>
        </div>
      </div>

      <nav
        aria-label="Primary"
        className="flex-1 space-y-6 overflow-y-auto px-3 py-2"
      >
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {section.label}
            </p>
            <ul className="space-y-1">
              {section.links.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.to === "/"}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                        isActive
                          ? "bg-indigo-500/15 font-medium text-white"
                          : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-indigo-400" />
                        )}
                        <Icon
                          name={link.icon}
                          className={`h-4 w-4 ${isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"}`}
                        />
                        {link.label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-1.5 border-t border-slate-800 px-5 py-4">
        <p className="flex items-center gap-2 text-xs text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Runs on your machine
        </p>
        <p className="text-[11px] text-slate-500">Version 1.0.0</p>
      </div>
    </aside>
  );
}

export default Sidebar;
