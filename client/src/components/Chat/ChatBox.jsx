import { useState } from "react";

export default function ChatBox() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);

  const sendMessage = async () => {
    const res = await fetch("http://localhost:5000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    const data = await res.json();

    setChat([...chat, { user: message, bot: data.reply }]);
    setMessage("");
  };

  return (
    <div>
      <h2>Jarvis Chat</h2>

      {chat.map((c, i) => (
        <div key={i}>
          <p><b>You:</b> {c.user}</p>
          <p><b>Jarvis:</b> {c.bot}</p>
        </div>
      ))}

      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}