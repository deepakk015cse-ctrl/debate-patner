import React, { useState, useEffect, useCallback } from 'react';
import { DebateHistoryItem, DebateSessionData } from '../types';
import { getDebateHistory, deleteDebateRecord } from '../services/historyService';
import {
  History,
  Search,
  ArrowUpDown,
  Calendar,
  Layers,
  Repeat,
  Trophy,
  ExternalLink,
  Trash2,
  PlusCircle,
  Clock,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Database,
} from 'lucide-react';

interface HistoryViewProps {
  onOpenAnalysis: (sessionData: DebateSessionData) => void;
  onStartNewDebate: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  onOpenAnalysis,
  onStartNewDebate,
}) => {
  const [debates, setDebates] = useState<DebateHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [deletedId, setDeletedId] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDebateHistory(searchTerm, sortBy);
      setDebates(data);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, [searchTerm, sortBy]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setDeletedId(id);
    setConfirmDeleteId(null);
    const success = await deleteDebateRecord(id);
    if (success) {
      setDebates((prev) => prev.filter((d) => d.id !== id));
    }
    setDeletedId(null);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
  };

  const handleSelectDebate = (item: DebateHistoryItem) => {
    const sessionData: DebateSessionData = {
      config: {
        topic: item.topic,
        isCustomTopic: true,
        userPosition: item.userPosition,
        aiPosition: item.aiPosition,
        totalRounds: item.rounds,
      },
      messages: item.messages || [],
      completedAt: item.createdAt,
      totalTurnsCompleted: item.messages ? item.messages.length : item.rounds * 2,
    };
    onOpenAnalysis(sessionData);
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 85) return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300';
    if (score >= 70) return 'bg-blue-500/15 border-blue-500/40 text-blue-300';
    if (score >= 60) return 'bg-amber-500/15 border-amber-500/40 text-amber-300';
    return 'bg-slate-700/40 border-slate-600 text-slate-300';
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const averageScore =
    debates.length > 0
      ? Math.round(debates.reduce((acc, curr) => acc + curr.overallScore, 0) / debates.length)
      : 0;

  const totalRoundsCompleted = debates.reduce((acc, curr) => acc + curr.rounds, 0);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 sm:py-10 flex flex-col gap-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800/40 text-blue-300 text-xs font-medium mb-2">
            <Database className="w-3.5 h-3.5" />
            <span>SQLite Persistent History Database</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Debate History
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Review past dialectical debates, search by resolution, and revisit full argument analysis reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="history-refresh-btn"
            onClick={() => fetchHistory()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-800 transition"
            title="Refresh from SQLite"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            id="history-start-debate-btn"
            onClick={onStartNewDebate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Debate</span>
          </button>
        </div>
      </div>

      {/* Aggregate Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 flex flex-col gap-1">
          <span className="text-xs text-slate-400 font-medium">Debates Stored</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{debates.length}</span>
            <span className="text-xs text-slate-500">records</span>
          </div>
        </div>

        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 flex flex-col gap-1">
          <span className="text-xs text-slate-400 font-medium">Mean Score</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-400">
              {averageScore > 0 ? `${averageScore}` : '--'}
            </span>
            <span className="text-xs text-slate-500">/ 100</span>
          </div>
        </div>

        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 flex flex-col gap-1">
          <span className="text-xs text-slate-400 font-medium">Rounds Debated</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400">{totalRoundsCompleted}</span>
            <span className="text-xs text-slate-500">total turns</span>
          </div>
        </div>

        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 flex flex-col gap-1">
          <span className="text-xs text-slate-400 font-medium">Privacy Status</span>
          <div className="flex items-center gap-1.5 mt-1">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-300 font-medium">Audio Not Stored</span>
          </div>
        </div>
      </div>

      {/* Search & Sort Controls */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 flex flex-col sm:flex-row items-center gap-3 shadow-lg">
        {/* Search input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="history-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search debates by topic or theme keyword..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            id="history-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort debates by"
            className="w-full sm:w-auto px-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="date_desc">Date: Newest First</option>
            <option value="date_asc">Date: Oldest First</option>
            <option value="score_desc">Score: Highest First</option>
            <option value="score_asc">Score: Lowest First</option>
          </select>
        </div>
      </div>

      {/* Debates List */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
          <p className="text-sm">Querying SQLite database...</p>
        </div>
      ) : debates.length === 0 ? (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-12 text-center flex flex-col items-center justify-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
            <History className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">No debates found</h3>
            <p className="text-sm text-slate-400 max-w-md mt-1">
              {searchTerm
                ? `No debate resolution matching "${searchTerm}". Try adjusting your keywords.`
                : 'Complete your first live debate to generate analytical reports stored persistently in SQLite.'}
            </p>
          </div>
          {searchTerm ? (
            <button
              onClick={() => setSearchTerm('')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition"
            >
              Clear Search Filter
            </button>
          ) : (
            <button
              onClick={onStartNewDebate}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/20 transition"
            >
              Start Debate Now
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {debates.map((item) => (
            <article
              key={item.id}
              id={`history-item-${item.id}`}
              className="group rounded-2xl bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 sm:p-6 transition shadow-lg hover:shadow-xl flex flex-col gap-4"
            >
              {/* Top Row: Date, Rounds, Position, Score */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(item.createdAt)}</span>
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{item.rounds} Rounds</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Position badge */}
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                      item.userPosition === 'FOR'
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                        : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    }`}
                  >
                    Argued {item.userPosition}
                  </span>

                  {/* Score badge */}
                  <div
                    className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${getScoreBadgeColor(
                      item.overallScore
                    )}`}
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    <span>{item.overallScore}/100</span>
                  </div>
                </div>
              </div>

              {/* Debate Motion Resolution */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-white group-hover:text-blue-300 transition line-clamp-2">
                  {item.topic}
                </h3>
              </div>

              {/* Thematic Clusters & Repetition Count */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Themes */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-slate-400 font-medium flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    <span>Themes:</span>
                  </span>
                  {item.mainThemes && item.mainThemes.length > 0 ? (
                    item.mainThemes.map((theme, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-lg bg-purple-950/40 border border-purple-800/30 text-purple-300 font-medium"
                      >
                        {theme}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500">General Motion Dialectic</span>
                  )}
                </div>

                {/* Repetition Status */}
                <div className="flex items-center gap-2">
                  {item.repeatedArgumentsCount === 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-950/40 border border-emerald-800/30 text-emerald-300 font-medium">
                      <CheckCircle className="w-3 h-3" />
                      <span>0 Repeated Ideas</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-950/40 border border-amber-800/30 text-amber-300 font-medium">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{item.repeatedArgumentsCount} Potential Repetition</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Actions Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                {confirmDeleteId === item.id ? (
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      disabled={deletedId === item.id}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition"
                    >
                      <span>Confirm Delete</span>
                    </button>
                    <button
                      onClick={handleCancelDelete}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    disabled={deletedId === item.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 text-xs font-medium transition"
                    title="Delete from SQLite history"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}

                <button
                  onClick={() => handleSelectDebate(item)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 hover:text-white text-xs font-semibold transition"
                >
                  <span>Open Analysis Report</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
