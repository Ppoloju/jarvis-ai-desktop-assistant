import { Link } from "react-router-dom";

function Sidebar() {
  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-6">
      <div className="space-y-2">
        <Link
          to="/"
          className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
        >
          <span>🏠</span>
          <span className="font-medium">Home</span>
        </Link>
        <Link
          to="/automation"
          className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <span>⚡</span>
          <span className="font-medium">Automation</span>
        </Link>
        <Link
          to="/history"
          className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <span>📜</span>
          <span className="font-medium">History</span>
        </Link>
        <Link
          to="/settings"
          className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <span>⚙️</span>
          <span className="font-medium">Settings</span>
        </Link>
      </div>
    </aside>
  );
}

export default Sidebar;