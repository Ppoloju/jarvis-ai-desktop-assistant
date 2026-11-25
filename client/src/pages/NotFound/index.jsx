import { Link } from "react-router-dom";
import { Icon } from "../../components/ui/Icons";

export default function NotFound() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Icon name="search" className="h-5 w-5" />
      </span>
      <h1 className="mt-4 text-2xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-1 text-sm text-slate-500">
        The page you are looking for does not exist or was moved.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
      >
        <Icon name="arrowLeft" className="h-4 w-4" />
        Back to overview
      </Link>
    </div>
  );
}
