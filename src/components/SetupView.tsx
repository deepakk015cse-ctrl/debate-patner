import React, { useState } from 'react';
import { DebateConfig, DebatePosition } from '../types';
import { PRESET_TOPICS } from '../data/topics';
import { Check, Edit3, Layers, Sliders, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';

interface SetupViewProps {
  initialConfig: DebateConfig | null;
  onStartDebate: (config: DebateConfig) => void;
  onCancel: () => void;
}

export const SetupView: React.FC<SetupViewProps> = ({
  initialConfig,
  onStartDebate,
  onCancel,
}) => {
  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    initialConfig && !initialConfig.isCustomTopic
      ? PRESET_TOPICS.find((t) => t.title === initialConfig.topic)?.id || PRESET_TOPICS[0].id
      : PRESET_TOPICS[0].id
  );
  const [isCustom, setIsCustom] = useState<boolean>(initialConfig?.isCustomTopic ?? false);
  const [customTopic, setCustomTopic] = useState<string>(
    initialConfig && initialConfig.isCustomTopic ? initialConfig.topic : ''
  );
  const [userPosition, setUserPosition] = useState<DebatePosition>(
    initialConfig?.userPosition ?? 'FOR'
  );
  const [totalRounds, setTotalRounds] = useState<number>(
    initialConfig?.totalRounds ?? 5
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const aiPosition: DebatePosition = userPosition === 'FOR' ? 'AGAINST' : 'FOR';

  const handlePresetSelect = (id: string) => {
    setSelectedTopicId(id);
    setIsCustom(false);
    setValidationError(null);
  };

  const handleCustomSelect = () => {
    setIsCustom(true);
    setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let finalTopic = '';
    if (isCustom) {
      if (!customTopic.trim()) {
        setValidationError('Please enter a custom debate topic before starting.');
        return;
      }
      finalTopic = customTopic.trim();
    } else {
      const preset = PRESET_TOPICS.find((t) => t.id === selectedTopicId);
      finalTopic = preset ? preset.title : PRESET_TOPICS[0].title;
    }

    const config: DebateConfig = {
      topic: finalTopic,
      isCustomTopic: isCustom,
      userPosition,
      aiPosition,
      totalRounds,
    };

    onStartDebate(config);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <button
            id="setup-back-btn"
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-400 hover:text-white transition mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Debate Setup
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Choose your topic, take your stance, and set round constraints.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        {/* Step 1: Topic Selection */}
        <div id="setup-section-topic" className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">
                1
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Select Debate Topic</h2>
                <p className="text-xs text-slate-400">Choose a curated prompt or input your own proposition</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="topic-toggle-preset"
                onClick={() => setIsCustom(false)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  !isCustom
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                Curated Topics
              </button>
              <button
                type="button"
                id="topic-toggle-custom"
                onClick={handleCustomSelect}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  isCustom
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                Custom Topic
              </button>
            </div>
          </div>

          {!isCustom ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {PRESET_TOPICS.map((topic) => {
                const isSelected = selectedTopicId === topic.id;
                return (
                  <div
                    key={topic.id}
                    id={`topic-option-${topic.id}`}
                    onClick={() => handlePresetSelect(topic.id)}
                    className={`cursor-pointer rounded-xl p-4 border text-left transition flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-blue-950/40 border-blue-500 ring-1 ring-blue-500'
                        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium tracking-wide bg-slate-800 text-slate-300 border border-slate-700">
                        {topic.category}
                      </span>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-100 leading-snug">
                      {topic.title}
                    </p>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {topic.description}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <label htmlFor="custom-topic-input" className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                Enter your resolution or motion:
              </label>
              <textarea
                id="custom-topic-input"
                rows={3}
                value={customTopic}
                onChange={(e) => {
                  setCustomTopic(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="e.g., Space exploration should be prioritized over deep-sea research..."
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              <p className="text-xs text-slate-400">
                Framing tip: State the motion as a definitive affirmative assertion for optimal dialectic opposition.
              </p>
            </div>
          )}
        </div>

        {/* Step 2: Position Selection */}
        <div id="setup-section-position" className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 flex flex-col gap-5">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">
              2
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Choose Your Stance</h2>
              <p className="text-xs text-slate-400">Select whether you will defend (FOR) or contest (AGAINST) the motion</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* FOR option */}
            <div
              id="position-option-for"
              onClick={() => setUserPosition('FOR')}
              className={`cursor-pointer rounded-xl p-5 border transition flex flex-col gap-3 ${
                userPosition === 'FOR'
                  ? 'bg-emerald-950/30 border-emerald-500/80 ring-1 ring-emerald-500/80'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  FOR (Affirmative)
                </span>
                {userPosition === 'FOR' && (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                You argue in support of the resolution. You carry the affirmative burden of proof.
              </p>
              <div className="mt-auto pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>AI Partner stance:</span>
                <span className="font-semibold text-amber-400">AGAINST (Opposition)</span>
              </div>
            </div>

            {/* AGAINST option */}
            <div
              id="position-option-against"
              onClick={() => setUserPosition('AGAINST')}
              className={`cursor-pointer rounded-xl p-5 border transition flex flex-col gap-3 ${
                userPosition === 'AGAINST'
                  ? 'bg-amber-950/30 border-amber-500/80 ring-1 ring-amber-500/80'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  AGAINST (Opposition)
                </span>
                {userPosition === 'AGAINST' && (
                  <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                You rebut and challenge the resolution, pointing out flaws, costs, and unintended consequences.
              </p>
              <div className="mt-auto pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>AI Partner stance:</span>
                <span className="font-semibold text-emerald-400">FOR (Affirmative)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Number of Rounds */}
        <div id="setup-section-rounds" className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 flex flex-col gap-5">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">
              3
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Number of Rounds</h2>
              <p className="text-xs text-slate-400">Select total turn exchanges: 3, 5, 7, or 10 rounds</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[3, 5, 7, 10].map((rounds) => {
              const isSelected = totalRounds === rounds;
              return (
                <button
                  key={rounds}
                  id={`round-option-${rounds}`}
                  type="button"
                  onClick={() => setTotalRounds(rounds)}
                  className={`py-3.5 px-4 rounded-xl border font-semibold text-sm transition flex flex-col items-center justify-center gap-1 ${
                    isSelected
                      ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-900/20'
                      : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <span className="text-xl font-bold">{rounds}</span>
                  <span className="text-[11px] font-normal opacity-80">
                    {rounds === 3 ? 'Speed' : rounds === 5 ? 'Standard' : rounds === 7 ? 'Deep' : 'Championship'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Validation error message if any */}
        {validationError && (
          <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-200 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Action bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="text-xs text-slate-400">
            Selected stance: <span className="font-semibold text-white">{userPosition}</span> &bull; Rounds: <span className="font-semibold text-white">{totalRounds}</span>
          </div>

          <button
            id="setup-start-debate-btn"
            type="submit"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base transition shadow-lg shadow-blue-900/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <span>Start Debate</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};
