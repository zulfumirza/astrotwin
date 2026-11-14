// EN/TR texts for engine findings. Every alert answers four questions:
// what happened, why it matters, what to do, and which NASA source backs it.
import type { Finding, HazardId, Lang, Level, MetricId, Tier } from '../engine/types'

export interface FindingText {
  title: string
  what: string
  why: string
  action: string
}

export const fmt = (template: string, params: Record<string, string | number> = {}) =>
  template.replace(/\{(\w+)\}/g, (_, k) => (k in params ? String(params[k]) : `{${k}}`))

export const METRIC_NAMES: Record<Lang, Record<MetricId, string>> = {
  en: {
    restHr: 'Resting heart rate',
    hrv: 'Heart rate variability',
    sleepH: 'Sleep duration',
    pvtMs: 'Reaction time (PVT)',
    lymph: 'Lymphocytes',
    bodyMass: 'Body mass',
  },
  tr: {
    restHr: 'Dinlenik nabız',
    hrv: 'Kalp hızı değişkenliği',
    sleepH: 'Uyku süresi',
    pvtMs: 'Tepki süresi (PVT)',
    lymph: 'Lenfosit',
    bodyMass: 'Vücut kütlesi',
  },
}

export const HAZARD_NAMES: Record<Lang, Record<HazardId, string>> = {
  en: {
    radiation: 'Space radiation',
    isolation: 'Isolation & confinement',
    distance: 'Distance from Earth',
    gravity: 'Gravity fields',
    environment: 'Hostile / closed environment',
  },
  tr: {
    radiation: 'Uzay radyasyonu',
    isolation: 'İzolasyon ve kapalı alan',
    distance: "Dünya'dan uzaklık",
    gravity: 'Yerçekimi alanları',
    environment: 'Düşmanca / kapalı ortam',
  },
}

export const TIER_NAMES: Record<Lang, Record<Tier, string>> = {
  en: { routine: 'Routine', anomaly: 'Anomaly', critical: 'Critical' },
  tr: { routine: 'Rutin', anomaly: 'Anomali', critical: 'Kritik' },
}

export const LEVEL_NAMES: Record<Lang, Record<Level, string>> = {
  en: { nominal: 'Nominal', watch: 'Watch', alert: 'Alert', critical: 'Critical' },
  tr: { nominal: 'Normal', watch: 'İzlemde', alert: 'Uyarı', critical: 'Kritik' },
}

const METRIC_WHY: Record<Lang, Record<MetricId, string>> = {
  en: {
    restHr: 'A rising resting pulse beyond the expected fluid-shift adaptation can signal deconditioning, dehydration or illness.',
    hrv: 'Falling HRV reflects accumulating stress and poor recovery before the person feels it.',
    sleepH: 'Chronic sleep loss degrades attention, mood and immune function on long missions.',
    pvtMs: 'Slower reaction time is an early, objective sign of fatigue that people consistently under-report.',
    lymph: 'Spaceflight dysregulates immunity; falling lymphocytes raise infection and viral reactivation risk.',
    bodyMass: 'Unplanned mass loss in microgravity points to muscle/bone loss or insufficient nutrition.',
  },
  tr: {
    restHr: 'Beklenen sıvı kayması adaptasyonunun ötesinde yükselen dinlenik nabız; kondisyon kaybı, dehidrasyon ya da hastalık işareti olabilir.',
    hrv: 'Düşen HRV, kişi hissetmeden önce biriken stresi ve yetersiz toparlanmayı gösterir.',
    sleepH: 'Kronik uyku kaybı uzun görevlerde dikkati, ruh halini ve bağışıklığı bozar.',
    pvtMs: 'Yavaşlayan tepki süresi, insanların sürekli olduğundan az bildirdiği yorgunluğun erken ve nesnel işaretidir.',
    lymph: 'Uzay uçuşu bağışıklığı bozar; düşen lenfosit enfeksiyon ve virüs reaktivasyonu riskini artırır.',
    bodyMass: 'Mikro yerçekiminde plansız kütle kaybı kas/kemik kaybına ya da yetersiz beslenmeye işaret eder.',
  },
}

