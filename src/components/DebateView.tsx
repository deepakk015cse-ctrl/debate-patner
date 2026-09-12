import React, { useState, useRef, useEffect } from 'react';
import { DebateConfig, DebateMessage, DebateSessionData } from '../types';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import {
  Mic,
  MicOff,
  Send,
  Sliders,
  BarChart2,
  User,
  Bot,
  Loader2,
  AlertCircle,
  RefreshCw,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface DebateViewProps {
  config: DebateConfig;
  onFinishDebate: (data: DebateSessionData) => void;
  onBackToSetup: () => void;
  initialSessionData?: DebateSessionData | null;
}

export const DebateView: React.FC<DebateViewProps> = ({
  config,
  onFinishDebate,
  onBackToSetup,
  initialSessionData,
}) => {
  const [currentRound, setCurrentRound] = useState<number>(() => {
    if (initialSessionData && initialSessionData.config.topic === config.topic) {
      const highestRound = Math.max(
        1,
        ...initialSessionData.messages.map((m) => m.round)
      );
      return Math.min(highestRound, config.totalRounds);
    }
    return 1;
  });

  const [inputMessage, setInputMessage] = useState<string>('');
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [isDebateFinished, setIsDebateFinished] = useState<boolean>(false);

  const [messages, setMessages] = useState<DebateMessage[]>(() => {
    if (
      initialSessionData &&
      initialSessionData.config.topic === config.topic &&
      initialSessionData.messages.length > 0
    ) {
      return initialSessionData.messages;
    }
    return [
      {
        id: `sys-init-${Date.now()}`,
        round: 1,
        speaker: 'system',
        text: `Debate commenced on resolution: "${config.topic}". You are defending ${config.userPosition} (Affirmative). Your AI Partner is contesting as ${config.aiPosition} (Opposition). Total debate rounds: ${config.totalRounds}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      {
        id: `ai-intro-${Date.now()}`,
        round: 1,
        speaker: 'ai',
        text: `Welcome to Round 1. I am arguing strictly ${config.aiPosition}. Present your opening proposition or central thesis below to initiate our dialectic exchange.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Speech Recognition Hook
  const {
    state: speechState,
    isListening,
    errorMessage: speechError,
    startListening,
    stopListening,
    resetState: resetSpeechState,
  } = useSpeechRecognition({
    onTranscriptChange: (liveText) => {
      setInputMessage(liveText);
    },
  });

  // Text-to-Speech Hook for AI Partner Responses
  const {
    status: ttsStatus,
    isSpeaking: isAiSpeaking,
    isPaused: isAiPaused,
    isSupported: isTtsSupported,
    errorMessage: ttsError,
    currentText: currentSpeechText,
    speak: speakAiResponse,
    play: playAiSpeech,
    pause: pauseAiSpeech,
    stop: stopAiSpeech,
    replay: replayAiSpeech,
  } = useTextToSpeech();

  // Keep microphone disabled while AI is speaking to prevent acoustic feedback
  useEffect(() => {
    if (isAiSpeaking && isListening) {
      stopListening();
    }
  }, [isAiSpeaking, isListening, stopListening]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGeneratingAi]);

  // Handle User Message Submission & AI Rebuttal Generation
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (isListening) {
      stopListening();
    }

    const trimmed = inputMessage.trim();
    if (!trimmed) {
      return; // Do not automatically submit empty arguments
    }

    if (isGeneratingAi || isDebateFinished) return;

    setEngineError(null);

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userTurn: DebateMessage = {
      id: `user-${Date.now()}`,
      round: currentRound,
      speaker: 'user',
      text: trimmed,
      timestamp: timeStr,
    };

    const newMessages = [...messages, userTurn];
    setMessages(newMessages);
    setInputMessage('');
    setIsGeneratingAi(true);

    try {
      const response = await fetch('/api/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: config.topic,
          userPosition: config.userPosition,
          aiPosition: config.aiPosition,
          currentRound,
          totalRounds: config.totalRounds,
          latestUserArgument: trimmed,
          conversationHistory: newMessages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      const rebuttalText = data.rebuttal?.trim();

      if (!rebuttalText) {
        throw new Error('No rebuttal returned from AI model.');
      }

      const aiTurn: DebateMessage = {
        id: `ai-${Date.now()}`,
        round: currentRound,
        speaker: 'ai',
        text: rebuttalText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const updatedWithAi = [...newMessages, aiTurn];

      // Convert AI response into speech automatically
      speakAiResponse(rebuttalText);

      // Check round progression
      if (currentRound < config.totalRounds) {
        const nextRound = currentRound + 1;
        setCurrentRound(nextRound);

        const nextRoundSystemNotice: DebateMessage = {
          id: `sys-round-${nextRound}-${Date.now()}`,
          round: nextRound,
          speaker: 'system',
          text: `Advanced to Round ${nextRound} of ${config.totalRounds}. Address your opponent's points or introduce your next supporting pillar.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages([...updatedWithAi, nextRoundSystemNotice]);
      } else {
        // Final round completed!
        setIsDebateFinished(true);

        const conclusionNotice: DebateMessage = {
          id: `sys-concluded-${Date.now()}`,
          round: currentRound,
          speaker: 'system',
          text: `Final round completed! All ${config.totalRounds} rounds of debate have concluded. Listen to the AI counterargument or proceed to the Analysis Dashboard whenever you are ready.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        const finalSessionMessages = [...updatedWithAi, conclusionNotice];
        setMessages(finalSessionMessages);
      }
    } catch (err: any) {
      setEngineError(err.message || 'Unable to generate counterargument. Please try again.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleManualConclude = () => {
    stopAiSpeech();
    const sessionData: DebateSessionData = {
      config,
      messages,
      completedAt: new Date().toLocaleString(),
      totalTurnsCompleted: messages.filter(
        (m) => m.speaker === 'user' || m.speaker === 'ai'
      ).length,
    };
    onFinishDebate(sessionData);
  };

  const handleMicToggle = () => {
    // Keep user's microphone disabled while AI is speaking
    if (isAiSpeaking) {
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      resetSpeechState();
      startListening();
      inputRef.current?.focus();
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 sm:py-8 flex flex-col gap-6">
      {/* Top Resolution Header */}
      <section
        id="debate-header-panel"
        className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 flex flex-col gap-4 shadow-xl"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex flex-col gap-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Active Resolution
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                {config.isCustomTopic ? 'Custom Motion' : 'Curated Resolution'}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white leading-snug">
              {config.topic}
            </h1>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <button
              id="debate-reconfigure-btn"
              onClick={onBackToSetup}
              disabled={isGeneratingAi}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-medium border border-slate-700 transition"
              title="Return to Setup"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configure</span>
            </button>

            <button
              id="debate-finish-analysis-btn"
              onClick={handleManualConclude}
              disabled={isGeneratingAi}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-medium transition shadow-sm"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Conclude to Analysis</span>
            </button>
          </div>
        </div>

        {/* Stance & Round Progress Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 items-center">
          {/* User Stance */}
          <div
            id="debate-user-stance-badge"
            className="rounded-xl bg-slate-950/60 border border-slate-800/90 px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">You (Debater)</span>
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    config.userPosition === 'FOR' ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {config.userPosition}
                </span>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                config.userPosition === 'FOR'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              }`}
            >
              {config.userPosition === 'FOR' ? 'Affirmative' : 'Opposition'}
            </span>
          </div>

          {/* AI Opposite Stance */}
          <div
            id="debate-ai-stance-badge"
            className="rounded-xl bg-slate-950/60 border border-slate-800/90 px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">AI Partner</span>
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    config.aiPosition === 'FOR' ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {config.aiPosition}
                </span>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                config.aiPosition === 'FOR'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              }`}
            >
              {config.aiPosition === 'FOR' ? 'Affirmative' : 'Opposition'}
            </span>
          </div>

          {/* Round Indicator */}
          <div
            id="debate-round-indicator"
            className="rounded-xl bg-slate-950/60 border border-slate-800/90 px-4 py-3 flex items-center justify-between"
          >
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Match Status</span>
              <span className="text-xs font-bold text-white">
                Round {currentRound} of {config.totalRounds}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: config.totalRounds }, (_, i) => i + 1).map((r) => (
                <div
                  key={r}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    r === currentRound
                      ? 'bg-blue-400 scale-125 ring-2 ring-blue-500/40 animate-pulse'
                      : r < currentRound
                      ? 'bg-emerald-400'
                      : 'bg-slate-700'
                  }`}
                  title={`Round ${r}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Voice Status & Engine Alerts Bar */}
      {speechState === 'listening' && (
        <div
          id="speech-state-listening"
          className="rounded-xl bg-emerald-950/60 border border-emerald-500/50 p-3.5 flex items-center justify-between text-xs text-emerald-200 animate-pulse"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span>
              <strong>Listening:</strong> Speak your argument aloud. Speech is transcribed in real-time below so you can review and edit before sending.
            </span>
          </div>
          <button
            onClick={stopListening}
            className="px-2.5 py-1 rounded bg-emerald-800/80 hover:bg-emerald-700 text-white font-medium text-xs transition"
          >
            Done Speaking
          </button>
        </div>
      )}

      {isAiSpeaking && (
        <div
          id="mic-disabled-notice"
          className="rounded-xl bg-purple-950/70 border border-purple-500/60 p-3 flex items-center justify-between text-xs text-purple-200"
        >
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-purple-300 animate-pulse shrink-0" />
            <span>
              <strong>AI Partner is speaking:</strong> Microphone is temporarily muted to avoid acoustic feedback.
            </span>
          </div>
          <button
            onClick={stopAiSpeech}
            className="px-2.5 py-1 rounded bg-purple-800/80 hover:bg-purple-700 text-white font-medium text-xs transition"
          >
            Mute AI
          </button>
        </div>
      )}

      {speechState === 'processing' && (
        <div
          id="speech-state-processing"
          className="rounded-xl bg-blue-950/60 border border-blue-500/40 p-3 flex items-center gap-2.5 text-xs text-blue-200"
        >
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          <span>Processing speech recognition output...</span>
        </div>
      )}

      {speechState === 'no-speech' && (
        <div
          id="speech-state-no-speech"
          className="rounded-xl bg-amber-950/60 border border-amber-600/60 p-3 flex items-center justify-between text-xs text-amber-200"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Speech not detected. Please speak closer to your microphone or click to try again.</span>
          </div>
          <button
            onClick={handleMicToggle}
            className="px-2.5 py-1 rounded bg-amber-800/80 hover:bg-amber-700 text-white text-xs font-medium"
          >
            Retry Mic
          </button>
        </div>
      )}

      {speechState === 'permission-denied' && (
        <div
          id="speech-state-permission-denied"
          className="rounded-xl bg-rose-950/60 border border-rose-600/60 p-3 flex items-center justify-between text-xs text-rose-200"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Microphone permission denied. Please allow microphone access in your browser or use typed input.</span>
          </div>
          <button
            onClick={resetSpeechState}
            className="px-2 py-0.5 text-xs text-rose-300 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {speechState === 'error' && (
        <div
          id="speech-state-error"
          className="rounded-xl bg-rose-950/60 border border-rose-600/60 p-3 flex items-center justify-between text-xs text-rose-200"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{speechError || 'Speech recognition encountered an error. You can continue using keyboard input.'}</span>
          </div>
          <button
            onClick={resetSpeechState}
            className="px-2 py-0.5 text-xs text-rose-300 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {engineError && (
        <div
          id="debate-engine-error-alert"
          className="rounded-xl bg-rose-950/70 border border-rose-700 p-3.5 flex items-center justify-between text-xs text-rose-200"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{engineError}</span>
          </div>
          <button
            onClick={() => handleSendMessage()}
            className="px-3 py-1 rounded-lg bg-rose-800 hover:bg-rose-700 text-white font-medium text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Rebuttal</span>
          </button>
        </div>
      )}

      {/* Debate Concluded Transition Banner */}
      {isDebateFinished && (
        <div
          id="debate-concluded-banner"
          className="rounded-2xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-blue-950/80 border border-purple-500/40 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl"
        >
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Debate Match Completed ({config.totalRounds} Rounds)</span>
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              All rounds are complete. Listen to the AI counterargument above or advance to the Argument Analysis Pipeline.
            </p>
          </div>
          <button
            id="proceed-to-analysis-btn"
            onClick={handleManualConclude}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-purple-950/40 flex items-center gap-2 shrink-0 transition"
          >
            <span>Proceed to Analysis</span>
            <BarChart2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Conversation Thread Container */}
      <section
        id="debate-conversation-container"
        className="rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col h-[560px] shadow-lg overflow-hidden"
      >
        {/* Dedicated AI Voice Controls Bar */}
        <div
          id="ai-speech-controls-panel"
          className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              {isAiSpeaking ? (
                <div className="flex items-end gap-0.5 h-3.5 text-purple-400">
                  <span className="w-1 h-2 bg-purple-400 rounded-full animate-bounce" />
                  <span className="w-1 h-3.5 bg-purple-400 rounded-full animate-bounce delay-75" />
                  <span className="w-1 h-2 bg-purple-400 rounded-full animate-bounce delay-150" />
                </div>
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                AI Voice:
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                isAiSpeaking
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 animate-pulse'
                  : isAiPaused
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {isAiSpeaking
                ? 'Speaking aloud...'
                : isAiPaused
                ? 'Paused'
                : ttsStatus === 'stopped'
                ? 'Stopped'
                : 'Ready'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Play / Resume */}
            <button
              id="tts-play-btn"
              type="button"
              onClick={playAiSpeech}
              disabled={isAiSpeaking || !messages.some((m) => m.speaker === 'ai')}
              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 text-xs font-medium flex items-center gap-1 border border-slate-700 transition"
              title="Play or resume AI counterargument speech"
            >
              <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" />
              <span>Play</span>
            </button>

            {/* Pause */}
            <button
              id="tts-pause-btn"
              type="button"
              onClick={pauseAiSpeech}
              disabled={!isAiSpeaking}
              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 text-xs font-medium flex items-center gap-1 border border-slate-700 transition"
              title="Pause AI speech"
            >
              <Pause className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>Pause</span>
            </button>

            {/* Stop */}
            <button
              id="tts-stop-btn"
              type="button"
              onClick={stopAiSpeech}
              disabled={!isAiSpeaking && !isAiPaused}
              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 text-xs font-medium flex items-center gap-1 border border-slate-700 transition"
              title="Stop AI speech"
            >
              <Square className="w-3 h-3 text-rose-400 fill-rose-400" />
              <span>Stop</span>
            </button>

            {/* Replay */}
            <button
              id="tts-replay-btn"
              type="button"
              onClick={replayAiSpeech}
              disabled={!messages.some((m) => m.speaker === 'ai')}
              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 text-xs font-medium flex items-center gap-1 border border-slate-700 transition"
              title="Replay latest AI counterargument from beginning"
            >
              <RotateCcw className="w-3 h-3 text-blue-400" />
              <span>Replay</span>
            </button>
          </div>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
          {messages.map((msg) => {
            if (msg.speaker === 'system') {
              return (
                <div
                  key={msg.id}
                  className="mx-auto my-1 max-w-lg text-center px-4 py-2 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-normal"
                >
                  {msg.text}
                </div>
              );
            }

            const isUser = msg.speaker === 'user';
            const isThisSpeaking = !isUser && isAiSpeaking && currentSpeechText === msg.text;

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 max-w-[88%] sm:max-w-[78%] ${
                  isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Speaker Avatar */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold ${
                    isUser
                      ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400/40'
                      : 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400/40'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`rounded-2xl p-4 text-sm leading-relaxed border ${
                    isUser
                      ? 'bg-blue-600/15 border-blue-500/40 text-slate-100 rounded-tr-none'
                      : isThisSpeaking
                      ? 'bg-purple-950/40 border-purple-500/70 text-slate-200 rounded-tl-none ring-1 ring-purple-500/30'
                      : 'bg-slate-800/85 border-slate-700 text-slate-200 rounded-tl-none'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1.5 pb-1 border-b border-slate-700/40 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      {isUser
                        ? `You (${config.userPosition} • Round ${msg.round})`
                        : `AI Partner (${config.aiPosition} • Round ${msg.round})`}
                    </span>
                    <div className="flex items-center gap-2">
                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => speakAiResponse(msg.text)}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition ${
                            isThisSpeaking
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-700/80 hover:bg-slate-600 text-slate-300 hover:text-white'
                          }`}
                          title="Listen to this rebuttal in voice"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>{isThisSpeaking ? 'Playing' : 'Listen'}</span>
                        </button>
                      )}
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            );
          })}

          {/* AI Generating Thought/Rebuttal Indicator */}
          {isGeneratingAi && (
            <div className="flex items-start gap-3 max-w-[85%] sm:max-w-[75%] mr-auto">
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="rounded-2xl p-4 text-sm bg-slate-800/70 border border-slate-700/80 text-slate-300 rounded-tl-none flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span>AI Partner is formulating counterargument for Round {currentRound}...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar with Real Speech Recognition & Typing Fallback */}
        <form
          onSubmit={handleSendMessage}
          id="debate-input-form"
          className="border-t border-slate-800 bg-slate-950/90 p-3 sm:p-4 flex flex-col gap-2"
        >
          {/* Recognized text review notice if user just spoke */}
          {isListening && (
            <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 px-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Transcribing speech into input field. Review or edit anytime before sending.</span>
            </div>
          )}

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Real Microphone Input Button */}
            <button
              id="debate-microphone-btn"
              type="button"
              onClick={handleMicToggle}
              disabled={isGeneratingAi || isDebateFinished || isAiSpeaking}
              aria-label={
                isAiSpeaking
                  ? 'Microphone muted while AI partner speaks'
                  : isListening
                  ? 'Stop recording speech'
                  : 'Start microphone speech input'
              }
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isAiSpeaking
                  ? 'bg-slate-800/60 border border-slate-700/50 text-slate-500 cursor-not-allowed opacity-60'
                  : isListening
                  ? 'bg-rose-600 text-white ring-4 ring-rose-500/30 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white'
              }`}
              title={
                isAiSpeaking
                  ? 'Microphone temporarily muted while AI speaks to avoid feedback'
                  : isListening
                  ? 'Click to stop voice recording'
                  : 'Click to speak your argument (Voice speech-to-text)'
              }
            >
              {isListening ? (
                <MicOff className="w-5 h-5 text-white" />
              ) : (
                <Mic
                  className={`w-5 h-5 ${
                    isAiSpeaking ? 'text-slate-500' : 'text-blue-400'
                  }`}
                />
              )}
            </button>

            {/* Argument Text Input (allows reviewing and editing recognized text) */}
            <input
              ref={inputRef}
              id="debate-message-input"
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isGeneratingAi || isDebateFinished}
              placeholder={
                isDebateFinished
                  ? 'Debate concluded. Ready for Analysis Dashboard...'
                  : isAiSpeaking
                  ? 'AI partner speaking counterargument... Review or type your rebuttal...'
                  : isListening
                  ? 'Listening to speech...'
                  : `Type or speak your Round ${currentRound} argument (${config.userPosition})...`
              }
              className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />

            {/* Send Argument Button */}
            <button
              id="debate-send-btn"
              type="submit"
              disabled={!inputMessage.trim() || isGeneratingAi || isDebateFinished}
              className="w-11 h-11 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-md shadow-blue-900/20"
              title="Submit argument"
            >
              {isGeneratingAi ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
            <span>Voice Speech-to-Text active &bull; Press Enter or Send to submit argument</span>
            <span>Round {currentRound} of {config.totalRounds}</span>
          </div>
        </form>
      </section>
    </div>
  );
};
