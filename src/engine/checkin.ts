// Light gamification for the daily check: a per-crew streak and three simple
// badges. Deliberately gentle — no points, no ranking, nothing that could
// add anxiety or reward hiding symptoms.

export type CheckKind = 'pvt' | 'gonogo' | 'memory' | 'self' | 'note' | 'vision'
export type CheckinDone = Record<CheckKind, boolean>
export const NO_CHECKS: CheckinDone = { pvt: false, gonogo: false, memory: false, self: false, note: false, vision: false }

/** Simulated check-in streak before today, per crew member (demo data). */
export const PRIOR_STREAK: Record<string, number> = { cdr: 12, plt: 3, ms1: 9, ms2: 6 }

export interface CheckinStatus {
  /** Consecutive days with at least one check, including today if done. */
  streak: number
  doneToday: boolean
  /** Which of today's checks are done. */
  done: CheckinDone
  badges: { week: boolean; full: boolean; vision: boolean }
}

export function checkinStatus(crewId: string, done: CheckinDone): CheckinStatus {
  const doneToday = done.pvt || done.self || done.vision
  const streak = (PRIOR_STREAK[crewId] ?? 0) + (doneToday ? 1 : 0)
  return {
    streak,
    doneToday,
    done,
    badges: {
      week: streak >= 7,
      full: done.pvt && done.self && done.vision,
      vision: done.vision,
    },
  }
}