const METRIC_ACTION: Record<Lang, Record<MetricId, string>> = {
  en: {
    restHr: 'Onboard protocol: check hydration, repeat the measurement after rest, log exercise load.',
    hrv: 'Onboard protocol: schedule a recovery block and re-measure tomorrow morning.',
    sleepH: 'Onboard protocol: protect an 8-hour sleep window tonight, dim lights 1 h before, no late tasks.',
    pvtMs: 'Onboard protocol: repeat the PVT after rest; postpone safety-critical tasks or use a buddy check.',
    lymph: 'Onboard protocol: repeat the blood count, review stress and sleep, inspect skin and mucosa.',
    bodyMass: 'Onboard protocol: review caloric intake and resistive exercise compliance.',
  },
  tr: {
    restHr: 'Araç içi protokol: sıvı alımını kontrol et, dinlendikten sonra ölçümü tekrarla, egzersiz yükünü kaydet.',
    hrv: 'Araç içi protokol: toparlanma bloğu planla ve yarın sabah yeniden ölç.',
    sleepH: 'Araç içi protokol: bu gece 8 saatlik uyku penceresini koru, 1 saat önce ışıkları kıs, geç görev alma.',
    pvtMs: 'Araç içi protokol: dinlendikten sonra PVT’yi tekrarla; kritik görevleri ertele ya da ikinci kişi kontrolü kullan.',
    lymph: 'Araç içi protokol: kan sayımını tekrarla, stres ve uykuyu gözden geçir, cilt ve mukozayı kontrol et.',
    bodyMass: 'Araç içi protokol: kalori alımını ve dirençli egzersiz uyumunu gözden geçir.',
  },
}

type Dict = Record<string, FindingText>

const EN: Dict = {
  metric: {
    title: '{metric} off personal trajectory',
    what: '{metric} is {value} {unit}; your expected space value is {expected} {unit} (z = {z}).',
    why: '',
    action: '',
  },
  'event.co2': {
    title: 'Cabin CO₂ elevated',
    what: 'Cabin CO₂ has averaged {co2} mmHg over 3 days (threshold {limit} mmHg).',
    why: 'In a closed cabin, elevated CO₂ causes headache and slows thinking, and it worsens other risks.',
    action: 'Onboard protocol: check the CO₂ scrubber, increase airflow in sleep stations, log symptoms.',
  },
  'event.vision': {
    title: 'Visual change reported',
    what: 'The Amsler grid self-test showed distortion or a visual change was reported.',
    why: 'Fluid shift toward the head in microgravity can alter the eye (SANS).',
    action: 'Onboard protocol: repeat the Amsler test for each eye tomorrow and record acuity.',
  },
  'event.rash': {
    title: 'Skin rash reported',
    what: 'A new skin rash was reported today.',
    why: 'Rashes are among the most common in-flight complaints and can mark viral reactivation.',
    action: 'Onboard protocol: photograph the area, note location and pain, avoid shared towels.',
  },
  'event.sep': {
    title: 'Solar particle event in progress',
    what: 'Energetic proton flux is above the storm threshold (≥10 MeV ≥ 10 pfu).',
    why: 'Solar particle events can deliver in hours a dose that normally takes weeks.',
    action: 'Onboard protocol: stay in the best-shielded area, cancel EVA preparations, wear dosimeters.',
  },
  'event.dose': {
    title: 'Career dose budget',
    what: 'Cumulative dose is {dose} mSv, {pct}% of the 600 mSv career limit.',
    why: 'Radiation risk is cumulative; the remaining budget limits future exposure.',
    action: 'Onboard protocol: prefer shielded sleep quarters and minimise optional EVA time.',
  },
  'event.autonomy': {
    title: 'Earth cannot answer in real time',
    what: 'A question to Mission Control takes about {roundTripMin} minutes round trip.',
    why: 'At this distance the crew must start the correct response before Earth even hears about it.',
    action: 'Follow the onboard protocol now; the SBAR report is already queued for Earth.',
  },
  'rule.judgment': {
    title: 'Judgment impairment risk',
    what: '{hits} of 3 factors are present: sleep debt {debt} h over 7 days, reaction time {pvt} ms (expected {pvtBase} ms), cabin CO₂ {co2} mmHg.',
    why: 'Sleep loss, slowed reactions and high CO₂ each dull thinking; together they multiply the chance of an operational error.',
    action: 'Onboard protocol: stand down from safety-critical tasks, hand over to a rested crewmate, restore CO₂ scrubbing and take a protected sleep period.',
  },
  'rule.conflict': {
    title: 'Self-report contradicts measurements',
    what: 'The crew member reports feeling fine (mood {mood}/5) while {count} objective measures are declining.',
    why: 'People adapt to gradual decline and stop noticing it; this gap is exactly when an outside check is needed.',
    action: 'Onboard protocol: private check-in with the crew medical officer and a repeat objective test.',
  },
  'rule.sepEva': {
    title: 'Solar particle event during EVA',
    what: 'A solar energetic particle event has started while this crew member is outside the vehicle.',
    why: 'A spacesuit gives almost no shielding; dose climbs quickly as high-energy protons arrive.',
    action: 'Onboard protocol: terminate EVA and ingress now, move to the storm shelter, start dosimetry logging.',
  },
  'rule.virus': {
    title: 'Latent virus reactivation suspected',
    what: '{hits} of 3 factors are present: sustained stress ({stress}/5), lymphocytes {lymph} (expected {lymphBase}) ×10⁹/L, skin rash.',
    why: 'Stress and immune suppression in flight reactivate latent herpes viruses (e.g. shingles); early treatment matters.',
    action: 'Onboard protocol: examine and photograph the rash, begin the antiviral protocol from the medical kit if confirmed, reduce workload.',
  },
  'rule.sans': {
    title: 'Vision change with elevated CO₂ (SANS)',
    what: 'A visual change was detected while cabin CO₂ is {co2} mmHg.',
    why: 'Headward fluid shift plus high CO₂ raises pressure on the optic nerve; untreated changes can persist after flight.',
    action: 'Onboard protocol: lower cabin CO₂, repeat Amsler and acuity tests per eye, schedule onboard eye imaging.',
  },
}

