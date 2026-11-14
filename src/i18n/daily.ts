// Strings for the extra daily-check steps (EN primary, TR secondary).
import type { Lang } from '../engine/types'
import { fmt } from './findings'

const en = {
  // Go / No-Go
  gngTitle: 'Go / No-Go',
  gngHelp: 'Press (or Space) as fast as you can when the circle is GREEN. Do NOT press when it is RED. 20 circles, about 40 seconds.',
  gngStart: 'Start',
  gngGo: 'GREEN — press',
  gngNoGo: 'RED — don’t press',
  gngWait: 'Get ready…',
  gngPress: 'Press',
  gngTrial: 'Circle {n} of {total}',
  gngResult: 'Pressed on red: {commission} · Missed green: {omission} · Mean reaction: {rt} ms',
  gngAgain: 'Run again',

  // Digit span
  spanTitle: 'Number memory',
  spanHelp: 'Watch the digits one at a time, then type them in the same order. Starts at 3 digits and grows by one each time you are right.',
  spanStart: 'Start',
  spanWatch: 'Watch…',
  spanType: 'Type the digits in order',
  spanCheck: 'Check',
  spanCorrect: 'Correct!',
  spanWrong: 'Not quite — try another one of the same length.',
  spanResult: 'You remembered {n} digits.',
  spanAgain: 'Run again',
  spanLabel: 'Digits you remember',

  // Self-report wizard
  qOf: 'Question {n} of {total}',
  qPrev: 'Previous question',
  qNext: 'Next question',

  // Note + AI
  noteTitle: 'Anything else?',
  noteHelp: 'Write in your own words how you feel or anything you noticed (optional). AstroTwin will suggest what to add to your check-in. You decide; nothing is changed automatically.',
  notePlaceholder: 'e.g. Slept badly, slight headache since lunch, eyes feel tired…',
  noteEvaluate: 'Evaluate',
  noteOffline: 'Offline check (keywords)',
  noteAi: 'AI reflection',
  noteAiWorking: 'AI is reading your note…',
  noteAiOff: 'Not sent to the AI: behavioural sharing is off in Privacy. Only the offline check was used.',
  noteAiFailed: 'The AI could not answer right now. The offline check is shown.',
  noteNone: 'Nothing in your note matches a check-in item.',
  noteFound: 'Your note mentions:',
  noteAdd: 'Add to check-in',
  noteAdded: 'Added',
  noteUrgent: 'Your note mentions something that should reach a person now: tell the crew medical officer.',
  noteTellSurgeon: 'The AI suggests telling the flight surgeon about this today.',
  noteRule: 'The AI only reflects your note. It does not score, diagnose or change your report tier.',
  'flag.headache': 'Headache',
  'flag.rash': 'Skin rash',
  'flag.vision': 'Eye or vision change',
  'flag.sleep': 'Poor sleep',
  'flag.stress': 'Stress',
  'flag.mood': 'Low mood',
  'flag.pain': 'Body pain',
  'flag.nausea': 'Nausea',
  'flag.breathing': 'Breathing',
  'flag.dizzy': 'Dizziness',

  // Step names in the daily flow
  stepGng: 'Go / No-Go',
  stepSpan: 'Number memory',
  stepNote: 'Your note',
}

export type DailyKey = keyof typeof en

const tr: Record<DailyKey, string> = {
  gngTitle: 'Dur / Geç',
  gngHelp: 'Daire YEŞİL olunca olabildiğince hızlı bas (ya da Boşluk). KIRMIZI olunca BASMA. 20 daire, yaklaşık 40 saniye.',
  gngStart: 'Başlat',
  gngGo: 'YEŞİL — bas',
  gngNoGo: 'KIRMIZI — basma',
  gngWait: 'Hazırlan…',
  gngPress: 'Bas',
  gngTrial: 'Daire {n}/{total}',
  gngResult: 'Kırmızıda basma: {commission} · Kaçırılan yeşil: {omission} · Ortalama tepki: {rt} ms',
  gngAgain: 'Tekrar çalıştır',

  spanTitle: 'Sayı belleği',
  spanHelp: 'Rakamları tek tek izle, sonra aynı sırayla yaz. 3 rakamla başlar, her doğru cevapta bir rakam uzar.',
  spanStart: 'Başlat',
  spanWatch: 'İzle…',
  spanType: 'Rakamları sırayla yaz',
  spanCheck: 'Kontrol et',
  spanCorrect: 'Doğru!',
  spanWrong: 'Tam değil — aynı uzunlukta bir tane daha dene.',
  spanResult: '{n} rakam hatırladın.',
  spanAgain: 'Tekrar çalıştır',
  spanLabel: 'Hatırladığın rakamlar',

  qOf: 'Soru {n}/{total}',
  qPrev: 'Önceki soru',
  qNext: 'Sonraki soru',

  noteTitle: 'Eklemek istediğin bir şey var mı?',
  noteHelp: 'Nasıl hissettiğini ya da fark ettiğin bir şeyi kendi cümlelerinle yaz (isteğe bağlı). AstroTwin kontrolüne neyi eklemen gerektiğini önerir. Kararı sen verirsin; hiçbir şey otomatik değişmez.',
  notePlaceholder: 'ör. Kötü uyudum, öğleden beri hafif baş ağrısı var, gözlerim yorgun…',
  noteEvaluate: 'Değerlendir',
  noteOffline: 'Çevrimdışı kontrol (anahtar kelime)',
  noteAi: 'AI değerlendirmesi',
  noteAiWorking: 'AI notunu okuyor…',
  noteAiOff: 'AI’a gönderilmedi: Gizlilik ayarında davranışsal paylaşım kapalı. Yalnızca çevrimdışı kontrol kullanıldı.',
  noteAiFailed: 'AI şu an cevap veremedi. Çevrimdışı kontrol gösteriliyor.',
  noteNone: 'Notunda kontrol listesine uyan bir şey yok.',
  noteFound: 'Notunda geçenler:',
  noteAdd: 'Kontrole ekle',
  noteAdded: 'Eklendi',
  noteUrgent: 'Notunda hemen bir kişiye ulaşması gereken bir şey var: mürettebat sağlık sorumlusuna söyle.',
  noteTellSurgeon: 'AI bunu bugün uçuş hekimine söylemeni öneriyor.',
  noteRule: 'AI yalnızca notunu yorumlar. Puan vermez, teşhis koymaz, rapor kademeni değiştirmez.',
  'flag.headache': 'Baş ağrısı',
  'flag.rash': 'Cilt döküntüsü',
  'flag.vision': 'Gözde ya da görmede değişiklik',
  'flag.sleep': 'Kötü uyku',
  'flag.stress': 'Stres',
  'flag.mood': 'Düşük moral',
  'flag.pain': 'Vücut ağrısı',
  'flag.nausea': 'Bulantı',
  'flag.breathing': 'Nefes',
  'flag.dizzy': 'Baş dönmesi',

  stepGng: 'Dur / Geç',
  stepSpan: 'Sayı belleği',
  stepNote: 'Notun',
}

const DICT: Record<Lang, Record<DailyKey, string>> = { en, tr }
export const dt = (lang: Lang, key: DailyKey, params?: Record<string, string | number>) => fmt(DICT[lang][key], params)
