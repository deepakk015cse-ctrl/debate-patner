import { useState, useEffect, useRef, useCallback } from 'react';
import { TextToSpeechStatus } from '../types';

export interface UseTextToSpeechReturn {
  status: TextToSpeechStatus;
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  currentText: string | null;
  errorMessage: string | null;
  speak: (text: string) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  replay: () => void;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [status, setStatus] = useState<TextToSpeechStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentText, setCurrentText] = useState<string | null>(null);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isManuallyStoppedRef = useRef<boolean>(false);

  const isSupported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window;

  // Cleanup on unmount: stop any active speech
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const selectVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (!isSupported) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // Prefer high quality English voices
    const preferredNames = ['Google US English', 'Natural', 'Samantha', 'Alex', 'Victoria', 'Daniel', 'Karen'];
    for (const name of preferredNames) {
      const found = voices.find((v) => v.name.includes(name) && v.lang.startsWith('en'));
      if (found) return found;
    }

    // Default to any English voice
    return voices.find((v) => v.lang.startsWith('en')) || voices[0] || null;
  }, [isSupported]);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported) {
        setStatus('unsupported');
        setErrorMessage(
          'Text-to-speech is not supported in this browser. AI response is displayed in text above.'
        );
        return;
      }

      const trimmed = text.trim();
      if (!trimmed) return;

      isManuallyStoppedRef.current = false;
      setCurrentText(trimmed);
      setErrorMessage(null);

      // Cancel any ongoing speech to enforce singleton playback
      try {
        window.speechSynthesis.cancel();
      } catch {
        // safe ignore
      }

      try {
        const utterance = new SpeechSynthesisUtterance(trimmed);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.lang = 'en-US';

        const voice = selectVoice();
        if (voice) {
          utterance.voice = voice;
        }

        utterance.onstart = () => {
          setStatus('playing');
          setErrorMessage(null);
        };

        utterance.onpause = () => {
          setStatus('paused');
        };

        utterance.onresume = () => {
          setStatus('playing');
        };

        utterance.onend = () => {
          setStatus('idle');
          utteranceRef.current = null;
        };

        utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
          // 'canceled', 'interrupted', or browser autoplay 'not-allowed' restrictions
          if (
            event.error === 'canceled' ||
            event.error === 'interrupted' ||
            event.error === 'not-allowed' ||
            isManuallyStoppedRef.current
          ) {
            setStatus('idle');
            return;
          }

          setStatus('idle');
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      } catch {
        setStatus('idle');
      }
    },
    [isSupported, selectVoice]
  );

  const pause = useCallback(() => {
    if (!isSupported) return;
    try {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        setStatus('paused');
      }
    } catch {
      // safe ignore
    }
  }, [isSupported]);

  const play = useCallback(() => {
    if (!isSupported) return;
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setStatus('playing');
        return;
      }

      // If stopped or idle but have text, speak again
      if (currentText) {
        speak(currentText);
      }
    } catch {
      // safe ignore
    }
  }, [isSupported, currentText, speak]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    isManuallyStoppedRef.current = true;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // safe ignore
    }
    setStatus('stopped');
    utteranceRef.current = null;
  }, [isSupported]);

  const replay = useCallback(() => {
    if (currentText) {
      speak(currentText);
    }
  }, [currentText, speak]);

  return {
    status,
    isSpeaking: status === 'playing',
    isPaused: status === 'paused',
    isSupported,
    currentText,
    errorMessage,
    speak,
    play,
    pause,
    stop,
    replay,
  };
}
