import { Link } from "react-router-dom";
import ChatBox from "../../components/Chat/ChatBox";
import SystemInfo from "../../components/SystemInfo";
import { PageHeader } from "../../components/ui";
import { Icon } from "../../components/ui/Icons";

const QUICK_ACTIONS = [
  {
    to: "/automation",
    icon: "bolt",
    title: "Automation",
    description: "Open websites, launch apps and capture screenshots.",
  },
  {
    to: "/files",
    icon: "folder",
    title: "Files",
    description: "Create and manage items in the storage folder.",
  },
  {
    to: "/reminders",
    icon: "bell",
    title: "Reminders",
    description: "Keep a short list of things to come back to.",
  },
  {
    to: "/history",
    icon: "history",
    title: "History",
    description: "Revisit conversations saved in this browser.",
  },
];

export default function Home() {
  return (
    <>
      <PageHeader
        title="Overview"
        description="A local assistant for your desktop: conversation, automation, files and reminders."
      />
      <div className="space-y-6">
        <SystemInfo />

        <section aria-label="Quick actions" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                <Icon name={action.icon} className="h-4 w-4" />
              </span>
              <span className="mt-3 flex items-center justify-between gap-2 text-sm font-semibold text-slate-900">
                {action.title}
                <Icon
                  name="arrow"
                  className="h-3.5 w-3.5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500"
                />
              </span>
              <span className="mt-1 text-xs leading-relaxed text-slate-500">
                {action.description}
              </span>
            </Link>
          ))}
        </section>

        <ChatBox />
      </div>
    </>
  );
}
