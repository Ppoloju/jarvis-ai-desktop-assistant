import { useEffect, useRef, useState } from "react";
import { sendMessage } from "../../services/api";
import {
  getChatHistory,
  saveChatHistory,
  clearChatHistory,
  onChatHistoryCleared,
} from "../../utils/history";
import { Alert, Button } from "../ui";
import { Icon } from "../ui/Icons";

const SUGGESTIONS = [
  "what time is it",
  "system info",
  "remind me to stretch",
  "list files",
  "what can you do",
];

export default function ChatBox() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState(() => getChatHistory());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    saveChatHistory(chat);
  }, [chat]);

  useEffect(() => onChatHistoryCleared(() => setChat([])), []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat, isLoading]);

  const send = async (text) => {
    const trimmed = text.trim();

    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const data = await sendMessage(trimmed);
      setChat((prev) => [...prev, { user: trimmed, bot: data.reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    send(message);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send(message);
    }
  };

  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Icon name="sparkles" className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-slate-900">Assistant</h2>
            <p className="text-xs text-slate-500">Local responses, no API key required</p>
          </div>
        </div>
        {chat.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            icon="trash"
            aria-label="Clear conversation"
            onClick={() => {
              clearChatHistory();
              setChat([]);
            }}
          >
            Clear
          </Button>
        )}
      </header>

      <div
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        className="flex-1 space-y-4 overflow-y-auto px-5 py-5"
        style={{ maxHeight: "26rem" }}
      >
        {chat.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm font-semibold text-slate-900">Start a conversation</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              Ask about the time, your system, reminders, files, or open an app.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => send(suggestion)}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          chat.map((entry, index) => (
            <div key={index} className="space-y-3">
              <div className="flex justify-end gap-2">
                <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-2.5 text-sm text-white shadow-sm">
                  {entry.user}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <Icon name="sparkles" className="h-3.5 w-3.5" />
                </span>
                <div className="max-w-[80%] whitespace-pre-line rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2.5 text-sm text-slate-800">
                  {entry.bot}
                </div>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100">
              <Icon name="sparkles" className="h-3.5 w-3.5" />
            </span>
            <span className="sr-only">Jarvis is thinking</span>
            <span className="flex gap-1" aria-hidden="true">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-100 px-5 py-4">
        {error && (
          <div className="mb-3">
            <Alert tone="error" onDismiss={() => setError("")}>
              The local API did not respond: {error}. Check that the server is running.
            </Alert>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Message Jarvis"
            placeholder="Ask Jarvis anything..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50"
            disabled={isLoading}
          />
          <Button type="submit" icon="send" loading={isLoading} disabled={!message.trim()}>
            Send
          </Button>
        </form>
        <p className="mt-2 text-xs text-slate-400">Press Enter to send a message.</p>
      </div>
    </section>
  );
}
