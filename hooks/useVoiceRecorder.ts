"use client";

import { useState, useRef, useCallback } from "react";

interface UseVoiceRecorderReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string>;
  error: string | null;
}

export default function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Check which mimeType is supported
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

      const options: MediaRecorderOptions = {};
      if (mimeType) options.mimeType = mimeType;

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      // Record in 250ms chunks for reliability
      mediaRecorder.start(250);
      setIsRecording(true);
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError(
          "Microphone access denied. Please enable it in your browser settings."
        );
      } else {
        setError("Could not access microphone.");
      }
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        setIsRecording(false);
        resolve("");
        return;
      }

      mediaRecorder.onstop = async () => {
        // Stop all tracks to release the microphone
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);

        if (chunksRef.current.length === 0) {
          setError("No audio was captured. Please try again.");
          resolve("");
          return;
        }

        const audioBlob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });

        if (audioBlob.size < 100) {
          setError("Recording was too short. Please try again.");
          resolve("");
          return;
        }

        // Send to our STT API route
        try {
          const formData = new FormData();
          formData.append("file", audioBlob, "recording.webm");

          const response = await fetch("/api/speech-to-text", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            console.error("STT response error:", errData);
            throw new Error(errData.error || "STT request failed");
          }

          const data = await response.json();
          const text = data.text?.trim() || "";

          if (!text) {
            setError(
              "I didn't catch that. Please speak clearly and try again."
            );
            resolve("");
            return;
          }

          resolve(text);
        } catch (err) {
          console.error("STT fetch error:", err);
          setError("Could not transcribe audio. Please try again.");
          resolve("");
        }
      };

      mediaRecorder.stop();
    });
  }, []);

  return { isRecording, startRecording, stopRecording, error };
}
