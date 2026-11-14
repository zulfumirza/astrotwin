// Free-text note from the daily check. The OFFLINE evaluator below is a plain
// keyword match (EN + TR) that suggests which check-in boxes the astronaut may
// want to tick. The optional AI evaluation returns the same kind of
// suggestions; in both cases the astronaut confirms, nothing is set
// automatically, and no score, tier or threshold is changed.

/** Fixed list of things a note can point to. Anything else from the AI is dropped. */
export const NOTE_FLAGS = ['headache', 'rash', 'vision', 'sleep', 'stress', 'mood', 'pain', 'nausea', 'breathing', 'dizzy'] as const
export type NoteFlag = (typeof NOTE_FLAGS)[number]

export const NOTE_MAX = 1000

/** Words that should always reach a human quickly. */
const URGENT = [
  /chest pain/i, /can'?t breathe|cannot breathe|short(ness)? of breath/i, /faint(ed)?|passed out|blackout/i,
  /curtain over|flash(es)? of light|sudden(ly)? (lost|loss of) (vision|sight)/i,
  /göğüs ağr/i, /nefes alam/i, /bayıl/i, /perde/i, /ışık çak/i, /aniden görme/i,
]

const PATTERNS: Record<NoteFlag, RegExp[]> = {
  headache: [/head ?ache|migraine|my head hurts/i, /baş ?ağr|başım ağr|migren/i],
  rash: [/rash|itch|blister|skin/i, /döküntü|kaşın|kabarcık|cilt/i],
  vision: [/vision|blurr|eyes?\b|see(ing)? (double|spots)|floaters?/i, /görme|bulanık|göz|çift gör|uçuşan/i],
  sleep: [/slept? (badly|poorly|little)|insomnia|tired|exhausted|no sleep|didn'?t sleep/i, /uyuyama|uykusuz|az uyu|yorgun|bitkin/i],
  stress: [/stress|anxious|anxiety|overwhelm|tense|worried/i, /stres|kaygı|endişe|gergin|bunal/i],
  mood: [/sad|down|lonely|depress|irritab|angry|homesick|low mood/i, /üzgün|moralim bozuk|yalnız|sinirli|keyifsiz|özle/i],
  // Body pain other than a headache (headache has its own flag).
  pain: [/\bpain\b|\bsore\b|back ?ache|stomach ?ache|muscle ache|joint/i, /(bel|sırt|eklem|kas|diz|karın|boyun)(ım|im)? ?ağr|sızı|acıyor/i],
  nausea: [/nause|sick to my stomach|vomit|queasy/i, /mide bulan|kus|midem/i],
  breathing: [/breath|cough|wheez/i, /nefes|öksür|hırıltı/i],
  dizzy: [/dizz|light-?headed|vertigo|spinning/i, /baş dön|sersem|dönme/i],
}

export interface NoteEvaluation {
  flags: NoteFlag[]
  urgent: boolean
}

export function evaluateNoteOffline(note: string): NoteEvaluation {
  const text = note.slice(0, NOTE_MAX)
  const flags = NOTE_FLAGS.filter((f) => PATTERNS[f].some((re) => re.test(text)))
  return { flags, urgent: URGENT.some((re) => re.test(text)) }
}

export interface AiNoteResult {
  summary: string
  message: string
  flags: NoteFlag[]
  tellSurgeon: boolean
}

/** Schema check for the AI reflection; unknown flags are dropped, anything malformed is rejected. */
export function parseAiNote(x: unknown): AiNoteResult | null {
  if (!x || typeof x !== 'object') return null
  const o = x as Record<string, unknown>
  const str = (v: unknown) => typeof v === 'string' && v.trim().length > 0 && v.length <= 600
  if (!str(o.summary) || !str(o.message) || typeof o.tellSurgeon !== 'boolean' || !Array.isArray(o.flags)) return null
  const flags = (o.flags as unknown[]).filter((f): f is NoteFlag => typeof f === 'string' && (NOTE_FLAGS as readonly string[]).includes(f))
  return { summary: (o.summary as string).trim(), message: (o.message as string).trim(), flags: [...new Set(flags)], tellSurgeon: o.tellSurgeon }
}

/** The AI may only repeat numbers that the astronaut wrote. */
export function aiNoteNumbersGrounded(r: AiNoteResult, note: string): boolean {
  const nums = (s: string) => s.match(/\d+(?:[.,]\d+)?/g) ?? []
  const allowed = new Set(nums(note))
  return [...nums(r.summary), ...nums(r.message)].every((n) => allowed.has(n))
}

/** No medication names or doses in the AI text: the onboard protocol handles treatment. */
const DRUG_OR_DOSE = /\b\d+\s?(mg|mcg|µg|ml|iu|tablet|pill)s?\b|ibuprofen|paracetamol|acetaminophen|aspirin|melatonin|zolpidem|modafinil|antibiotic|antiviral|valacyclovir|steroid|parol|aspirin|ilaç|tablet|doz/i
export const aiNoteIsSafe = (r: AiNoteResult) => !DRUG_OR_DOSE.test(`${r.summary} ${r.message}`)
