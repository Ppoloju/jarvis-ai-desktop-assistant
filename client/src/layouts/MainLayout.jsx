import Sidebar from "../components/Sidebar";
import Topbar from "../components/Navbar";

function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/70 text-slate-900">
      <a
        href="#main"
        className="sr-only rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="lg:pl-64">
        <Topbar />
        <main
          id="main"
          className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
