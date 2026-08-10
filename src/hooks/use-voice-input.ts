import * as React from "react";
import { toLatinDigits } from "@/lib/money";

type ResultLike = ArrayLike<{ transcript: string }> & { isFinal?: boolean };

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((event: { resultIndex?: number; results: ArrayLike<ResultLike> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

const MAX_MS = 30_000;

/**
 * Browser-first voice capture with graceful fallback to typing.
 * Recording stops ONLY on manual stop or the 30s cap; short pauses keep it alive.
 * Raw audio is never captured, stored or uploaded.
 */
export function useVoiceInput(onTranscript: (text: string) => void) {
  const [supported, setSupported] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const [interim, setInterim] = React.useState("");

  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const callbackRef = React.useRef(onTranscript);
  callbackRef.current = onTranscript;

  const activeRef = React.useRef(false);
  const finalRef = React.useRef("");
  const pendingRef = React.useRef("");
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const deliveredRef = React.useRef(false);

  const finish = React.useCallback(() => {
    if (deliveredRef.current) return;
    deliveredRef.current = true;
    activeRef.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setListening(false);
    const text = toLatinDigits(`${finalRef.current} ${pendingRef.current}`).replace(/\s+/g, " ").trim();
    finalRef.current = "";
    pendingRef.current = "";
    setInterim("");
    if (text) callbackRef.current(text);
  }, []);

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
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event) => {
      let pending = "";
      const start = 0;
      let finals = "";
      for (let i = start; i < event.results.length; i++) {
        const r = event.results[i];
        const t = r[0]?.transcript ?? "";
        if (r.isFinal) finals += ` ${t}`;
        else pending += ` ${t}`;
      }
      finalRef.current = finals.trim();
      pendingRef.current = pending.trim();
      setInterim(`${finalRef.current} ${pendingRef.current}`.replace(/\s+/g, " ").trim());
    };

    rec.onerror = () => {
      // transient errors (no-speech / aborted) shouldn't end an active session
    };

    rec.onend = () => {
      if (activeRef.current) {
        // browser cut us off mid-session: keep going
        try {
          rec.start();
          return;
        } catch {
          /* fallthrough to finish */
        }
      }
      finish();
    };

    recognitionRef.current = rec;
    return () => {
      activeRef.current = false;
      rec.onresult = null;
      rec.onend = null;
      rec.onerror = null;
      if (timerRef.current) clearTimeout(timerRef.current);
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    };
  }, [finish]);

  const stop = React.useCallback(() => {
    activeRef.current = false;
    const rec = recognitionRef.current;
    try {
      rec?.stop();
    } catch {
      /* ignore */
    }
    finish();
  }, [finish]);

  const start = React.useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec || activeRef.current) return;
    finalRef.current = "";
    pendingRef.current = "";
    deliveredRef.current = false;
    setInterim("");
    try {
      rec.start();
      activeRef.current = true;
      setListening(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => stop(), MAX_MS);
    } catch {
      activeRef.current = false;
      setListening(false);
    }
  }, [stop]);

  return { supported, listening, interim, start, stop };
}
