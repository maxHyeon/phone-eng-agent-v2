import { useState, useRef, useCallback } from "react";
import { transcribeVoice } from "../api/client";

export function useVoiceInput() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  }, []);

  const stop = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) return reject(new Error("No recorder"));

      recorder.onstop = async () => {
        // Stop all tracks
        recorder.stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        setIsTranscribing(true);

        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const text = await transcribeVoice(blob);
          resolve(text);
        } catch (err) {
          reject(err);
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.stop();
    });
  }, []);

  return { isRecording, isTranscribing, start, stop };
}
