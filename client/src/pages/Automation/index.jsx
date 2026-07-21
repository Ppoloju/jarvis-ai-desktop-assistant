import { useState } from "react";
import { openWebsite, openApp, captureScreenshot } from "../../services/api";

export default function Automation() {
  const [url, setUrl] = useState("");
  const [app, setApp] = useState("");
  const [screenshotResult, setScreenshotResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenWebsite = async () => {
    if (!url.trim()) return;
    setIsLoading(true);
    try {
      const result = await openWebsite(url);
      alert(result.message);
      setUrl("");
    } catch (error) {
      console.error("Error opening website:", error);
      alert("Failed to open website");
    }
    setIsLoading(false);
  };

  const handleOpenApp = async () => {
    if (!app.trim()) return;
    setIsLoading(true);
    try {
      const result = await openApp(app);
      alert(result.message);
      setApp("");
    } catch (error) {
      console.error("Error opening app:", error);
      alert("Failed to open app");
    }
    setIsLoading(false);
  };

  const handleScreenshot = async () => {
    setIsLoading(true);
    try {
      const result = await captureScreenshot();
      setScreenshotResult(result);
      alert(`Screenshot saved: ${result.file}`);
    } catch (error) {
      console.error("Error taking screenshot:", error);
      alert("Failed to take screenshot");
    }
    setIsLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">⚡ Automation</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Open Website */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🌐 Open Website</h2>
          <div className="space-y-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter URL (e.g., https://google.com)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={handleOpenWebsite}
              disabled={isLoading || !url.trim()}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? "Opening..." : "Open Website"}
            </button>
          </div>
        </div>

        {/* Open App */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📱 Open Application</h2>
          <div className="space-y-3">
            <input
              type="text"
              value={app}
              onChange={(e) => setApp(e.target.value)}
              placeholder="Enter app name (chrome, vscode, calculator)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={handleOpenApp}
              disabled={isLoading || !app.trim()}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? "Opening..." : "Open App"}
            </button>
          </div>
        </div>

        {/* Screenshot */}
        <div className="bg-white rounded-xl shadow-lg p-6 md:col-span-2">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📸 Capture Screenshot</h2>
          <button
            onClick={handleScreenshot}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? "Capturing..." : "Take Screenshot"}
          </button>
          {screenshotResult && (
            <p className="mt-3 text-green-600">✓ Screenshot saved successfully</p>
          )}
        </div>
      </div>
    </div>
  );
}