const TR: Dict = {
  metric: {
    title: '{metric} kişisel yörüngeden saptı',
    what: '{metric} {value} {unit}; senin beklenen uzay değerin {expected} {unit} (z = {z}).',
    why: '',
    action: '',
  },
  'event.co2': {
    title: 'Kabin CO₂ yüksek',
    what: 'Kabin CO₂ ortalaması 3 gündür {co2} mmHg (eşik {limit} mmHg).',
    why: 'Kapalı kabinde yüksek CO₂ baş ağrısı yapar, düşünmeyi yavaşlatır ve diğer riskleri ağırlaştırır.',
    action: 'Araç içi protokol: CO₂ temizleyiciyi kontrol et, uyku istasyonlarında hava akışını artır, belirtileri kaydet.',
  },
  'event.vision': {
    title: 'Görme değişikliği bildirildi',
    what: 'Amsler ızgarası öz-testinde bozulma görüldü ya da görme değişikliği bildirildi.',
    why: 'Mikro yerçekiminde sıvının başa doğru kayması gözü etkileyebilir (SANS).',
    action: 'Araç içi protokol: yarın her göz için Amsler testini tekrarla ve görme keskinliğini kaydet.',
  },
  'event.rash': {
    title: 'Cilt döküntüsü bildirildi',
    what: 'Bugün yeni bir cilt döküntüsü bildirildi.',
    why: 'Döküntü uçuşta en sık görülen şikâyetlerdendir ve virüs reaktivasyonunun işareti olabilir.',
    action: 'Araç içi protokol: bölgeyi fotoğrafla, yerini ve ağrıyı not et, ortak havlu kullanma.',
  },
  'event.sep': {
    title: 'Güneş parçacık olayı sürüyor',
    what: 'Enerjik proton akısı fırtına eşiğinin üzerinde (≥10 MeV ≥ 10 pfu).',
    why: 'Güneş parçacık olayları normalde haftalar süren dozu saatler içinde verebilir.',
    action: 'Araç içi protokol: en iyi zırhlanmış bölümde kal, EVA hazırlıklarını iptal et, dozimetre tak.',
  },
  'event.dose': {
    title: 'Kariyer doz bütçesi',
    what: 'Birikimli doz {dose} mSv; 600 mSv kariyer sınırının %{pct}’i.',
    why: 'Radyasyon riski birikimlidir; kalan bütçe gelecekteki maruziyeti sınırlar.',
    action: 'Araç içi protokol: zırhlı uyku bölmesini tercih et, zorunlu olmayan EVA süresini azalt.',
  },
  'event.autonomy': {
    title: 'Dünya gerçek zamanlı cevap veremez',
    what: 'Görev Kontrol’e sorulan bir sorunun gidiş-dönüşü yaklaşık {roundTripMin} dakika sürüyor.',
    why: 'Bu uzaklıkta mürettebat doğru tepkiyi, Dünya daha haberi almadan başlatmak zorunda.',
    action: 'Şimdi araç içi protokolü uygula; SBAR raporu Dünya için zaten sıraya alındı.',
  },
  'rule.judgment': {
    title: 'Muhakeme bozulması riski',
    what: '3 etkenden {hits} tanesi mevcut: 7 günde {debt} saat uyku borcu, tepki süresi {pvt} ms (beklenen {pvtBase} ms), kabin CO₂ {co2} mmHg.',
    why: 'Uyku kaybı, yavaşlayan tepki ve yüksek CO₂ tek tek düşünmeyi köreltir; birlikte operasyonel hata olasılığını katlar.',
    action: 'Araç içi protokol: kritik görevlerden çekil, dinlenmiş bir mürettebata devret, CO₂ temizlemeyi düzelt ve korunmuş bir uyku dönemi al.',
  },
  'rule.conflict': {
    title: 'Beyan ile ölçüm çelişiyor',
    what: 'Mürettebat iyi olduğunu söylüyor (ruh hali {mood}/5), ancak {count} nesnel ölçüm düşüş gösteriyor.',
    why: 'İnsan yavaş düşüşe alışır ve fark etmez; dışarıdan kontrol tam da bu boşlukta gerekir.',
    action: 'Araç içi protokol: mürettebat sağlık sorumlusuyla birebir görüşme ve nesnel testin tekrarı.',
  },
  'rule.sepEva': {
    title: 'EVA sırasında güneş parçacık olayı',
    what: 'Bu mürettebat araç dışındayken bir güneş enerjik parçacık olayı başladı.',
    why: 'Uzay giysisi neredeyse hiç zırh sağlamaz; yüksek enerjili protonlar geldikçe doz hızla artar.',
    action: 'Araç içi protokol: EVA’yı hemen sonlandır ve içeri gir, fırtına sığınağına geç, dozimetri kaydını başlat.',
  },
  'rule.virus': {
    title: 'Gizli virüs reaktivasyonu şüphesi',
    what: '3 etkenden {hits} tanesi mevcut: süregelen stres ({stress}/5), lenfosit {lymph} (beklenen {lymphBase}) ×10⁹/L, cilt döküntüsü.',
    why: 'Uçuşta stres ve bağışıklık baskılanması gizli herpes virüslerini (ör. zona) yeniden etkinleştirir; erken tedavi önemlidir.',
    action: 'Araç içi protokol: döküntüyü incele ve fotoğrafla, doğrulanırsa tıbbi kitteki antiviral protokolü başlat, iş yükünü azalt.',
  },
  'rule.sans': {
    title: 'Yüksek CO₂ ile görme değişikliği (SANS)',
    what: 'Kabin CO₂ {co2} mmHg iken görme değişikliği saptandı.',
    why: 'Başa doğru sıvı kayması ve yüksek CO₂ optik sinir üzerindeki basıncı artırır; tedavi edilmeyen değişiklikler uçuştan sonra kalıcı olabilir.',
    action: 'Araç içi protokol: kabin CO₂’sini düşür, her göz için Amsler ve keskinlik testini tekrarla, araç içi göz görüntülemesi planla.',
  },
}

const DICTS: Record<Lang, Dict> = { en: EN, tr: TR }

export function findingText(f: Finding, lang: Lang): FindingText {
  if (f.kind === 'metric') {
    const metricId = f.id.replace('metric.', '') as MetricId
    const base = DICTS[lang].metric
    const params = { ...f.params, metric: METRIC_NAMES[lang][metricId] }
    return {
      title: fmt(base.title, params),
      what: fmt(base.what, params),
      why: METRIC_WHY[lang][metricId],
      action: METRIC_ACTION[lang][metricId],
    }
  }
  const t = DICTS[lang][f.id]
  return {
    title: fmt(t.title, f.params),
    what: fmt(t.what, f.params),
    why: fmt(t.why, f.params),
    action: fmt(t.action, f.params),
  }
}
