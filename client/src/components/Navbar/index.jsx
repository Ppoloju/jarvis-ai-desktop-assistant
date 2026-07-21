function Navbar() {
  return (
    <nav className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">🤖</div>
            <h2 className="text-2xl font-bold">Jarvis AI</h2>
          </div>
          <div className="flex items-center space-x-4">
            <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              Settings
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;