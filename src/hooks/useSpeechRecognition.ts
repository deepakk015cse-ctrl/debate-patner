import { useState, useEffect, useRef, useCallback } from 'react';
import { SpeechRecognitionState } from '../types';

interface UseSpeechRecognitionOptions {
  onTranscriptChange?: (transcript: string) => void;
  lang?: string;
}

export function useSpeechRecognition({
  onTranscriptChange,
  lang = 'en-US',
}: UseSpeechRecognitionOptions = {}) {
  const [state, setState] = useState<SpeechRecognitionState>('ready');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);

  const isSupported =
    typeof window !== 'undefined' &&
    Boolean(
      (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition
    );

  useEffect(() => {
    if (!isSupported) {
      setState('unsupported');
      return;
    }

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => {
      isListeningRef.current = true;
      setState('listening');
      setErrorMessage('');
      setInterimTranscript('');
    };

    recognition.onsoundstart = () => {
      if (isListeningRef.current) {
        setState('listening');
      }
    };

    recognition.onspeechend = () => {
      if (isListeningRef.current) {
        setState('processing');
      }
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let currentInterim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          currentInterim += result[0].transcript;
        }
      }

      setInterimTranscript(currentInterim);

      const captured = (finalTranscript || currentInterim).trim();
      if (captured && onTranscriptChange) {
        onTranscriptChange(captured);
      }
    };

    recognition.onerror = (event: any) => {
      isListeningRef.current = false;
      const errorCode = event.error;

      if (errorCode === 'not-allowed' || errorCode === 'service-not-allowed') {
        setState('permission-denied');
        setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser.');
      } else if (errorCode === 'no-speech') {
        setState('no-speech');
        setErrorMessage('Speech not detected. Please try speaking closer to your microphone.');
      } else {
        setState('error');
        setErrorMessage(`Recognition error (${errorCode}). You can continue using typed input.`);
      }
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      setState((prev) => {
        if (prev === 'listening' || prev === 'processing') {
          return 'ready';
        }
        return prev;
      });
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch {
        // ignore cleanup abort errors
      }
    };
  }, [isSupported, lang, onTranscriptChange]);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setState('unsupported');
      setErrorMessage('Speech recognition is not supported in this browser. Please use keyboard input.');
      return;
    }

    if (isListeningRef.current) {
      stopListening();
      return;
    }

    setErrorMessage('');
    setInterimTranscript('');

    // Pre-flight microphone permission check for clean browser error messaging
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately release stream tracks - SpeechRecognition handles its own audio
        stream.getTracks().forEach((track) => track.stop());
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setState('permission-denied');
          setErrorMessage('Microphone permission denied. Please allow microphone access in your browser settings.');
          return;
        }
      }
    }

    try {
      recognitionRef.current?.start();
    } catch (err: any) {
      // If already started or aborting
      try {
        recognitionRef.current?.abort();
        setTimeout(() => {
          recognitionRef.current?.start();
        }, 100);
      } catch (e: any) {
        setState('error');
        setErrorMessage('Unable to activate speech recognition. Please type your argument.');
      }
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      setState('processing');
      try {
        recognitionRef.current.stop();
      } catch {
        recognitionRef.current.abort();
      }
    }
    isListeningRef.current = false;
  }, []);

  const resetState = useCallback(() => {
    setState('ready');
    setErrorMessage('');
    setInterimTranscript('');
  }, []);

  return {
    state,
    isListening: state === 'listening',
    isSupported,
    errorMessage,
    interimTranscript,
    startListening,
    stopListening,
    resetState,
  };
}
