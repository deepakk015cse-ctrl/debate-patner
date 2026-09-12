import React, { useState, useMemo, useEffect } from 'react';
import { DebateConfig, DebateSessionData, DebateHistoryItem } from '../types';
import {
  analyzeDebateArguments,
  evaluateArgumentRepetition,
  computeDirectPairCosineSimilarity,
  computeComprehensiveDebateMetrics,
} from '../services/argumentAnalysis';
import { saveDebateRecord } from '../services/historyService';
import {
  BarChart2,
  RotateCcw,
  MessageSquare,
  Sparkles,
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  User,
  Bot,
  Cpu,
  Layers,
  GitMerge,
  Hash,
  Filter,
  BookOpen,
  Activity,
  CheckCircle2,
  Tag,
  SlidersHorizontal,
  ShieldAlert,
  ArrowRightLeft,
  Trophy,
  Award,
  Info,
  History,
  Save,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  ArrowUpRight,
  TrendingUp,
  PieChart,
  Flame,
} from 'lucide-react';

interface AnalysisViewProps {
  config: DebateConfig | null;
  sessionData?: DebateSessionData | null;
  onNewDebate: () => void;
  onReturnToDebate: () => void;
  onGoHome: () => void;
  onNavigateToHistory?: () => void;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({
  config,
  sessionData,
  onNewDebate,
  onReturnToDebate,
  onGoHome,
  onNavigateToHistory,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [showTranscript, setShowTranscript] = useState<boolean>(false);
  const [selectedArgumentIndex, setSelectedArgumentIndex] = useState<number>(0);

  // Configurable Similarity Threshold (default 0.60 / 60%)
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(0.60);

  // Interactive Argument Similarity Simulator
  const [testArgA, setTestArgA] = useState<string>('AI can automate repetitive work.');
  const [testArgB, setTestArgB] = useState<string>(
    'Artificial intelligence can reduce manual repetitive tasks.'
  );
  const [showSimulator, setShowSimulator] = useState<boolean>(false);

  // Save to SQLite status
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const effectiveConfig = sessionData?.config || config;
  const messages = sessionData?.messages || [];

  // Run the Real NLP & ML Argument Analysis Pipeline
  const rawAnalysis = useMemo(() => {
    return analyzeDebateArguments(messages, effectiveConfig?.topic || '');
  }, [messages, effectiveConfig?.topic]);

  // Dynamically recompute argument repetition based on the configurable similarity threshold
  const dynamicPairwiseComparisons = useMemo(() => {
    return evaluateArgumentRepetition(rawAnalysis.processedArguments, similarityThreshold);
  }, [rawAnalysis.processedArguments, similarityThreshold]);

  // Live direct pair simulator comparison
  const testComparison = useMemo(() => {
    if (!testArgA.trim() || !testArgB.trim()) return null;
    return computeDirectPairCosineSimilarity(testArgA, testArgB, similarityThreshold);
  }, [testArgA, testArgB, similarityThreshold]);

  // Compute Comprehensive Project-Defined Metrics (Relevance, Consistency, Diversity, Repetition)
  const metrics = useMemo(() => {
    return computeComprehensiveDebateMetrics(
      rawAnalysis,
      effectiveConfig || {
        topic: 'Debate Resolution',
        userPosition: 'FOR',
        totalRounds: 3,
      },
      similarityThreshold
    );
  }, [rawAnalysis, effectiveConfig, similarityThreshold]);

  // Automatically save finished debates to SQLite History once when loaded
  useEffect(() => {
    if (messages.length > 0 && effectiveConfig) {
      const themes =
        rawAnalysis.clustering.status === 'success'
          ? rawAnalysis.clustering.clusters.map((c) => c.themeLabel)
          : ['General Motion'];

      const historyRecord: DebateHistoryItem = {
        id: `deb-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        createdAt: sessionData?.completedAt || new Date().toISOString(),
        topic: effectiveConfig.topic,
        userPosition: effectiveConfig.userPosition,
        aiPosition: effectiveConfig.aiPosition,
        rounds: effectiveConfig.totalRounds || Math.max(1, rawAnalysis.processedArguments.length),
        overallScore: metrics.overallScore,
        mainThemes: themes,
        repeatedArgumentsCount: metrics.repeatedArgumentsCount,
        metrics,
        messages,
      };

      // Persist quietly in the background
      saveDebateRecord(historyRecord).catch(() => {});
    }
  }, [effectiveConfig?.topic]); // Trigger once per unique topic load

  const handleManualSaveToHistory = async () => {
    if (!effectiveConfig) return;
    setSaveStatus('saving');
    try {
      const themes =
        rawAnalysis.clustering.status === 'success'
          ? rawAnalysis.clustering.clusters.map((c) => c.themeLabel)
          : ['General Motion'];

      const historyRecord: DebateHistoryItem = {
        id: `deb-${Date.now()}`,
        createdAt: new Date().toISOString(),
        topic: effectiveConfig.topic,
        userPosition: effectiveConfig.userPosition,
        aiPosition: effectiveConfig.aiPosition,
        rounds: effectiveConfig.totalRounds || Math.max(1, rawAnalysis.processedArguments.length),
        overallScore: metrics.overallScore,
        mainThemes: themes,
        repeatedArgumentsCount: metrics.repeatedArgumentsCount,
        metrics,
        messages,
      };

      const ok = await saveDebateRecord(historyRecord);
      setSaveStatus(ok ? 'saved' : 'error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleCopyTranscript = () => {
    if (!messages.length) return;
    const textToCopy = messages
      .map(
        (m) =>
          `[${m.timestamp}] Round ${m.round} - ${
            m.speaker === 'user'
              ? `Debater (${effectiveConfig?.userPosition})`
              : m.speaker === 'ai'
              ? `AI Partner (${effectiveConfig?.aiPosition})`
              : 'SYSTEM'
          }:\n${m.text}\n`
      )
      .join('\n');

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedProcessedArg =
    rawAnalysis.processedArguments[selectedArgumentIndex] || rawAnalysis.processedArguments[0];

  const getScoreBadgeColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40';
    if (score >= 70) return 'text-blue-400 border-blue-500/30 bg-blue-950/40';
    if (score >= 60) return 'text-amber-400 border-amber-500/30 bg-amber-950/40';
    return 'text-rose-400 border-rose-500/30 bg-rose-950/40';
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 sm:py-10 flex flex-col gap-8">
      {/* Dashboard Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800/40 text-blue-300 text-xs font-medium mb-2">
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Debate Evaluation & Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Debate Analysis Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Resolution: <span className="text-slate-200 font-medium">"{effectiveConfig?.topic}"</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Save to SQLite button */}
          <button
            id="analysis-save-db-btn"
            onClick={handleManualSaveToHistory}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-medium text-slate-200 hover:bg-slate-800 transition"
          >
            {saveStatus === 'saved' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Saved to SQLite</span>
              </>
            ) : saveStatus === 'saving' ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-blue-400" />
                <span>Save to History</span>
              </>
            )}
          </button>

          {onNavigateToHistory && (
            <button
              id="analysis-view-history-btn"
              onClick={onNavigateToHistory}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-medium text-slate-200 hover:bg-slate-800 transition"
            >
              <History className="w-3.5 h-3.5 text-purple-400" />
              <span>Debate History</span>
            </button>
          )}

          <button
            id="analysis-new-debate-btn"
            onClick={onNewDebate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Debate</span>
          </button>
        </div>
      </div>

      {/* REQUIREMENT 1: Overall Project-Defined Score */}
      <section
        id="section-overall-score"
        className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800 p-6 sm:p-8 shadow-xl flex flex-col gap-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                1. Overall Project-Defined Score
              </span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                {metrics.overallScore}
                <span className="text-xl sm:text-2xl text-slate-500 font-normal"> / 100</span>
              </span>
              <span
                className={`px-3 py-1 rounded-xl text-xs font-bold border ${getScoreBadgeColor(
                  metrics.overallScore
                )}`}
              >
                {metrics.scoreBand}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              Composite rhetorical score synthesized from your actual argument feature representations.
            </p>
          </div>

          {/* 4 Score Pillar Gauges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Relevance */}
            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3 flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Relevance</span>
                <span className="text-blue-400 font-bold">{metrics.relevanceScore}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${metrics.relevanceScore}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500">Weight: 35%</span>
            </div>

            {/* Consistency */}
            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3 flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Consistency</span>
                <span className="text-emerald-400 font-bold">{metrics.consistencyScore}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${metrics.consistencyScore}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500">Weight: 25%</span>
            </div>

            {/* Diversity */}
            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3 flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Diversity</span>
                <span className="text-purple-400 font-bold">{metrics.diversityScore}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${metrics.diversityScore}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500">Weight: 25%</span>
            </div>

            {/* Repetition Discipline */}
            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3 flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Freshness</span>
                <span className="text-amber-400 font-bold">{metrics.repetitionScore}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${metrics.repetitionScore}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500">Weight: 15%</span>
            </div>
          </div>
        </div>

        {/* Disclaimer Note (Strict Requirement: Do not claim this is scientifically validated) */}
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-400">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-slate-200">Project-Defined Scoring Model:</strong> This metric is
            computed purely through mathematical feature modeling: Motion Relevance (35%), Thematic
            Consistency (25%), Cluster Diversity (25%), and Repetition Discipline (15%). It is an automated
            educational benchmark, not an accredited collegiate judging standard.
          </span>
        </div>
      </section>

      {/* REQUIREMENT 2: Debate Statistics */}
      <section id="section-debate-statistics" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            2. Debate Statistics
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* Total Rounds */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 flex flex-col gap-1">
            <span className="text-xs text-slate-400">Total Rounds</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-white">{metrics.totalRounds}</span>
              <span className="text-xs text-slate-500">rounds</span>
            </div>
          </div>

          {/* Total User Arguments */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 flex flex-col gap-1">
            <span className="text-xs text-slate-400">User Arguments</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-blue-400">{metrics.totalUserArguments}</span>
              <span className="text-xs text-slate-500">turns</span>
            </div>
          </div>

          {/* Unique Arguments */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 flex flex-col gap-1">
            <span className="text-xs text-slate-400">Unique Arguments</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-emerald-400">{metrics.uniqueArgumentsCount}</span>
              <span className="text-xs text-slate-500">distinct</span>
            </div>
          </div>

          {/* Potentially Repeated Arguments */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 flex flex-col gap-1">
            <span className="text-xs text-slate-400">Repeated Arguments</span>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-2xl font-bold ${
                  metrics.repeatedArgumentsCount > 0 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {metrics.repeatedArgumentsCount}
              </span>
              <span className="text-xs text-slate-500">flagged</span>
            </div>
          </div>

          {/* Discovered Themes */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 flex flex-col gap-1 col-span-2 sm:col-span-1">
            <span className="text-xs text-slate-400">Discovered Themes</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-purple-400">{metrics.discoveredThemesCount}</span>
              <span className="text-xs text-slate-500">clusters</span>
            </div>
          </div>
        </div>
      </section>

      {/* REQUIREMENT 10: Debate Summary */}
      <section
        id="section-debate-summary"
        className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 flex flex-col gap-3 shadow-lg"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            10. Debate Summary
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{metrics.summary}</p>
      </section>

      {/* REQUIREMENTS 8 & 9: Strengths & Improvements */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* REQUIREMENT 8: Strengths */}
        <div
          id="section-strengths"
          className="rounded-2xl bg-slate-900/90 border border-emerald-900/40 p-6 flex flex-col gap-4 shadow-lg"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-300">
              8. Detected Strengths
            </h2>
          </div>
          <div className="flex flex-col gap-2.5">
            {metrics.strengths.map((st, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/30 text-xs text-slate-300"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{st}</span>
              </div>
            ))}
          </div>
        </div>

        {/* REQUIREMENT 9: Improvements */}
        <div
          id="section-improvements"
          className="rounded-2xl bg-slate-900/90 border border-amber-900/40 p-6 flex flex-col gap-4 shadow-lg"
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-300">
              9. Constructive Suggestions
            </h2>
          </div>
          <div className="flex flex-col gap-2.5">
            {metrics.improvements.map((imp, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-950/20 border border-amber-900/30 text-xs text-slate-300"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>{imp}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REQUIREMENTS 5, 6, 7: Argument Diversity, Consistency, & Relevance Detailed Metrics */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* REQUIREMENT 7: Relevance */}
        <div
          id="section-relevance"
          className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 flex flex-col gap-3 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              7. Topic Relevance
            </span>
            <span className="text-lg font-bold text-blue-400">{metrics.relevanceScore}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${metrics.relevanceScore}%` }}
            />
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex flex-col gap-1">
            <span className="font-semibold text-slate-300 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-blue-400" />
              <span>Calculation Method:</span>
            </span>
            <p className="text-[11px] leading-relaxed">
              Calculated by vectorizing your arguments in TF-IDF space and calculating the mean cosine
              similarity against the normalized canonical keywords of the debate motion resolution.
            </p>
          </div>
        </div>

        {/* REQUIREMENT 6: Consistency */}
        <div
          id="section-consistency"
          className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 flex flex-col gap-3 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              6. Position Consistency
            </span>
            <span className="text-lg font-bold text-emerald-400">{metrics.consistencyScore}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${metrics.consistencyScore}%` }}
            />
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex flex-col gap-1">
            <span className="font-semibold text-slate-300 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-emerald-400" />
              <span>Calculation Method:</span>
            </span>
            <p className="text-[11px] leading-relaxed">
              Transparent project-defined metric: measures topical continuity across consecutive turns and
              thesis anchoring. (Note: Heuristic metric, not an accredited debating credential).
            </p>
          </div>
        </div>

        {/* REQUIREMENT 5: Argument Diversity */}
        <div
          id="section-diversity"
          className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 flex flex-col gap-3 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              5. Argument Diversity
            </span>
            <span className="text-lg font-bold text-purple-400">{metrics.diversityScore}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-purple-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${metrics.diversityScore}%` }}
            />
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex flex-col gap-1">
            <span className="font-semibold text-slate-300 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-purple-400" />
              <span>Calculation Method:</span>
            </span>
            <p className="text-[11px] leading-relaxed">
              Estimated from the distribution and count of discovered K-Means clusters combined with
              vocabulary richness (ratio of distinct canonical lemmas to total tokens).
            </p>
          </div>
        </div>
      </section>

      {/* REQUIREMENT 3: Argument Themes (K-Means Clusters) */}
      <section
        id="section-argument-themes"
        className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 flex flex-col gap-5 shadow-lg"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                3. Argument Themes (K-Means Clustering)
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Partitions your arguments into thematic clusters using TF-IDF feature centroids.
            </p>
          </div>
          <div className="px-3 py-1 rounded-xl bg-purple-950/40 border border-purple-800/30 text-purple-300 text-xs font-medium self-start sm:self-auto">
            k = {rawAnalysis.clustering.k} Clusters
          </div>
        </div>

        {rawAnalysis.clustering.status === 'insufficient_data' ? (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{rawAnalysis.clustering.message}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rawAnalysis.clustering.clusters.map((cluster) => (
              <div
                key={cluster.id}
                id={`cluster-card-${cluster.id}`}
                className="rounded-xl bg-slate-950/70 border border-slate-800 p-4 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-purple-900/40 text-purple-300 flex items-center justify-center font-bold text-xs">
                      {cluster.id}
                    </span>
                    <h3 className="text-sm font-semibold text-white">{cluster.themeLabel}</h3>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-950 border border-purple-800/30 text-purple-300 font-medium">
                    {cluster.assignedArguments.length} argument
                    {cluster.assignedArguments.length === 1 ? '' : 's'}
                  </span>
                </div>

                {/* Representative Terms */}
                <div className="flex flex-col gap-1 text-xs">
                  <span className="text-slate-400 font-medium">Representative Terms:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {cluster.representativeTerms.map((term, tIdx) => (
                      <span
                        key={tIdx}
                        className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 text-[11px] font-mono"
                      >
                        {term.term} ({(term.weight * 10).toFixed(1)})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Assigned Arguments */}
                <div className="flex flex-col gap-1.5 text-xs pt-2 border-t border-slate-800/80">
                  <span className="text-slate-400 font-medium">Assigned Arguments:</span>
                  <div className="flex flex-col gap-1.5">
                    {cluster.assignedArguments.map((arg) => (
                      <div
                        key={arg.id}
                        className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-[11px] italic"
                      >
                        <span className="font-bold text-slate-400 not-italic mr-1.5">
                          Round {arg.round}:
                        </span>
                        "{arg.rawText}"
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* REQUIREMENT 4: Repetition Analysis (Pairwise Cosine Similarity) */}
      <section
        id="section-repetition-analysis"
        className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 flex flex-col gap-5 shadow-lg"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                4. Repetition Analysis (Pairwise Cosine Similarity)
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Evaluates overall vector overlap between your turns to detect semantically repeated ideas.
            </p>
          </div>

          {/* Threshold Control */}
          <div className="flex items-center gap-3 bg-slate-950/70 border border-slate-800 px-3.5 py-2 rounded-xl">
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs text-slate-400 font-medium">Threshold:</span>
            <input
              id="similarity-threshold-slider"
              type="range"
              min="0.30"
              max="0.90"
              step="0.05"
              value={similarityThreshold}
              onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
              className="w-24 accent-blue-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-blue-400 w-9 text-right font-mono">
              {Math.round(similarityThreshold * 100)}%
            </span>
          </div>
        </div>

        {/* Pairwise Comparisons Table/Cards */}
        {dynamicPairwiseComparisons.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-3">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              {rawAnalysis.processedArguments.length < 2
                ? 'Only 1 argument submitted so far. Complete at least 2 debate rounds to perform pairwise repetition comparison.'
                : 'No pairwise comparisons available.'}
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {dynamicPairwiseComparisons.map((pair, idx) => (
              <div
                key={idx}
                id={`pair-comparison-${idx}`}
                className={`p-4 rounded-xl border flex flex-col gap-2.5 transition ${
                  pair.isRepeated
                    ? 'bg-amber-950/20 border-amber-800/40'
                    : 'bg-slate-950/60 border-slate-800/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-white">
                      Round {pair.argumentA.round} vs Round {pair.argumentB.round}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="font-mono text-slate-300">
                      Similarity: {(pair.similarityScore * 100).toFixed(1)}%
                    </span>
                  </div>

                  {/* Clearly label as Potential Repetition or Distinct */}
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      pair.isRepeated
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                        : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    }`}
                  >
                    {pair.isRepeated ? 'Potential Repetition' : 'Distinct Argument'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400 italic">
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <strong className="not-italic text-slate-300 block mb-0.5">
                      Round {pair.argumentA.round}:
                    </strong>
                    "{pair.argumentA.text}"
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <strong className="not-italic text-slate-300 block mb-0.5">
                      Round {pair.argumentB.round}:
                    </strong>
                    "{pair.argumentB.text}"
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Interactive Cosine Similarity Tester Toggle */}
        <div className="pt-2 border-t border-slate-800 flex flex-col gap-3">
          <button
            onClick={() => setShowSimulator(!showSimulator)}
            className="flex items-center justify-between text-xs text-slate-400 hover:text-white font-medium p-2 rounded-xl hover:bg-slate-800/60 transition"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Interactive Cosine Similarity Tester</span>
            </span>
            {showSimulator ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showSimulator && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">
                    Argument A:
                  </label>
                  <textarea
                    rows={2}
                    value={testArgA}
                    onChange={(e) => setTestArgA(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">
                    Argument B:
                  </label>
                  <textarea
                    rows={2}
                    value={testArgB}
                    onChange={(e) => setTestArgB(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {testComparison && (
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Calculated Cosine Similarity:</span>
                    <span className="font-bold font-mono text-white">
                      {(testComparison.similarityScore * 100).toFixed(1)}%
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      testComparison.isRepeated
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                        : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    }`}
                  >
                    {testComparison.statusLabel}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Preserved Feature: NLP Feature & Token Pipeline Inspection */}
      {rawAnalysis.processedArguments.length > 0 && (
        <section className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 flex flex-col gap-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                TF-IDF Feature Pipeline & Lemma Inspection
              </h2>
            </div>
            {rawAnalysis.processedArguments.length > 1 && (
              <div className="flex items-center gap-1.5">
                {rawAnalysis.processedArguments.map((arg, idx) => (
                  <button
                    key={arg.id}
                    onClick={() => setSelectedArgumentIndex(idx)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      selectedArgumentIndex === idx
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Round {arg.round}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedProcessedArg && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-1.5">
                <span className="text-slate-400 font-medium">Filtered Lemmas:</span>
                <div className="flex flex-wrap gap-1">
                  {selectedProcessedArg.lemmas.map((l, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]"
                    >
                      {l}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-slate-400 font-medium">Top TF-IDF Keywords:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedProcessedArg.topKeywords.map((kw, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded bg-blue-950/50 border border-blue-800/40 text-blue-300 font-mono text-[11px]"
                    >
                      {kw.term} ({kw.weight.toFixed(3)})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Preserved Feature: Debate Transcript View */}
      <section className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 flex flex-col gap-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Debate Transcript
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyTranscript}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition"
            >
              <span>{showTranscript ? 'Hide' : 'Show'}</span>
              {showTranscript ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {showTranscript && (
          <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No transcript recorded.</p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                    m.speaker === 'user'
                      ? 'bg-blue-950/20 border-blue-900/40 text-blue-100 ml-4'
                      : m.speaker === 'ai'
                      ? 'bg-slate-950/70 border-slate-800 text-slate-200 mr-4'
                      : 'bg-slate-900/40 border-slate-800/60 text-slate-400 italic text-center'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="font-semibold text-slate-300">
                      {m.speaker === 'user'
                        ? `You (Debater - ${effectiveConfig?.userPosition})`
                        : m.speaker === 'ai'
                        ? `AI Partner (${effectiveConfig?.aiPosition})`
                        : 'Debate Moderator'}
                    </span>
                    <span>
                      Round {m.round} • {m.timestamp}
                    </span>
                  </div>
                  <p>{m.text}</p>
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
};
