// Per-device storage for the Vision Check: screen calibration, distance mode,
// the demo toggle and each crew member's personal baseline. Browser storage can
// be unavailable (private mode, blocked site data), so every access is guarded
// and the flow still works without it.
import { EMPTY_BASELINE, type DistanceMode, type VisionBaseline, type VisionOutcome } from '../engine/vision'

const CAL_KEY = 'astrotwin:vision:calibration'
const DAILY_KEY = 'astrotwin:vision:fullDaily'
const crewKey = (crewId: string) => `astrotwin:vision:crew:${crewId}`

export interface Calibration {
  pxPerMm: number
  mode: DistanceMode
  at: number
}

export interface CrewVisionRecord {
  baseline: VisionBaseline
  lastFullAt?: number
  last?: { at: number; outcome: VisionOutcome }
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable: results still apply to this session */
  }
}

export const loadCalibration = () => read<Calibration>(CAL_KEY)
export const saveCalibration = (c: Calibration) => write(CAL_KEY, c)

/** Demo default: the full sharpness test runs every day. */
export const loadFullDaily = () => read<boolean>(DAILY_KEY) ?? true
export const saveFullDaily = (v: boolean) => write(DAILY_KEY, v)

export const loadCrewVision = (crewId: string): CrewVisionRecord =>
  read<CrewVisionRecord>(crewKey(crewId)) ?? { baseline: EMPTY_BASELINE }
export const saveCrewVision = (crewId: string, r: CrewVisionRecord) => write(crewKey(crewId), r)

/** Fallback density (96 dpi CSS reference) when the screen is not calibrated. */
export const DEFAULT_PX_PER_MM = 96 / 25.4
