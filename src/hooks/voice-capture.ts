import { toLatinDigits } from "@/lib/money";

export type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};
export function bindVoiceCapture(
  rec: Recognition,
  receive: (text: string) => void,
  preview: (text: string) => void,
  ended: () => void,
) {
  let transcript = "";
  let delivered = false;
  rec.lang = "fa-IR";
  rec.continuous = true;
  rec.interimResults = true;
  rec.onresult = (event) => {
    transcript = Array.from(event.results, (result) => result[0].transcript).join("");
    preview(transcript);
  };
  rec.onerror = ended;
  rec.onend = () => {
    ended();
    if (delivered) return;
    delivered = true;
    const text = toLatinDigits(transcript).trim();
    if (text) receive(text);
    preview("");
  };
  return {
    reset() {
      transcript = "";
      delivered = false;
      preview("");
    },
    dispose() {
      rec.onresult = null;
      rec.onend = null;
      rec.onerror = null;
    },
  };
}
