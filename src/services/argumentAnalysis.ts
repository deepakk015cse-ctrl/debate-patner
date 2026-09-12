import {
  ProcessedArgument,
  KeywordWeight,
  ArgumentAnalysisPipelineResult,
  CosineSimilarityPair,
  ArgumentPairComparison,
  ClusteringResult,
  ArgumentCluster,
  DebateMessage,
  ComprehensiveDebateMetrics,
  DebateConfig,
} from '../types';

/**
 * Standard stop words for English NLP analysis, augmented with debate filler terms.
 */
const STOP_WORDS = new Set<string>([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'aren', 'arent', 'as', 'at', 'be', 'because', 'been', 'before',
  'being', 'below', 'between', 'both', 'but', 'by', 'can', 'cannot', 'could',
  'couldn', 'couldnt', 'did', 'didn', 'didnt', 'do', 'does', 'doesn', 'doesnt',
  'doing', 'don', 'dont', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'hadn', 'hadnt', 'has', 'hasn', 'hasnt', 'have', 'haven',
  'havent', 'having', 'he', 'hed', 'hell', 'hes', 'her', 'here', 'heres',
  'hers', 'herself', 'him', 'himself', 'his', 'how', 'hows', 'i', 'id',
  'ill', 'im', 'ive', 'if', 'in', 'into', 'is', 'isn', 'isnt', 'it', 'its',
  'itself', 'lets', 'me', 'more', 'most', 'mustn', 'mustnt', 'my', 'myself',
  'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other',
  'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan',
  'shant', 'she', 'shed', 'shell', 'shes', 'should', 'shouldn', 'shouldnt',
  'so', 'some', 'such', 'than', 'that', 'thats', 'the', 'their', 'theirs',
  'them', 'themselves', 'then', 'there', 'theres', 'these', 'they', 'theyd',
  'theyll', 'theyre', 'theyve', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very', 'was', 'wasn', 'wasnt', 'we', 'wed',
  'well', 'were', 'werent', 'weve', 'what', 'whats', 'when', 'whens',
  'where', 'wheres', 'which', 'while', 'who', 'whos', 'whom', 'why',
  'whys', 'with', 'won', 'wont', 'would', 'wouldn', 'wouldnt', 'you',
  'youd', 'youll', 'youre', 'youve', 'your', 'yours', 'yourself', 'yourselves',
  // Rhetorical conversational fillers
  'also', 'just', 'really', 'think', 'believe', 'argue', 'argument', 'said',
  'say', 'saying', 'well', 'like', 'point', 'much', 'many', 'get', 'even'
]);

/**
 * Common English irregular and debate-specific lemma dictionary.
 */
const LEMMA_OVERRIDES: Record<string, string> = {
  // Irregulars
  people: 'person',
  children: 'child',
  men: 'man',
  women: 'woman',
  better: 'good',
  best: 'good',
  worse: 'bad',
  worst: 'bad',
  lives: 'life',
  halves: 'half',
  themselves: 'themself',
  // Common debate plural / verb bases
  regulations: 'regulate',
  regulating: 'regulate',
  regulated: 'regulate',
  regulatory: 'regulate',
  regulators: 'regulate',
  regulator: 'regulate',
  governments: 'govern',
  governing: 'govern',
  governance: 'govern',
  countries: 'country',
  technologies: 'technology',
  economies: 'economy',
  economic: 'economy',
  societies: 'society',
  social: 'society',
  policies: 'policy',
  companies: 'company',
  communities: 'community',
  freedoms: 'freedom',
  rights: 'right',
  innovations: 'innovate',
  innovating: 'innovate',
  innovative: 'innovate',
  solutions: 'solve',
  solving: 'solve',
  solved: 'solve',
  problems: 'problem',
  agreements: 'agree',
  agreed: 'agree',
  disagreements: 'disagree',
  disagreed: 'disagree',
  workers: 'work',
  working: 'work',
  workplaces: 'workplace',
  nations: 'nation',
  national: 'nation',
  international: 'international',
  systems: 'system',
  systemic: 'system',
  processes: 'process',
  practices: 'practice',
  developments: 'develop',
  developing: 'develop',
  developed: 'develop',
  benefits: 'benefit',
  benefiting: 'benefit',
  benefited: 'benefit',
  challenges: 'challenge',
  challenging: 'challenge',
  impacts: 'impact',
  impacting: 'impact',
  impacted: 'impact',
  consequences: 'consequence',
  standards: 'standard',
  laws: 'law',
  rules: 'rule',
  principles: 'principle',
  values: 'value',
  // Automation, labor and AI debate terms
  automation: 'automate',
  automates: 'automate',
  automated: 'automate',
  automating: 'automate',
  repetitive: 'repetitive',
  repeated: 'repetitive',
  repetition: 'repetitive',
  manual: 'manual',
  manually: 'manual',
  tasks: 'task',
  task: 'task',
  reduction: 'reduce',
  reduces: 'reduce',
  reducing: 'reduce',
  reduced: 'reduce',
  jobs: 'job',
  job: 'job',
  employment: 'employment',
  employed: 'employment',
  employees: 'employee',
  employee: 'employee',
  employers: 'employer',
  employer: 'employer',
  productivity: 'productivity',
  productive: 'productivity',
  efficiency: 'efficiency',
  efficient: 'efficiency',
  efficiencies: 'efficiency',
};

