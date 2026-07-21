import { useState } from "react";
import { sendMessage } from "../../services/api";

export default function ChatBox() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    setIsLoading(true);
    try {
      const data = await sendMessage(message);
      setChat([...chat, { user: message, bot: data.reply }]);
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      setChat([...chat, { user: message, bot: "Sorry, something went wrong." }]);
    }
    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">💬 Chat with Jarvis</h2>

      <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
        {chat.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-lg">Start a conversation with Jarvis!</p>
            <p className="text-sm mt-2">Ask me anything about automation, files, or system info.</p>
          </div>
        ) : (
          chat.map((c, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-end">
                <div className="bg-purple-600 text-white px-4 py-2 rounded-lg max-w-md">
                  {c.user}
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg max-w-md">
                  {c.bot}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex space-x-3">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          disabled={isLoading}
        />
        <button
          onClick={handleSendMessage}
          disabled={isLoading || !message.trim()}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}