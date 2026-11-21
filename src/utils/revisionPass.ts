import { ScreenplayElement, ScreenplayRevision } from '../types/story';

export type RevisionTier = 'today' | 'this_week' | 'older';

export interface ElementRevisionInfo {
  tier: RevisionTier;
  timestamp?: string;
  label: string;
  shortDateLabel: string;
}

export interface RevisionPassCounts {
  today: number;
  thisWeek: number;
  older: number;
}

/**
 * Build a map of elementId -> most recent ISO timestamp from revision history.
 */
export function buildLatestRevisionTimestampMap(
  revisions: ScreenplayRevision[] = []
): Map<string, string> {
  const map = new Map<string, string>();
  revisions.forEach((rev) => {
    if (!rev.elementId || !rev.timestamp) return;
    const existing = map.get(rev.elementId);
    if (!existing) {
      map.set(rev.elementId, rev.timestamp);
      return;
    }
    const existingMs = Date.parse(existing);
    const candidateMs = Date.parse(rev.timestamp);
    if (!Number.isNaN(candidateMs) && (Number.isNaN(existingMs) || candidateMs > existingMs)) {
      map.set(rev.elementId, rev.timestamp);
    }
  });
  return map;
}

/**
 * Classify an element's last edited date into Today (red), This Week (yellow), or Older (grey).
 */
export function getElementRevisionInfo(
  element: ScreenplayElement,
  revisionTimestampMap: Map<string, string>,
  now: Date = new Date()
): ElementRevisionInfo {
  const rawTimestamp = element.lastEditedAt || revisionTimestampMap.get(element.id);
  if (!rawTimestamp) {
    return {
      tier: 'older',
      label: 'Older',
      shortDateLabel: 'Baseline',
    };
  }

  const parsedMs = Date.parse(rawTimestamp);
  if (Number.isNaN(parsedMs)) {
    return {
      tier: 'older',
      label: 'Older',
      shortDateLabel: 'Baseline',
    };
  }

  const editedDate = new Date(parsedMs);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const editedDayStart = new Date(
    editedDate.getFullYear(),
    editedDate.getMonth(),
    editedDate.getDate()
  ).getTime();
  const diffDays = Math.floor((startOfToday - editedDayStart) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return {
      tier: 'today',
      timestamp: rawTimestamp,
      label: 'Today',
      shortDateLabel: editedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }

  if (diffDays < 7) {
    return {
      tier: 'this_week',
      timestamp: rawTimestamp,
      label: 'This Week',
      shortDateLabel: `${diffDays}d ago`,
    };
  }

  return {
    tier: 'older',
    timestamp: rawTimestamp,
    label: 'Older',
    shortDateLabel: editedDate.toLocaleDateString([], { month: 'short', day: 'numeric' }),
  };
}

export function computeRevisionPassCounts(
  elements: ScreenplayElement[],
  revisions: ScreenplayRevision[] = []
): RevisionPassCounts {
  const map = buildLatestRevisionTimestampMap(revisions);
  const now = new Date();
  const counts: RevisionPassCounts = { today: 0, thisWeek: 0, older: 0 };

  elements.forEach((el) => {
    const info = getElementRevisionInfo(el, map, now);
    if (info.tier === 'today') counts.today += 1;
    else if (info.tier === 'this_week') counts.thisWeek += 1;
    else counts.older += 1;
  });

  return counts;
}
