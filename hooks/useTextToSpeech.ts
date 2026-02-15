"use client";

import { useState, useRef, useCallback } from "react";

interface UseTextToSpeechReturn {
  isSpeaking: boolean;
  speak: (text: string) => Promise<void>;
  stop: () => void;
}

/**
 * Converts text with prices and markdown into speech-friendly plain text.
 * E.g. "$5.00" → "5 dollars", "$4.50" → "4 dollars and 50 cents"
 * Also strips markdown bold markers (**text**).
 */
function sanitizeForSpeech(text: string): string {
  let cleaned = text;

  // Strip markdown bold markers
  cleaned = cleaned.replace(/\*\*/g, "");

  // Convert prices: $X.00 → "X dollars", $X.YZ → "X dollars and YZ cents"
  cleaned = cleaned.replace(/\$(\d+)\.(\d{2})/g, (_match, dollars, cents) => {
    const d = parseInt(dollars, 10);
    const c = parseInt(cents, 10);
    if (c === 0) {
      return `${d} dollar${d !== 1 ? "s" : ""}`;
    }
    return `${d} dollar${d !== 1 ? "s" : ""} and ${c} cent${c !== 1 ? "s" : ""}`;
  });

  // Convert any remaining $X format without cents
  cleaned = cleaned.replace(/\$(\d+)/g, (_match, dollars) => {
    const d = parseInt(dollars, 10);
    return `${d} dollar${d !== 1 ? "s" : ""}`;
  });

  // Convert "12oz" / "16oz" → "12 ounce" / "16 ounce"
  cleaned = cleaned.replace(/(\d+)\s*oz\b/gi, "$1 ounce");

  // Convert standalone "oz" → "ounces"
  cleaned = cleaned.replace(/\boz\b/gi, "ounces");

  // Convert "#5" → "number 5" (order numbers)
  cleaned = cleaned.replace(/#(\d+)/g, "number $1");

  // Clean up markdown list markers at the start of lines
  cleaned = cleaned.replace(/^- /gm, "");

  // Replace # headers with plain text
  cleaned = cleaned.replace(/^#{1,3}\s*/gm, "");

  // Add cheerful tone tag for ElevenLabs v3 expressive model
  cleaned = "[cheerfully] " + cleaned;

  return cleaned;
}

export default function useTextToSpeech(): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      // Stop any current speech
      stop();

      try {
        const speechText = sanitizeForSpeech(text);

        const response = await fetch("/api/text-to-speech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: speechText }),
        });

        if (!response.ok) {
          console.error("TTS request failed");
          return;
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        setIsSpeaking(true);

        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };

        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };

        await audio.play();
      } catch {
        setIsSpeaking(false);
      }
    },
    [stop]
  );

  return { isSpeaking, speak, stop };
}
