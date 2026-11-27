import { useCallback, useEffect, useRef, useState } from "react";

const MUTE_KEY = "orbit-voice-muted";

const getRecognition =
  typeof window === "undefined"
    ? null
    : window.SpeechRecognition || window.webkitSpeechRecognition || null;

const synthesis =
  typeof window === "undefined" || !("speechSynthesis" in window) ? null : window.speechSynthesis;

const readMuted = () => {
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
};

// Replies come back as multi-line text with bullets; strip what reads badly aloud.
const cleanForSpeech = (text) =>
  String(text || "")
    .replace(/^[\s]*[-•*]\s*/gm, "")
    .replace(/[*_`#>]/g, "")
    .replace(/—/g, ",")
    .replace(/\.\.\./g, ",")
    .replace(/\s+/g, " ")
    .trim();

export function useSpeech({ onResult } = {}) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [muted, setMuted] = useState(readMuted);
  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    try {
      window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      // storage unavailable; the preference just stays in memory
    }
  }, [muted]);

  const stopSpeaking = useCallback(() => {
    try {
      synthesis?.cancel();
    } catch {
      // nothing to cancel
    }
  }, []);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // the recognizer already stopped
    }

    recognitionRef.current = null;
    setListening(false);
    setInterim("");
  }, []);

  const start = useCallback(() => {
    if (!getRecognition) {
      setVoiceError("Voice input is not supported in this browser. Chrome or Edge works best.");
      return;
    }

    if (recognitionRef.current) {
      return;
    }

    const recognition = new getRecognition();

    recognition.lang = navigator.language || "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setVoiceError("");
      setInterim("");
    };

    recognition.onresult = (event) => {
      let finalText = "";
      let partial = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];

        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          partial += result[0].transcript;
        }
      }

      setInterim(partial);

      if (finalText.trim()) {
        setInterim("");
        onResultRef.current?.(finalText.trim());
      }
    };

    recognition.onerror = (event) => {
      const messages = {
        "not-allowed": "Microphone access was blocked. Allow it in the browser address bar and try again.",
        "service-not-allowed": "Speech recognition is disabled in this browser. Chrome or Edge works best.",
        "audio-capture": "No microphone was found. Check that one is connected and allowed.",
        "no-speech": "I did not hear anything. Click the mic and try again.",
        network: "Speech recognition needs an internet connection for this browser.",
        aborted: "",
      };

      setVoiceError(messages[event.error] ?? `Voice input stopped: ${event.error}`);
      setListening(false);
      setInterim("");
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setListening(false);
      setInterim("");
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setVoiceError("Voice input could not start. Click the mic again.");
    }
  }, []);

  const speak = useCallback(
    (text) => {
      if (!synthesis || muted) {
        return;
      }

      const clean = cleanForSpeech(text);

      if (!clean) {
        return;
      }

      try {
        synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(clean.slice(0, 700));
        const voices = synthesis.getVoices();
        const preferred =
          voices.find((voice) => /^en/i.test(voice.lang) && /google|natural|aria|zira/i.test(voice.name)) ||
          voices.find((voice) => /^en/i.test(voice.lang));

        utterance.rate = 1.02;
        utterance.pitch = 1;

        if (preferred) {
          utterance.voice = preferred;
        }

        synthesis.speak(utterance);
      } catch {
        // speech is an enhancement; never break the chat over it
      }
    },
    [muted]
  );

  useEffect(
    () => () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        // already ended
      }

      stopSpeaking();
    },
    [stopSpeaking]
  );

  return {
    recognitionSupported: Boolean(getRecognition),
    listening,
    interim,
    voiceError,
    muted,
    toggleMuted: () => setMuted((value) => !value),
    start,
    stop,
    speak,
    stopSpeaking,
    dismissVoiceError: () => setVoiceError(""),
  };
}