/**
 * 1. Text Normalization:
 * Converts text to lowercase, handles diacritics/accents, replaces contractions/hyphens,
 * canonicalizes common acronyms (e.g. artificial intelligence -> ai),
 * strips non-alphanumeric punctuation, and condenses whitespace.
 */
export function normalizeText(text: string): string {
  if (!text) return '';

  return text
    .toLowerCase()
    // Normalize unicode accents (e.g. résumé -> resume)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Normalize AI phrases to canonical representation
    .replace(/\bartificial\s+intelligence\b/g, 'ai')
    .replace(/\ba\.i\.\b/g, 'ai')
    // Expand or cleanse common contractions
    .replace(/won't/g, 'will not')
    .replace(/can't/g, 'cannot')
    .replace(/n't/g, ' not')
    .replace(/'re/g, ' are')
    .replace(/'s/g, '')
    .replace(/'d/g, ' would')
    .replace(/'ll/g, ' will')
    .replace(/'ve/g, ' have')
    .replace(/'m/g, ' am')
    // Split compound hyphenated or underscored words into distinct tokens
    .replace(/[-_/\\]+/g, ' ')
    // Remove remaining non-alphanumeric characters except spaces
    .replace(/[^a-z0-9\s]/g, ' ')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 2. Tokenization:
 * Extracts individual word tokens and filters out single-character fragments.
 */
export function tokenizeText(normalizedText: string): string[] {
  if (!normalizedText) return [];
  return normalizedText
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

/**
 * 3. Stop Words Removal:
 * Discards high-frequency function words and conversational noise.
 */
export function removeStopWords(tokens: string[]): string[] {
  return tokens.filter((token) => !STOP_WORDS.has(token) && !/^\d+$/.test(token));
}

/**
 * 4. Lemmatization:
 * Applies dictionary lookups and algorithmic morphological reduction rules to
 * convert words into their base canonical form.
 */
export function lemmatizeToken(token: string): string {
  if (!token || token.length <= 2) return token;

  // Direct override check
  if (LEMMA_OVERRIDES[token]) {
    return LEMMA_OVERRIDES[token];
  }

  // Common morphological reductions
  if (token.endsWith('ies') && token.length > 4) {
    return token.slice(0, -3) + 'y';
  }
  if (token.endsWith('ves') && token.length > 4) {
    return token.slice(0, -3) + 'f';
  }
  if (token.endsWith('sses')) {
    return token.slice(0, -2);
  }
  if (token.endsWith('xes') || token.endsWith('ches') || token.endsWith('shes')) {
    return token.slice(0, -2);
  }
  if (token.endsWith('s') && !token.endsWith('ss') && token.length > 3) {
    return token.slice(0, -1);
  }
  if (token.endsWith('ingly') && token.length > 5) {
    return token.slice(0, -5);
  }
  if (token.endsWith('ing') && token.length > 5) {
    const base = token.slice(0, -3);
    // Doubled consonants (running -> run, stopping -> stop)
    if (
      base.length >= 3 &&
      base[base.length - 1] === base[base.length - 2] &&
      !['e', 'o', 'l', 's'].includes(base[base.length - 1])
    ) {
      return base.slice(0, -1);
    }
    if (base.endsWith('at')) {
      return base + 'e'; // creating -> create
    }
    return base;
  }
  if (token.endsWith('ed') && token.length > 4) {
    const base = token.slice(0, -2);
    if (
      base.length >= 3 &&
      base[base.length - 1] === base[base.length - 2] &&
      !['e', 'o', 'l', 's'].includes(base[base.length - 1])
    ) {
      return base.slice(0, -1);
    }
    if (token.endsWith('ated')) {
      return token.slice(0, -1); // regulated -> regulate
    }
    return base;
  }
  if (token.endsWith('ational') && token.length > 7) {
    return token.slice(0, -5) + 'e';
  }
  if (token.endsWith('ization') && token.length > 7) {
    return token.slice(0, -4) + 'e';
  }

  return token;
}

export function lemmatizeTokens(tokens: string[]): string[] {
  return tokens.map(lemmatizeToken);
}

/**
 * 5. Vector & Similarity Math Utilities
 */

export function computeCosineSimilarity(v1: number[], v2: number[]): number {
  if (!v1.length || !v2.length || v1.length !== v2.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < v1.length; i++) {
    dotProduct += v1[i] * v2[i];
    normA += v1[i] * v1[i];
    normB += v2[i] * v2[i];
  }

  if (normA === 0 || normB === 0) return 0;
  const sim = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  // Bound precisely between 0 and 1
  return Math.max(0, Math.min(1, sim));
}

/**
 * Normalizes vector in-place or returns L2 normalized float array.
 */
function l2Normalize(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (norm === 0) return vector.map(() => 0);
  return vector.map((val) => val / norm);
}

/**
 * Generates a human-readable theme label for a cluster using its most representative terms.
 * Never hardcoded; dynamically generated from the debater's data.
 * Examples:
 * - ['productivity', 'automation', 'efficiency'] => 'Productivity & Automation'
 * - ['jobs', 'employment', 'workers'] => 'Jobs & Employment'
 */
export function generateThemeLabel(representativeTerms: string[]): string {
  if (!representativeTerms || representativeTerms.length === 0) {
    return 'General Discourse';
  }

  const cleanTitle = (term: string): string => {
    if (!term) return '';
    const lower = term.toLowerCase();
    if (lower === 'ai') return 'AI';
    if (lower === 'gdp') return 'GDP';
    if (lower === 'tech') return 'Technology';
    return term.charAt(0).toUpperCase() + term.slice(1).toLowerCase();
  };

  const formattedTerms = representativeTerms
    .filter((t) => t && t.trim().length > 0)
    .map(cleanTitle);

  if (formattedTerms.length === 1) {
    return `${formattedTerms[0]} Dimension`;
  }

  // If one of the terms is 'Impact', 'Policy', 'Ethics', 'Risk', or 'Future'
  const contextualTerm = formattedTerms.slice(1, 4).find((t) =>
    ['Impact', 'Policy', 'Ethics', 'Risk', 'Consequence', 'Future', 'Economy'].includes(t)
  );
  if (contextualTerm && formattedTerms[0] !== contextualTerm) {
    return `${formattedTerms[0]} ${contextualTerm}`;
  }

  return `${formattedTerms[0]} & ${formattedTerms[1]}`;
}

/**
 * 6. K-Means Clustering on TF-IDF Feature Representations
 */
export function runKMeansClustering(
  processedArguments: ProcessedArgument[],
  vocabulary: string[],
  kRequested: number = 2
): ClusteringResult {
  const numArgs = processedArguments.length;

  // Handle insufficient data gracefully
  if (numArgs < 2) {
    return {
      status: 'insufficient_data',
      k: 0,
      clusters: [],
      message:
        'K-Means clustering requires at least 2 debate arguments to identify distinct thematic clusters. Complete multiple debate rounds to generate cluster partitions.',
    };
  }

  // Adjust k based on available argument count (never attempt more clusters than arguments support)
  const k = Math.min(Math.max(2, kRequested), Math.min(3, numArgs));
  const dim = vocabulary.length;

  if (dim === 0) {
    return {
      status: 'insufficient_data',
      k: 0,
      clusters: [],
      message: 'Arguments contain insufficient distinct vocabulary for thematic clustering.',
    };
  }

  // K-Means++ Initialization
  const centroids: number[][] = [];
  // Choose first centroid deterministically from argument with richest vocabulary
  let bestFirstIdx = 0;
  let maxNonZero = -1;
  processedArguments.forEach((arg, idx) => {
    const nonZeroCount = arg.vector.filter((v) => v > 0).length;
    if (nonZeroCount > maxNonZero) {
      maxNonZero = nonZeroCount;
      bestFirstIdx = idx;
    }
  });
  centroids.push([...processedArguments[bestFirstIdx].vector]);

  // Select subsequent centroids maximizing distance to existing centroids
  while (centroids.length < k) {
    let bestCandidateIdx = 0;
    let maxMinDist = -1;

    for (let i = 0; i < numArgs; i++) {
      const vec = processedArguments[i].vector;
      let minDist = Infinity;
      for (const centroid of centroids) {
        const dist = 1 - computeCosineSimilarity(vec, centroid);
        if (dist < minDist) {
          minDist = dist;
        }
      }
      if (minDist > maxMinDist) {
        maxMinDist = minDist;
        bestCandidateIdx = i;
      }
    }
    centroids.push([...processedArguments[bestCandidateIdx].vector]);
  }

  // Iterative assignment & centroid update
  let assignments = new Array(numArgs).fill(-1);
  const maxIterations = 30;

  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;

    // 1. Assignment Step
    for (let i = 0; i < numArgs; i++) {
      const vec = processedArguments[i].vector;
      let bestCluster = 0;
      let bestSim = -1;

      for (let c = 0; c < k; c++) {
        const sim = computeCosineSimilarity(vec, centroids[c]);
        if (sim > bestSim) {
          bestSim = sim;
          bestCluster = c;
        }
      }

      if (assignments[i] !== bestCluster) {
        assignments[i] = bestCluster;
        changed = true;
      }
    }

    if (!changed && iter > 0) {
      break;
    }

    // 2. Update Step
    for (let c = 0; c < k; c++) {
      const clusterMembers = processedArguments.filter((_, idx) => assignments[idx] === c);
      if (clusterMembers.length === 0) {
        continue;
      }

      const newCentroid = new Array(dim).fill(0);
      for (const member of clusterMembers) {
        for (let d = 0; d < dim; d++) {
          newCentroid[d] += member.vector[d];
        }
      }
      centroids[c] = l2Normalize(newCentroid);
    }
  }

  // Format and interpret resulting clusters with human-readable generated themes
  const clusters: ArgumentCluster[] = [];

  for (let c = 0; c < k; c++) {
    const clusterArgs = processedArguments.filter((_, idx) => assignments[idx] === c);
    const centroid = centroids[c];

    // Extract top characteristic terms from centroid weights
    const termWeights: KeywordWeight[] = [];
    for (let d = 0; d < dim; d++) {
      if (centroid[d] > 0) {
        termWeights.push({
          term: vocabulary[d],
          weight: centroid[d],
        });
      }
    }
    termWeights.sort((a, b) => b.weight - a.weight);
    const topTerms = termWeights.slice(0, 4).map((tw) => tw.term);

    // Compute cluster coherence (average similarity of members to centroid)
    let totalSim = 0;
    if (clusterArgs.length > 0) {
      clusterArgs.forEach((arg) => {
        totalSim += computeCosineSimilarity(arg.vector, centroid);
      });
      totalSim /= clusterArgs.length;
    }

    const themeLabel = generateThemeLabel(topTerms);

    clusters.push({
      id: c + 1,
      themeLabel,
      label: themeLabel,
      representativeTerms: topTerms,
      topTerms,
      arguments: clusterArgs.map((arg) => ({
        id: arg.id,
        round: arg.round,
        text: arg.rawText,
      })),
      coherenceScore: Number(totalSim.toFixed(3)),
    });
  }

  return {
    status: 'success',
    k,
    clusters: clusters.filter((c) => c.arguments.length > 0),
    message: `Successfully identified ${clusters.filter((c) => c.arguments.length > 0).length} thematic argument cluster${clusters.length > 1 ? 's' : ''} across completed debate rounds.`,
  };
}

/**
 * 7. Evaluates pairwise cosine similarity between all user arguments to detect repeated ideas
 * against a configurable similarity threshold.
 * Does not call every similar word a repeated argument — evaluates overall TF-IDF vector similarity.
 */
export function evaluateArgumentRepetition(
  processedArguments: ProcessedArgument[],
  threshold: number = 0.60
): ArgumentPairComparison[] {
  const comparisons: ArgumentPairComparison[] = [];

  for (let i = 0; i < processedArguments.length; i++) {
    for (let j = i + 1; j < processedArguments.length; j++) {
      const argA = processedArguments[i];
      const argB = processedArguments[j];

      // Compute cosine similarity between their TF-IDF representations
      const score = computeCosineSimilarity(argA.vector, argB.vector);
      const roundedScore = Number(score.toFixed(3));
      const isRepeated = roundedScore >= threshold;

      comparisons.push({
        argumentA: {
          id: argA.id,
          round: argA.round,
          text: argA.rawText,
        },
        argumentB: {
          id: argB.id,
          round: argB.round,
          text: argB.rawText,
        },
        similarityScore: roundedScore,
        isRepeated,
        status: isRepeated ? 'repeated_idea' : 'distinct_argument',
        statusLabel: isRepeated ? 'Potential Repeated Idea' : 'Distinct Argument',
      });
    }
  }

  return comparisons;
}

/**
 * Direct comparison tool for testing any two argument strings (e.g. interactive tester or example verification).
 * Computes exact TF-IDF feature vectors and cosine similarity.
 */
export function computeDirectPairCosineSimilarity(
  textA: string,
  textB: string,
  threshold: number = 0.60
): {
  similarityScore: number;
  isRepeated: boolean;
  status: 'repeated_idea' | 'distinct_argument';
  lemmasA: string[];
  lemmasB: string[];
  sharedLemmas: string[];
} {
  const normA = normalizeText(textA);
  const normB = normalizeText(textB);

  const tokensA = tokenizeText(normA);
  const tokensB = tokenizeText(normB);

  const lemmasA = lemmatizeTokens(removeStopWords(tokensA));
  const lemmasB = lemmatizeTokens(removeStopWords(tokensB));

  const vocabSet = new Set<string>([...lemmasA, ...lemmasB]);
  const vocabulary = Array.from(vocabSet).sort();

  if (vocabulary.length === 0) {
    return {
      similarityScore: 0,
      isRepeated: false,
      status: 'distinct_argument',
      lemmasA: [],
      lemmasB: [],
      sharedLemmas: [],
    };
  }

  const countA: Record<string, number> = {};
  lemmasA.forEach((l) => (countA[l] = (countA[l] || 0) + 1));
  const countB: Record<string, number> = {};
  lemmasB.forEach((l) => (countB[l] = (countB[l] || 0) + 1));

  // Compute 2-document corpus TF-IDF
  const N = 2;
  const df: Record<string, number> = {};
  vocabulary.forEach((term) => {
    let d = 0;
    if (countA[term]) d++;
    if (countB[term]) d++;
    df[term] = d;
  });

  const idf: Record<string, number> = {};
  vocabulary.forEach((term) => {
    idf[term] = Math.log((1 + N) / (1 + (df[term] || 0))) + 1.0;
  });

  const lenA = Math.max(1, lemmasA.length);
  const lenB = Math.max(1, lemmasB.length);

  const rawVecA = vocabulary.map((t) => ((countA[t] || 0) / lenA) * idf[t]);
  const rawVecB = vocabulary.map((t) => ((countB[t] || 0) / lenB) * idf[t]);

  const vecA = l2Normalize(rawVecA);
  const vecB = l2Normalize(rawVecB);

  const rawScore = computeCosineSimilarity(vecA, vecB);
  const similarityScore = Number(rawScore.toFixed(3));
  const isRepeated = similarityScore >= threshold;

  const sharedLemmas = vocabulary.filter((t) => (countA[t] || 0) > 0 && (countB[t] || 0) > 0);

  return {
    similarityScore,
    isRepeated,
    status: isRepeated ? 'repeated_idea' : 'distinct_argument',
    lemmasA,
    lemmasB,
    sharedLemmas,
  };
}

/**
 * 8. Complete Argument Analysis Pipeline Service
 * Collects all user arguments from the debate session and executes:
 * Text Normalization -> Tokenization -> Stop Word Removal -> Lemmatization -> TF-IDF Vectorization
 * -> Cosine Similarity Matrix -> Repetition Analysis -> K-Means Thematic Clustering.
 */
export function analyzeDebateArguments(
  messages: DebateMessage[],
  debateTopic: string
): ArgumentAnalysisPipelineResult {
  // Extract user arguments specifically
  const userMessages = messages.filter((m) => m.speaker === 'user' && m.text.trim().length > 0);

  // Step 1 - 4: Process every user argument through NLP normalization & lemmatization
  const preprocessed = userMessages.map((msg) => {
    const rawText = msg.text.trim();
    const normalizedText = normalizeText(rawText);
    const tokens = tokenizeText(normalizedText);
    const filteredTokens = removeStopWords(tokens);
    const lemmas = lemmatizeTokens(filteredTokens);

    return {
      id: msg.id,
      round: msg.round,
      rawText,
      normalizedText,
      tokens,
      filteredTokens,
      lemmas,
    };
  });

  // Also process debate motion / topic for topic comparison
  const topicNormalized = normalizeText(debateTopic);
  const topicTokens = removeStopWords(tokenizeText(topicNormalized));
  const topicLemmas = lemmatizeTokens(topicTokens);

  // Build unified vocabulary across all arguments (and debate topic)
  const vocabSet = new Set<string>();
  preprocessed.forEach((doc) => doc.lemmas.forEach((lemma) => vocabSet.add(lemma)));
  topicLemmas.forEach((lemma) => vocabSet.add(lemma));

  const vocabulary = Array.from(vocabSet).sort();
  const N = preprocessed.length;

  // Compute Document Frequencies (DF) across user arguments
  const documentFrequencies: Record<string, number> = {};
  vocabulary.forEach((term) => {
    documentFrequencies[term] = 0;
  });

  preprocessed.forEach((doc) => {
    const uniqueLemmasInDoc = new Set(doc.lemmas);
    uniqueLemmasInDoc.forEach((lemma) => {
      if (documentFrequencies[lemma] !== undefined) {
        documentFrequencies[lemma]++;
      }
    });
  });

  // Calculate Smoothed Inverse Document Frequency (IDF)
  // Formula: ln((1 + N) / (1 + DF)) + 1
  const idfScores: Record<string, number> = {};
  vocabulary.forEach((term) => {
    const df = documentFrequencies[term] || 0;
    idfScores[term] = Math.log((1 + N) / (1 + df)) + 1.0;
  });

  // Step 5: Convert arguments into numerical feature representations via TF-IDF
  const processedArguments: ProcessedArgument[] = preprocessed.map((doc) => {
    const termCounts: Record<string, number> = {};
    doc.lemmas.forEach((lemma) => {
      termCounts[lemma] = (termCounts[lemma] || 0) + 1;
    });

    const totalLemmas = Math.max(1, doc.lemmas.length);

    // Compute raw TF-IDF vector for this argument
    const rawVector: number[] = vocabulary.map((term) => {
      const count = termCounts[term] || 0;
      const tf = count / totalLemmas;
      const idf = idfScores[term] || 1;
      return tf * idf;
    });

    // L2 Normalize vector so Euclidean norm = 1 (enables cosine similarity = dot product)
    const normalizedVector = l2Normalize(rawVector);

    // Extract top weighted terms for human-readable ML insight (without exposing raw vector)
    const keywordWeights: KeywordWeight[] = [];
    vocabulary.forEach((term, idx) => {
      if (normalizedVector[idx] > 0) {
        keywordWeights.push({
          term,
          weight: Number(normalizedVector[idx].toFixed(4)),
        });
      }
    });
    keywordWeights.sort((a, b) => b.weight - a.weight);

    return {
      id: doc.id,
      round: doc.round,
      rawText: doc.rawText,
      normalizedText: doc.normalizedText,
      tokens: doc.tokens,
      filteredTokens: doc.filteredTokens,
      lemmas: doc.lemmas,
      topKeywords: keywordWeights.slice(0, 5),
      vector: normalizedVector, // Stored internally for ML computations
    };
  });

  // Topic TF-IDF Vector
  const topicTermCounts: Record<string, number> = {};
  topicLemmas.forEach((lemma) => {
    topicTermCounts[lemma] = (topicTermCounts[lemma] || 0) + 1;
  });
  const topicRawVector = vocabulary.map((term) => {
    const count = topicTermCounts[term] || 0;
    const tf = count / Math.max(1, topicLemmas.length);
    const idf = idfScores[term] || 1;
    return tf * idf;
  });
  const topicVector = l2Normalize(topicRawVector);

  // Compute Topic Adherence
  const argumentAdherence = processedArguments.map((arg) => ({
    round: arg.round,
    similarity: Number(computeCosineSimilarity(arg.vector, topicVector).toFixed(3)),
  }));

  // Step 6: Cosine Similarity Analysis
  // Pairwise similarity between all debate rounds
  const pairwiseSimilarity: CosineSimilarityPair[] = [];
  let totalPairwiseSim = 0;
  let pairCount = 0;

  for (let i = 0; i < processedArguments.length; i++) {
    for (let j = i + 1; j < processedArguments.length; j++) {
      const sim = computeCosineSimilarity(
        processedArguments[i].vector,
        processedArguments[j].vector
      );
      pairwiseSimilarity.push({
        roundA: processedArguments[i].round,
        roundB: processedArguments[j].round,
        similarity: Number(sim.toFixed(3)),
      });
      totalPairwiseSim += sim;
      pairCount++;
    }
  }

  // Thematic progression (consecutive round similarity)
  const thematicProgression: {
    fromRound: number;
    toRound: number;
    similarity: number;
  }[] = [];

  for (let i = 0; i < processedArguments.length - 1; i++) {
    const sim = computeCosineSimilarity(
      processedArguments[i].vector,
      processedArguments[i + 1].vector
    );
    thematicProgression.push({
      fromRound: processedArguments[i].round,
      toRound: processedArguments[i + 1].round,
      similarity: Number(sim.toFixed(3)),
    });
  }

  const averageConsistency =
    pairCount > 0
      ? Math.round((totalPairwiseSim / pairCount) * 100)
      : processedArguments.length === 1
      ? 100
      : 0;

  // Step 7: Evaluate Repetition Against Configurable Threshold
  const pairwiseComparisons = evaluateArgumentRepetition(processedArguments, 0.60);

  // Step 8: K-Means Clustering on TF-IDF Feature Representations
  const clustering = runKMeansClustering(processedArguments, vocabulary, 2);

  return {
    processedArguments,
    vocabulary,
    topicComparison: {
      topicLemmas,
      argumentAdherence,
    },
    pairwiseSimilarity,
    pairwiseComparisons,
    thematicProgression,
    averageConsistency,
    clustering,
    analyzedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

/**
 * Computes transparent, project-defined metrics derived directly from actual NLP debate data.
 * Adheres strictly to non-random, formulaic calculations with full educational transparency.
 */
export function computeComprehensiveDebateMetrics(
  result: ArgumentAnalysisPipelineResult,
  config: DebateConfig | { topic: string; userPosition: 'FOR' | 'AGAINST'; totalRounds: number },
  repetitionThreshold: number = 0.60
): ComprehensiveDebateMetrics {
  const totalUserArguments = result.processedArguments.length;
  const totalRounds = config.totalRounds || Math.max(1, totalUserArguments);

  // Dynamic repetition check based on current threshold
  const comparisons = evaluateArgumentRepetition(result.processedArguments, repetitionThreshold);
  const repeatedPairs = comparisons.filter((p) => p.isRepeated);
  const repeatedPairsCount = repeatedPairs.length;

  const repeatedArgIds = new Set<string>();
  repeatedPairs.forEach((p) => {
    repeatedArgIds.add(p.argumentA.id);
    repeatedArgIds.add(p.argumentB.id);
  });
  const repeatedArgumentsCount = repeatedArgIds.size;
  const uniqueArgumentsCount = Math.max(0, totalUserArguments - repeatedArgumentsCount);

  // 1. Topic Relevance Score (0 - 100)
  // Mean cosine similarity between user arguments and debate resolution motion terms.
  let relevanceScore = 50;
  if (result.topicComparison.argumentAdherence.length > 0) {
    const sumSim = result.topicComparison.argumentAdherence.reduce((acc, curr) => acc + curr.similarity, 0);
    const avgSim = sumSim / result.topicComparison.argumentAdherence.length;
    // Cosine similarity on TF-IDF against brief motion keywords typically ranges 0.10 to 0.60.
    relevanceScore = Math.min(100, Math.max(15, Math.round((avgSim / 0.45) * 100)));
  }

  // 2. Thematic Consistency Score (0 - 100)
  // Transparent project-defined metric: evaluates topical continuity across turns.
  let consistencyScore = 50;
  if (totalUserArguments <= 1) {
    consistencyScore = 100;
  } else {
    const consecutiveSims = result.thematicProgression.map((p) => p.similarity);
    const avgConsecutiveSim =
      consecutiveSims.length > 0
        ? consecutiveSims.reduce((a, b) => a + b, 0) / consecutiveSims.length
        : 0.5;
    const topicStability = relevanceScore / 100;
    consistencyScore = Math.min(
      100,
      Math.max(20, Math.round((avgConsecutiveSim * 50 + topicStability * 50)))
    );
  }

  // 3. Argument Diversity Score (0 - 100)
  // Evaluates thematic spread based on discovered K-Means clusters and lexical dispersion.
  let diversityScore = 50;
  const discoveredThemesCount =
    result.clustering.status === 'success' ? result.clustering.clusters.length : 1;

  if (totalUserArguments > 1) {
    const clusterSpread = discoveredThemesCount / Math.max(1, totalUserArguments);
    const totalTokensCount = result.processedArguments.reduce((sum, a) => sum + a.tokens.length, 0);
    const lexicalRatio = Math.min(1, result.vocabulary.length / Math.max(1, totalTokensCount * 0.45));
    diversityScore = Math.min(
      100,
      Math.max(25, Math.round((clusterSpread * 55 + lexicalRatio * 45) * 100))
    );
  } else if (totalUserArguments === 1) {
    diversityScore = 60;
  }

  // 4. Repetition Discipline Score (0 - 100)
  const repetitionScore = Math.max(0, 100 - repeatedPairsCount * 20);

  // 5. Overall Project-Defined Score (0 - 100)
  // Weighted rubric:
  // Relevance (35%) + Consistency (25%) + Diversity (25%) + Repetition Discipline (15%)
  const overallScore = Math.min(
    100,
    Math.max(
      20,
      Math.round(
        relevanceScore * 0.35 +
          consistencyScore * 0.25 +
          diversityScore * 0.25 +
          repetitionScore * 0.15
      )
    )
  );

  // Score Band
  let scoreBand = 'Foundational Debater';
  if (overallScore >= 90) scoreBand = 'Exemplary Rhetorician (Grade A+)';
  else if (overallScore >= 80) scoreBand = 'Accomplished Dialectician (Grade A)';
  else if (overallScore >= 70) scoreBand = 'Effective Debater (Grade B)';
  else if (overallScore >= 60) scoreBand = 'Developing Speaker (Grade C)';

  // Strengths
  const strengths: string[] = [];
  if (relevanceScore >= 60) {
    strengths.push(
      'Strong Motion Relevance: Arguments stayed tightly anchored to the core resolution concepts and principles.'
    );
  } else {
    strengths.push(
      'Direct Argumentation: Articulated claims addressing core aspects of the motion.'
    );
  }

  if (repeatedPairsCount === 0) {
    strengths.push(
      'High Rhetorical Freshness: Zero repeated argument pairs detected across rounds; every turn introduced new perspectives.'
    );
  }

  if (diversityScore >= 65 && result.clustering.status === 'success') {
    const themeNames = result.clustering.clusters.map((c) => `"${c.themeLabel}"`).join(', ');
    strengths.push(
      `Thematic Breadth: Successfully branched into distinct debate pillars (${themeNames}).`
    );
  }

  if (consistencyScore >= 65) {
    strengths.push(
      'Argumentative Stability: Maintained steady positioning and coherent rhetorical progression across consecutive turns.'
    );
  }

  if (result.vocabulary.length >= 12) {
    strengths.push(
      `Lexical Richness: Employed ${result.vocabulary.length} distinct canonical lemma keywords across the debate.`
    );
  }

  // Improvements
  const improvements: string[] = [];
  if (repeatedPairsCount > 0) {
    const pairRounds = repeatedPairs
      .map((p) => `Round ${p.argumentA.round} & Round ${p.argumentB.round}`)
      .join(', ');
    improvements.push(
      `Mitigate Semantic Repetition: High cosine similarity detected between ${pairRounds}. Introduce novel evidentiary angles (e.g. economic data or ethical governance) instead of repeating similar premises.`
    );
  }

  if (diversityScore < 65) {
    improvements.push(
      'Broaden Thematic Pillars: Arguments clustered within narrow thematic domains. Consider expanding your framework to address moral, practical, sociological, or economic dimensions.'
    );
  }

  if (relevanceScore < 60) {
    improvements.push(
      'Tighten Resolution Anchoring: Explicitly reference the key terminology and operative mechanisms of the debate resolution.'
    );
  }

  if (totalUserArguments < totalRounds) {
    improvements.push(
      `Complete All Debate Rounds: You completed ${totalUserArguments} of ${totalRounds} configured rounds. Concluding all rounds provides a deeper rhetorical profile.`
    );
  }

  if (improvements.length === 0) {
    improvements.push(
      'Explore Edge Counter-Rebuttals: Continue challenging the AI debater with empirical citations and concrete historical precedents.'
    );
  }

  // Summary
  const clusterThemes =
    result.clustering.status === 'success' && result.clustering.clusters.length > 0
      ? result.clustering.clusters.map((c) => c.themeLabel).join(' and ')
      : 'core motion principles';

  const summary = `In this debate defending the ${config.userPosition} position on "${config.topic}", you delivered ${totalUserArguments} user argument${totalUserArguments === 1 ? '' : 's'}. The analytical pipeline identified ${discoveredThemesCount} thematic cluster${discoveredThemesCount === 1 ? '' : 's'} centered on ${clusterThemes}. You attained a topic relevance score of ${relevanceScore}% and argument diversity of ${diversityScore}%, delivering ${uniqueArgumentsCount} unique point${uniqueArgumentsCount === 1 ? '' : 's'}${repeatedPairsCount > 0 ? ` alongside ${repeatedPairsCount} potential repetition pair${repeatedPairsCount === 1 ? '' : 's'}` : ' with zero repeated claims'}. This yields a composite rhetorical cohesion score of ${overallScore}/100.`;

  return {
    overallScore,
    scoreBand,
    relevanceScore,
    consistencyScore,
    diversityScore,
    repetitionScore,
    totalRounds,
    totalUserArguments,
    uniqueArgumentsCount,
    repeatedArgumentsCount,
    discoveredThemesCount,
    strengths: strengths.slice(0, 4),
    improvements: improvements.slice(0, 4),
    summary,
  };
}
