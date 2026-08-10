import * as React from "react";
import { toLatinDigits } from "@/lib/money";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

/**
 * Browser-first voice capture with graceful fallback to typing.
 * Transcripts are handed to the SAME slot pipeline as typed text.
 * Raw audio is never captured, stored or uploaded in Phase 1.
 */
export function useVoiceInput(onTranscript: (text: string) => void) {
  const [supported, setSupported] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const [interim, setInterim] = React.useState("");
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const callbackRef = React.useRef(onTranscript);
  callbackRef.current = onTranscript;

  React.useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    setSupported(true);
    const rec = new Ctor();
    rec.lang = "fa-IR";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript;
      setInterim(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => {
      setListening(false);
      setInterim((current) => {
        const cleaned = toLatinDigits(current).trim();
        if (cleaned) callbackRef.current(cleaned);
        return "";
      });
    };
    recognitionRef.current = rec;
    return () => {
      rec.onresult = null;
      rec.onend = null;
      rec.onerror = null;
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    };
  }, []);

  const start = React.useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    setInterim("");
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, []);

  const stop = React.useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return { supported, listening, interim, start, stop };
}
