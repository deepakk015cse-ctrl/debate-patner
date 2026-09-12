export type Page = 'home' | 'setup' | 'debate' | 'analysis' | 'history';

export type DebatePosition = 'FOR' | 'AGAINST';

export interface DebateConfig {
  topic: string;
  isCustomTopic: boolean;
  userPosition: DebatePosition;
  aiPosition: DebatePosition;
  totalRounds: number;
}

export interface DebateMessage {
  id: string;
  round: number;
  speaker: 'user' | 'ai' | 'system';
  text: string;
  timestamp: string;
}

export interface DebateSessionData {
  config: DebateConfig;
  messages: DebateMessage[];
  completedAt: string;
  totalTurnsCompleted: number;
}

export interface PresetTopic {
  id: string;
  title: string;
  category: 'Technology' | 'Ethics' | 'Society' | 'Economy' | 'Education';
  description: string;
}

export type SpeechRecognitionState =
  | 'ready'
  | 'listening'
  | 'processing'
  | 'no-speech'
  | 'permission-denied'
  | 'error'
  | 'unsupported';

export type TextToSpeechStatus =
  | 'idle'
  | 'playing'
  | 'paused'
  | 'stopped'
  | 'unsupported'
  | 'error';

export interface KeywordWeight {
  term: string;
  weight: number;
}

export interface ProcessedArgument {
  id: string;
  round: number;
  rawText: string;
  normalizedText: string;
  tokens: string[];
  filteredTokens: string[];
  lemmas: string[];
  topKeywords: KeywordWeight[];
  // Feature representation suitable for ML similarity & clustering (stored in-memory)
  vector: number[];
}

export interface CosineSimilarityPair {
  roundA: number;
  roundB: number;
  similarity: number; // 0 to 1
}

export interface ArgumentCluster {
  id: number;
  themeLabel: string;
  label?: string;
  representativeTerms: string[];
  topTerms?: string[];
  arguments: {
    id: string;
    round: number;
    text: string;
  }[];
  coherenceScore: number; // 0 to 1
}

export interface ArgumentPairComparison {
  argumentA: {
    id: string;
    round: number;
    text: string;
  };
  argumentB: {
    id: string;
    round: number;
    text: string;
  };
  similarityScore: number; // 0 to 1
  isRepeated: boolean;
  status: 'repeated_idea' | 'distinct_argument';
  statusLabel: string;
}

export interface ClusteringResult {
  status: 'success' | 'insufficient_data';
  k: number;
  clusters: ArgumentCluster[];
  message: string;
}

export interface ArgumentAnalysisPipelineResult {
  processedArguments: ProcessedArgument[];
  vocabulary: string[];
  topicComparison: {
    topicLemmas: string[];
    argumentAdherence: {
      round: number;
      similarity: number;
    }[];
  };
  pairwiseSimilarity: CosineSimilarityPair[];
  pairwiseComparisons: ArgumentPairComparison[];
  thematicProgression: {
    fromRound: number;
    toRound: number;
    similarity: number;
  }[];
  averageConsistency: number; // 0 to 100%
  clustering: ClusteringResult;
  analyzedAt: string;
}

export interface ComprehensiveDebateMetrics {
  overallScore: number; // 0 to 100
  scoreBand: string; // e.g., "Accomplished Dialectician (Grade A)"
  relevanceScore: number; // 0 to 100
  consistencyScore: number; // 0 to 100
  diversityScore: number; // 0 to 100
  repetitionScore: number; // 0 to 100
  totalRounds: number;
  totalUserArguments: number;
  uniqueArgumentsCount: number;
  repeatedArgumentsCount: number;
  discoveredThemesCount: number;
  strengths: string[];
  improvements: string[];
  summary: string;
}

export interface DebateHistoryItem {
  id: string;
  createdAt: string;
  topic: string;
  userPosition: DebatePosition;
  aiPosition: DebatePosition;
  rounds: number;
  overallScore: number;
  mainThemes: string[];
  repeatedArgumentsCount: number;
  metrics: ComprehensiveDebateMetrics;
  messages: DebateMessage[];
}

