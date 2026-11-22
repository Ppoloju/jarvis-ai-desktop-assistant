import Sidebar from "../components/Sidebar";
import Topbar from "../components/Navbar";

function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar />
      <div className="lg:pl-64">
        <Topbar />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
