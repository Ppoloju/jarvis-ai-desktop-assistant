export const navSections = [
  {
    label: "Workspace",
    links: [
      { to: "/", label: "Overview", icon: "home" },
      { to: "/automation", label: "Automation", icon: "bolt" },
      { to: "/files", label: "Files", icon: "folder" },
      { to: "/computer", label: "My computer", icon: "computer" },
      { to: "/reminders", label: "Reminders", icon: "bell" },
    ],
  },
  {
    label: "Activity",
    links: [{ to: "/history", label: "History", icon: "history" }],
  },
  {
    label: "System",
    links: [{ to: "/settings", label: "Settings", icon: "settings" }],
  },
];

export const navLinks = navSections.flatMap((section) => section.links);

export const pageTitles = Object.fromEntries(
  navLinks.map(({ to, label }) => [to, label]),
);
