import React from 'react';
import { ArrowRight, Scale, Mic, ShieldAlert, Sparkles, Sliders, CheckCircle2, MessageSquare, History } from 'lucide-react';

interface HomeViewProps {
  onStartDebate: () => void;
  onNavigateToHistory?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onStartDebate, onNavigateToHistory }) => {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 sm:py-12 flex flex-col gap-12">
      {/* Hero Section */}
      <section className="text-center flex flex-col items-center gap-6 pt-4 sm:pt-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-950/60 border border-blue-800/40 text-blue-300 text-xs sm:text-sm font-medium">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>Next-Generation Dialectic & Argumentation</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white max-w-3xl leading-tight">
          AI Debate Partner
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl leading-relaxed">
          Sharpen your reasoning, challenge your assumptions, and master persuasive rhetoric in structured, real-time debates against an adaptive AI sparring partner.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
          <button
            id="home-start-debate-btn"
            onClick={onStartDebate}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base transition shadow-lg shadow-blue-900/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            <span>Start Debate</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          {onNavigateToHistory && (
            <button
              id="home-history-btn"
              onClick={onNavigateToHistory}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-base border border-slate-800 transition"
            >
              <History className="w-4 h-4 text-purple-400" />
              <span>Debate History</span>
            </button>
          )}
        </div>
      </section>

      {/* Structured Debate Flow Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <div
          id="feature-card-setup"
          className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 flex flex-col gap-3 transition hover:border-slate-700"
        >
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Sliders className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold text-white">1. Configure Your Match</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Pick from curated topics or supply your own resolution. Take the FOR or AGAINST stance, and set round constraints from 3 to 10 rounds.
          </p>
        </div>

        <div
          id="feature-card-live"
          className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 flex flex-col gap-3 transition hover:border-slate-700"
        >
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold text-white">2. Live Structured Sparring</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Engage turn-by-turn with clear position markers, round counters, and ready-to-use text and vocal input placeholders.
          </p>
        </div>

        <div
          id="feature-card-analysis"
          className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 flex flex-col gap-3 transition hover:border-slate-700"
        >
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
            <Scale className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold text-white">3. Rhetorical Analysis</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Review your debate session in a dedicated analysis dashboard designed for upcoming NLP fallacy detection and argumentation scoring.
          </p>
        </div>
      </section>

      {/* Architecture Readiness Banner */}
      <section
        id="home-modularity-banner"
        className="rounded-2xl bg-slate-900/50 border border-slate-800 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Modular Architecture Ready</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Constructed with clean domain boundaries. Ready for subsequent integration of real-time audio streams, Gemini dialectic agents, and NLP argument evaluators.
            </p>
          </div>
        </div>

        <button
          id="home-secondary-setup-btn"
          onClick={onStartDebate}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition shrink-0"
        >
          <span>Configure Match</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>
    </div>
  );
};
