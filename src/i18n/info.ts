// "Why this matters" cards: three plain-language lines per health indicator.
// No doses, no drug advice — only what the number is for, what can distort it,
// and when to bring it to the flight surgeon.
import type { Lang, MetricId } from '../engine/types'

export type InfoId = MetricId | 'co2' | 'dose' | 'exercise' | 'vision' | 'mood'

export interface InfoText {
  /** Why we measure it */
  why: string
  /** What can skew the reading */
  skew: string
  /** When to tell the flight surgeon */
  tell: string
}

const en: Record<InfoId, InfoText> = {
  restHr: {
    why: 'Your resting pulse shows how hard your heart works when you do nothing.',
    skew: 'Caffeine, a recent workout, stress or measuring right after waking up.',
    tell: 'If it stays clearly above your usual for three days, or you feel palpitations or dizziness.',
  },
  hrv: {
    why: 'The small changes between heartbeats show how well your body is recovering.',
    skew: 'A poor night, a hard workout the day before, or moving during the measurement.',
    tell: 'If it keeps falling for several days even though you rest.',
  },
  sleepH: {
    why: 'Sleep is when the body and the brain repair themselves. In space it gets shorter easily.',
    skew: 'Naps that are not logged, a loose wearable, or shifted work schedules.',
    tell: 'If you sleep much less than your usual for three nights, or you feel sleepy on duty.',
  },
  pvtMs: {
    why: 'Reaction time is an honest check of alertness. Tired people usually feel sharper than they are.',
    skew: 'Distractions, an unfamiliar device, or doing the test right after waking.',
    tell: 'If you are clearly slower than your own baseline on two tests in a row.',
  },
  lymph: {
    why: 'These white blood cells fight infections. Spaceflight and stress can lower them.',
    skew: 'A recent cold, hard exercise before the sample, or a sampling error.',
    tell: 'If the count keeps dropping, or you notice a rash, fever or sores.',
  },
  bodyMass: {
    why: 'Losing mass in space usually means losing muscle or not eating enough.',
    skew: 'How much you drank, when you ate, and the measuring device calibration.',
    tell: 'If you keep losing mass week after week without planning to.',
  },
  tempC: {
    why: 'Body temperature is an early sign of infection or of the body overheating.',
    skew: 'Exercise, a hot drink, where the sensor sits, or the time of day.',
    tell: 'If it stays above your usual at rest, or comes with chills, a rash or feeling unwell.',
  },
  glucose: {
    why: 'Blood sugar shows how your body handles energy. Less movement and poor sleep can push it up.',
    skew: 'Eating or drinking before the test, stress, or a cold finger.',
    tell: 'If fasting values stay outside your usual range for several days, or you feel shaky or very thirsty.',
  },
  spo2: {
    why: 'It shows how much oxygen your blood carries: a check on your lungs and on the cabin air.',
    skew: 'Cold hands, movement, or a sensor that does not sit well.',
    tell: 'If it stays low when re-measured at rest, or you feel short of breath.',
  },
  sysBp: {
    why: 'Blood pressure shows how your heart and vessels cope with fluid shifting toward the head.',
    skew: 'Talking, moving, a wrong cuff position, caffeine or stress.',
    tell: 'If it stays clearly off your usual, or you feel faint, get headaches or see spots.',
  },
  mskIndex: {
    why: 'Without gravity, bones and muscles weaken. This index tracks how well exercise is protecting them.',
    skew: 'A skipped or shortened exercise session, or an uneven test effort.',
    tell: 'If it drops faster than expected, or you have new bone or joint pain.',
  },
  co2: {
    why: 'In a closed cabin, exhaled CO₂ builds up. Too much causes headaches and slow thinking.',
    skew: 'Where you are in the cabin: poorly ventilated corners and sleep stations read higher.',
    tell: 'If you have headaches, feel foggy, or your vision changes while CO₂ is elevated.',
  },
  dose: {
    why: 'Radiation exposure adds up over a whole career, so every day is counted.',
    skew: 'Where you spend time in the vehicle, and whether the dosimeter is worn.',
    tell: 'After any solar storm alert, or if a dosimeter was not worn during an EVA.',
  },
  exercise: {
    why: 'Daily exercise is the main protection for bones, muscles and the heart in space.',
    skew: 'Sessions that are not logged, or equipment that was out of service.',
    tell: 'If pain, injury or workload keeps you from exercising for more than two days.',
  },
  vision: {
    why: 'Fluid shifting toward the head can press on the eyes and change vision in space.',
    skew: 'Tired eyes, screen glare, or testing both eyes at once instead of one at a time.',
    tell: 'If lines look wavy or blurred, or parts of the grid are missing, in either eye.',
  },
  mood: {
    why: 'How you feel matters as much as the numbers. Isolation wears people down slowly.',
    skew: 'A single bad day, or answering quickly without thinking about it.',
    tell: 'If you feel low, irritable or stressed for several days. This talk is private.',
  },
}

