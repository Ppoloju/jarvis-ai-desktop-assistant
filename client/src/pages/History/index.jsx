import { useState } from "react";
import { getChatHistory } from "../../utils/history";

export default function History() {
  const [chat] = useState(() => getChatHistory());

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">📜 History</h1>

      {chat.length === 0 ? (
        <p className="text-gray-500 py-8 text-center">
          No conversations yet. Start chatting with Jarvis on the home page.
        </p>
      ) : (
        <ul className="space-y-4">
          {chat.map((entry, index) => (
            <li key={index} className="border-b border-gray-200 pb-4 last:border-0">
              <p className="font-medium text-purple-700">You: {entry.user}</p>
              <p className="text-gray-700">Jarvis: {entry.bot}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
