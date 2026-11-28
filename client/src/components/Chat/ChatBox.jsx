import { useCallback, useEffect, useRef, useState } from "react";
import { sendMessage, clearChatMemory } from "../../services/api";
import {
  getChatHistory,
  saveChatHistory,
  clearChatHistory,
  onChatHistoryCleared,
} from "../../utils/history";
import { Alert } from "../ui";
import { Icon } from "../ui/Icons";
import { useSpeech } from "../../hooks/useSpeech";

const SUGGESTIONS = [
  "open youtube",
  "find report.pdf",
  "what's in my downloads",
  "remind me to stretch",
  "system info",
];

const greetingFor = (hour) => {
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

export default function ChatBox() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState(() => getChatHistory());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const sendRef = useRef(null);

  const {
    recognitionSupported,
    listening,
    interim,
    voiceError,
    muted,
    toggleMuted,
    start,
    stop,
    speak,
    stopSpeaking,
    dismissVoiceError,
  } = useSpeech({ onResult: (text) => sendRef.current?.(text) });

  useEffect(() => {
    saveChatHistory(chat);
  }, [chat]);

  useEffect(() => onChatHistoryCleared(() => setChat([])), []);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const list = listRef.current;

    if (list) list.scrollTop = list.scrollHeight;
  }, [chat, isLoading]);

  const send = useCallback(
    async (text) => {
      const trimmed = String(text || "").trim();

      if (!trimmed || isLoading) return;

      setMessage("");
      setError("");
      setIsLoading(true);
      stopSpeaking();

      try {
        const data = await sendMessage(trimmed);

        setChat((prev) => [
          ...prev,
          { user: trimmed, bot: data.reply, source: data.source },
        ]);
        speak(data.reply);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
        inputRef.current?.focus({ preventScroll: true });
      }
    },
    [isLoading, speak, stopSpeaking]
  );

  // A finished voice command is sent automatically, like pressing Enter.
  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  const handleSubmit = (event) => {
    event.preventDefault();
    send(message);
  };

  const handleMic = () => {
    dismissVoiceError();
    stopSpeaking();

    if (listening) {
      stop();
    } else {
      start();
    }
  };

  return (
    <section className="relative overflow-hidden rounded-2xl bg-slate-950 text-slate-100 shadow-xl ring-1 ring-white/10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 top-8 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
      />

      <div className="relative px-5 pt-6 sm:px-7 sm:pt-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
            <span
              className={`h-2 w-2 rounded-full ${
                listening ? "animate-pulse bg-emerald-400" : "bg-emerald-500"
              }`}
            />
            Orbit · local assistant
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleMuted}
              aria-label={muted ? "Unmute spoken replies" : "Mute spoken replies"}
              title={muted ? "Spoken replies are off" : "Spoken replies are on"}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <Icon name={muted ? "volumeOff" : "volume"} className="h-4 w-4" />
            </button>

            {chat.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  clearChatHistory();
                  clearChatMemory().catch(() => {});
                  setChat([]);
                }}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {greetingFor(new Date().getHours())},{" "}
          <span className="bg-gradient-to-r from-indigo-300 via-sky-300 to-fuchsia-300 bg-clip-text text-transparent">
            what should I do?
          </span>
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm text-slate-400">
          {recognitionSupported
            ? 'Say it or type it. Try "open youtube", "find report.pdf" or "remind me to call Sam".'
            : 'Type a command below. Voice input needs Chrome or Edge with microphone access.'}
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-5 flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-1.5 backdrop-blur transition focus-within:border-indigo-400/60 focus-within:ring-2 focus-within:ring-indigo-400/20"
        >
          <span className="pl-2.5 text-slate-500" aria-hidden="true">
            <Icon name="sparkles" className="h-4 w-4" />
          </span>

          <input
            ref={inputRef}
            type="text"
            value={interim || message}
            onChange={(event) => setMessage(event.target.value)}
            aria-label="Message Orbit"
            placeholder={listening ? "Listening…" : "Type or say a command…"}
            readOnly={Boolean(interim)}
            className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none"
          />

          <button
            type="button"
            onClick={handleMic}
            aria-label={listening ? "Stop listening" : "Start voice command"}
            aria-pressed={listening}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
              listening
                ? "animate-pulse bg-rose-500 text-white"
                : "text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon name={listening ? "stop" : "mic"} className="h-4 w-4" />
          </button>

          <button
            type="submit"
            disabled={!message.trim() || isLoading || Boolean(interim)}
            className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-indigo-500 px-3.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            {isLoading ? (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
            ) : (
              <Icon name="send" className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>

        <p className="mt-2 min-h-4 text-xs text-slate-400">
          {listening
            ? interim || "Listening — speak now"
            : "Press Enter to send, or click the mic to talk."}
        </p>

        {voiceError && (
          <p className="mt-1 text-xs text-amber-300" role="status">
            {voiceError}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2 pb-5">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => send(suggestion)}
              disabled={isLoading}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:border-indigo-400/50 hover:bg-indigo-500/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {(chat.length > 0 || isLoading) && (
        <div className="relative border-t border-white/10 bg-slate-900/50">
          <div
            ref={listRef}
            role="log"
            aria-live="polite"
            aria-label="Conversation"
            className="max-h-80 space-y-3 overflow-y-auto px-5 py-4 sm:px-7"
          >
            {chat.map((entry, index) => (
              <div key={index} className="space-y-2.5">
                <div className="flex justify-end">
                  <div className="max-w-[82%] rounded-2xl rounded-br-sm bg-indigo-500 px-4 py-2.5 text-sm text-white shadow-sm">
                    {entry.user}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-indigo-200 ring-1 ring-white/10">
                    <Icon name="sparkles" className="h-3.5 w-3.5" />
                  </span>
                  <div className="max-w-[82%] whitespace-pre-line rounded-2xl rounded-tl-sm bg-white/5 px-4 py-2.5 text-sm text-slate-200 ring-1 ring-white/10">
                    {entry.source === "ai" && (
                      <span className="mb-1 mr-2 inline-block rounded bg-indigo-500/25 px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-indigo-200">
                        AI
                      </span>
                    )}
                    {entry.bot}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-indigo-200 ring-1 ring-white/10">
                  <Icon name="sparkles" className="h-3.5 w-3.5" />
                </span>
                <span className="sr-only">Orbit is working</span>
                <span className="flex gap-1" aria-hidden="true">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="relative px-5 pb-4 sm:px-7">
          <Alert tone="error" onDismiss={() => setError("")}>
            The local API did not respond: {error}. Check that the server is running.
          </Alert>
        </div>
      )}
    </section>
  );
}