const tr: Record<InfoId, InfoText> = {
  restHr: {
    why: 'Dinlenik nabız, hiçbir şey yapmazken kalbinin ne kadar çalıştığını gösterir.',
    skew: 'Kafein, yeni yapılmış egzersiz, stres ya da uyanır uyanmaz ölçmek.',
    tell: 'Üç gün boyunca alışılmış değerinin belirgin üstünde kalırsa ya da çarpıntı, baş dönmesi olursa.',
  },
  hrv: {
    why: 'Kalp atışları arasındaki küçük farklar, vücudunun ne kadar iyi toparlandığını gösterir.',
    skew: 'Kötü bir gece, önceki gün ağır egzersiz ya da ölçüm sırasında hareket etmek.',
    tell: 'Dinlenmene rağmen birkaç gün üst üste düşmeye devam ederse.',
  },
  sleepH: {
    why: 'Vücut ve beyin kendini uykuda onarır. Uzayda uyku kolayca kısalır.',
    skew: 'Kaydedilmeyen şekerlemeler, gevşek takılan cihaz ya da kayan vardiya saatleri.',
    tell: 'Üç gece alışılmışından çok az uyursan ya da görevde uykun gelirse.',
  },
  pvtMs: {
    why: 'Tepki süresi uyanıklığın dürüst bir ölçüsüdür. Yorgun insan kendini olduğundan zinde hisseder.',
    skew: 'Dikkat dağıtan şeyler, alışık olmadığın bir cihaz ya da uyanır uyanmaz test yapmak.',
    tell: 'Arka arkaya iki testte kendi baseline’ından belirgin yavaşsan.',
  },
  lymph: {
    why: 'Bu akyuvarlar enfeksiyonla savaşır. Uzay uçuşu ve stres sayılarını düşürebilir.',
    skew: 'Yeni geçirilmiş soğuk algınlığı, örnekten önce ağır egzersiz ya da örnekleme hatası.',
    tell: 'Sayı düşmeye devam ederse ya da döküntü, ateş, yara fark edersen.',
  },
  bodyMass: {
    why: 'Uzayda kütle kaybı çoğu zaman kas kaybı ya da yetersiz beslenme demektir.',
    skew: 'Ne kadar su içtiğin, ne zaman yediğin ve ölçüm cihazının kalibrasyonu.',
    tell: 'Planlamadığın halde haftalarca kütle kaybetmeye devam edersen.',
  },
  tempC: {
    why: 'Vücut ısısı, enfeksiyonun ya da vücudun aşırı ısınmasının erken işaretidir.',
    skew: 'Egzersiz, sıcak içecek, sensörün durduğu yer ya da günün saati.',
    tell: 'Dinlenirken alışılmışın üstünde kalırsa ya da titreme, döküntü, kırgınlık eşlik ederse.',
  },
  glucose: {
    why: 'Kan şekeri vücudunun enerjiyi nasıl kullandığını gösterir. Az hareket ve kötü uyku onu yükseltebilir.',
    skew: 'Testten önce yemek ya da içmek, stres ya da soğuk parmak.',
    tell: 'Açlık değerleri birkaç gün alışılmış aralığın dışında kalırsa ya da titreme, aşırı susama olursa.',
  },
  spo2: {
    why: 'Kanının ne kadar oksijen taşıdığını gösterir: hem akciğerlerin hem kabin havasının kontrolüdür.',
    skew: 'Soğuk eller, hareket ya da iyi oturmayan sensör.',
    tell: 'Dinlenirken tekrar ölçtüğünde de düşük kalırsa ya da nefes darlığı hissedersen.',
  },
  sysBp: {
    why: 'Tansiyon, kalbinin ve damarlarının başa doğru kayan sıvıyla nasıl başa çıktığını gösterir.',
    skew: 'Konuşmak, hareket etmek, manşonun yanlış durması, kafein ya da stres.',
    tell: 'Alışılmışından belirgin farklı kalırsa ya da bayılma hissi, baş ağrısı, gözde benekler olursa.',
  },
  mskIndex: {
    why: 'Yerçekimi olmadan kemik ve kaslar zayıflar. Bu endeks egzersizin onları ne kadar koruduğunu izler.',
    skew: 'Atlanan ya da kısa kesilen egzersiz, testte eşit olmayan efor.',
    tell: 'Beklenenden hızlı düşerse ya da yeni kemik, eklem ağrın olursa.',
  },
  co2: {
    why: 'Kapalı kabinde nefesle verilen CO₂ birikir. Fazlası baş ağrısı ve yavaş düşünme yapar.',
    skew: 'Kabinde bulunduğun yer: az havalanan köşeler ve uyku istasyonları daha yüksek ölçer.',
    tell: 'CO₂ yüksekken baş ağrın olursa, kafan bulanırsa ya da görmen değişirse.',
  },
  dose: {
    why: 'Radyasyon maruziyeti tüm kariyer boyunca birikir; bu yüzden her gün sayılır.',
    skew: 'Araçta vakit geçirdiğin yer ve dozimetrenin takılı olup olmadığı.',
    tell: 'Her güneş fırtınası uyarısından sonra ya da bir EVA’da dozimetre takılmadıysa.',
  },
  exercise: {
    why: 'Günlük egzersiz uzayda kemik, kas ve kalbin başlıca korumasıdır.',
    skew: 'Kaydedilmeyen seanslar ya da servis dışı kalan ekipman.',
    tell: 'Ağrı, sakatlık ya da iş yükü iki günden fazla egzersizi engellerse.',
  },
  vision: {
    why: 'Başa doğru kayan sıvı uzayda göze baskı yapıp görmeyi değiştirebilir.',
    skew: 'Yorgun gözler, ekran parlaması ya da gözleri tek tek yerine birlikte test etmek.',
    tell: 'Herhangi bir gözde çizgiler dalgalı ya da bulanık görünürse, ızgaranın bir kısmı eksikse.',
  },
  mood: {
    why: 'Nasıl hissettiğin sayılar kadar önemlidir. İzolasyon insanı yavaş yavaş yıpratır.',
    skew: 'Tek bir kötü gün ya da üzerinde düşünmeden hızlı cevaplamak.',
    tell: 'Birkaç gün üst üste keyifsiz, gergin ya da stresli hissedersen. Bu görüşme gizlidir.',
  },
}

export const INFO: Record<Lang, Record<InfoId, InfoText>> = { en, tr }
