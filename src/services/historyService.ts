import { DebateHistoryItem } from '../types';

const LOCAL_STORAGE_KEY = 'ai_debate_history_cache';

function getLocalCache(): DebateHistoryItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalCache(items: DebateHistoryItem[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

/**
 * Fetch all saved debates from SQLite API with automatic search and sort support.
 */
export async function getDebateHistory(
  search: string = '',
  sort: string = 'date_desc'
): Promise<DebateHistoryItem[]> {
  try {
    const params = new URLSearchParams();
    if (search.trim()) params.append('search', search.trim());
    if (sort) params.append('sort', sort);

    const response = await fetch(`/api/history?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }
    const data = await response.json();
    if (Array.isArray(data.debates)) {
      setLocalCache(data.debates);
      return data.debates;
    }
  } catch {
    // Utilize local fallback
  }

  // Fallback to local cache with client-side filter and sort
  let cached = getLocalCache();
  if (search.trim()) {
    const term = search.toLowerCase().trim();
    cached = cached.filter(
      (d) =>
        d.topic.toLowerCase().includes(term) ||
        d.mainThemes.some((t) => t.toLowerCase().includes(term))
    );
  }

  if (sort === 'date_asc') {
    cached.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } else if (sort === 'score_desc') {
    cached.sort((a, b) => b.overallScore - a.overallScore);
  } else if (sort === 'score_asc') {
    cached.sort((a, b) => a.overallScore - b.overallScore);
  } else {
    cached.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return cached;
}

/**
 * Fetch a specific debate by its unique ID.
 */
export async function getDebateById(id: string): Promise<DebateHistoryItem | null> {
  try {
    const response = await fetch(`/api/history/${encodeURIComponent(id)}`);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch {
    // Fallback to cache
  }

  const cached = getLocalCache();
  return cached.find((d) => d.id === id) || null;
}

/**
 * Save or update a debate record in SQLite database and synchronize local cache.
 * Note: Audio recordings are explicitly omitted to protect privacy.
 */
export async function saveDebateRecord(record: DebateHistoryItem): Promise<boolean> {
  // Update local cache immediately
  try {
    const cached = getLocalCache();
    const existingIndex = cached.findIndex((d) => d.id === record.id);
    if (existingIndex >= 0) {
      cached[existingIndex] = record;
    } else {
      cached.unshift(record);
    }
    setLocalCache(cached);
  } catch {
    // ignore
  }

  // Persist to server SQLite
  try {
    const response = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Delete a debate record by ID.
 */
export async function deleteDebateRecord(id: string): Promise<boolean> {
  // Update local cache
  try {
    const cached = getLocalCache().filter((d) => d.id !== id);
    setLocalCache(cached);
  } catch {
    // ignore
  }

  try {
    const response = await fetch(`/api/history/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return response.ok;
  } catch {
    return false;
  }
}
