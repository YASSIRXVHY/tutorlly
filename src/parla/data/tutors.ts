/**
 * The teaching staff — twelve hand-authored tutors across eleven languages.
 * Prices, ratings and biographies are fixed data; anything probabilistic
 * (review corpora, slot availability) is derived from these ids via seeded RNG.
 */
import type { Language } from "./languages";
import { languageByCode } from "./languages";

export const SPECIALTIES = [
  "Business",
  "Exam prep",
  "Conversation",
  "Grammar",
  "Pronunciation",
  "Beginners",
  "Kids",
  "Travel",
  "Literature",
  "Interview prep",
] as const;

export type Specialty = (typeof SPECIALTIES)[number];

export type Level = "Native" | "C2" | "C1" | "B2" | "B1" | "A2" | "A1";

export interface Spoken {
  lang: string; // language code
  level: Level;
}

export interface CaptionLine {
  /** The line spoken in the tutor's teaching language. */
  line: string;
  /** English subtitle (with pronunciation for non-Latin scripts). */
  en: string;
}

export interface Tutor {
  id: string;
  name: string;
  firstName: string;
  city: string;
  country: string;
  cc: string; // two-letter country code, printed like a timetable stamp
  lang: string; // teaching language code
  native: boolean;
  price: number; // USD per 50-minute lesson
  rating: number;
  lessonsTaught: number;
  students: number;
  since: number;
  responseHrs: number;
  specialties: Specialty[];
  alsoSpeaks: Spoken[];
  tagline: string;
  bio: [string, string];
  video: CaptionLine[];
  /** 0..1 — density of open slots in the availability grid. */
  openness: number;
  trial: boolean;
  portrait: string;
}

export const TUTORS: Tutor[] = [
  {
    id: "mariana",
    name: "Mariana Costa",
    firstName: "Mariana",
    city: "Buenos Aires",
    country: "Argentina",
    cc: "AR",
    lang: "es",
    native: true,
    price: 18,
    rating: 4.9,
    lessonsTaught: 2341,
    students: 214,
    since: 2016,
    responseHrs: 2,
    specialties: ["Conversation", "Business", "Travel"],
    alsoSpeaks: [
      { lang: "es", level: "Native" },
      { lang: "en", level: "C1" },
      { lang: "it", level: "B2" },
    ],
    tagline: "Porteño Spanish without the accent anxiety.",
    bio: [
      "I spent eight years as a radio journalist in Buenos Aires before teaching, which means two things: I have opinions about pronunciation, and I never let a student finish a sentence with “ehh”. We build Porteño Spanish — voseo and all — from the news, the music and the milonga, not from tourist phrasebooks.",
      "My students range from diplomats who need to stop sounding like textbooks to partners of Argentines who want to survive a Sunday asado. Beginners welcome; perfectionism optional.",
    ],
    video: [
      {
        line: "¡Hola! Soy Mariana, y te enseño el castellano que se habla en Buenos Aires.",
        en: "Hi! I'm Mariana, and I teach the Spanish actually spoken in Buenos Aires.",
      },
      {
        line: "En mi clase no hay exámenes sorpresa: hay conversación, música y mate.",
        en: "In my class there are no surprise quizzes: there's conversation, music, and mate.",
      },
      {
        line: "Si podés decir la “ll” como “sh”, ya estás a mitad de camino.",
        en: "If you can say “ll” like “sh”, you're already halfway to Porteño.",
      },
      {
        line: "Empecemos: la primera clase va a mitad de precio, sin compromiso.",
        en: "Let's begin: the first lesson is half price, no strings attached.",
      },
    ],
    openness: 0.8,
    trial: true,
    portrait: "/tutors/mariana.png",
  },
  {
    id: "alejandro",
    name: "Alejandro Vega",
    firstName: "Alejandro",
    city: "Madrid",
    country: "Spain",
    cc: "ES",
    lang: "es",
    native: true,
    price: 24,
    rating: 4.8,
    lessonsTaught: 1176,
    students: 156,
    since: 2019,
    responseHrs: 5,
    specialties: ["Exam prep", "Grammar", "Kids"],
    alsoSpeaks: [
      { lang: "es", level: "Native" },
      { lang: "en", level: "C1" },
      { lang: "fr", level: "A2" },
    ],
    tagline: "DELE prep that feels less like a cliff.",
    bio: [
      "I teach Spanish the way buildings in Madrid go up: grammar first, with proper foundations, then floors. Since 2019 I've walked more than a hundred students through the DELE — A1 hopefuls to C2 masochists — with past papers, timed drills and examiner-style feedback.",
      "Off-duty I'm a father of two, so I also teach kids, my most honest critics. If a ten-year-old can conjugate haber because of my racing-tortoise game, so can you.",
    ],
    video: [
      {
        line: "Buenas, soy Alejandro, profesor de español en Madrid desde 2019.",
        en: "Good day, I'm Alejandro, teaching Spanish in Madrid since 2019.",
      },
      {
        line: "Preparo el DELE desde A1 hasta C2, con simulacros de examen de verdad.",
        en: "I coach DELE from A1 to C2, with genuine mock exams.",
      },
      {
        line: "Mi método: gramática con cimientos, práctica sin miedo.",
        en: "My method: grammar with foundations, practice without fear.",
      },
      {
        line: "Nos vemos en la pizarra.",
        en: "See you at the whiteboard.",
      },
    ],
    openness: 0.55,
    trial: true,
    portrait: "/tutors/alejandro.png",
  },
  {
    id: "camille",
    name: "Camille Laurent",
    firstName: "Camille",
    city: "Lyon",
    country: "France",
    cc: "FR",
    lang: "fr",
    native: true,
    price: 22,
    rating: 4.9,
    lessonsTaught: 2890,
    students: 301,
    since: 2015,
    responseHrs: 1,
    specialties: ["Conversation", "Pronunciation", "Literature"],
    alsoSpeaks: [
      { lang: "fr", level: "Native" },
      { lang: "en", level: "C2" },
      { lang: "es", level: "B1" },
    ],
    tagline: "French with the smell of a good bookshop.",
    bio: [
      "I'm a bookseller turned teacher from Lyon, which explains a lot: my lessons smell of the second-hand shelf rather than the textbook aisle. We read, we argue, we laugh — and somewhere in between you start speaking French with real Lyon vowels.",
      "Pronunciation is my obsession. The French “r” is not a monster, whatever school told you; it's a muscle, and muscles get trained.",
    ],
    video: [
      {
        line: "Bonjour ! Moi, c'est Camille, de Lyon.",
        en: "Hello! I'm Camille, from Lyon.",
      },
      {
        line: "On travaillera la prononciation — le « r » n'est pas un monstre, promis.",
        en: "We'll work pronunciation — the French “r” is not a monster, promise.",
      },
      {
        line: "Mes cours sentent la librairie, pas le manuel scolaire.",
        en: "My lessons smell of the bookshop, not the schoolbook.",
      },
      {
        line: "À très vite dans la salle de classe.",
        en: "See you very soon in the classroom.",
      },
    ],
    openness: 0.5,
    trial: true,
    portrait: "/tutors/camille.png",
  },
  {
    id: "klaus",
    name: "Klaus Weber",
    firstName: "Klaus",
    city: "Vienna",
    country: "Austria",
    cc: "AT",
    lang: "de",
    native: true,
    price: 26,
    rating: 4.7,
    lessonsTaught: 1654,
    students: 122,
    since: 2013,
    responseHrs: 4,
    specialties: ["Business", "Grammar", "Exam prep"],
    alsoSpeaks: [
      { lang: "de", level: "Native" },
      { lang: "en", level: "C2" },
      { lang: "it", level: "B1" },
    ],
    tagline: "Ordnung in your grammar, Gemütlichkeit in the lesson.",
    bio: [
      "Twenty years in Vienna's banking district taught me Business German the way it's actually wielded — register, jargon, and the delicate art of the polite German “no”. Since 2013 I've coached professionals through presentations, negotiations and the ÖSD certificates.",
      "My classroom has rules (Austrian, after all) but no fear. Dative, accusative and genitive are guests, not intruders: we give each case a chair, and we proceed in Gemütlichkeit.",
    ],
    video: [
      {
        line: "Guten Tag, hier ist Klaus aus Wien.",
        en: "Good day, this is Klaus from Vienna.",
      },
      {
        line: "Ordnung in der Grammatik, Gemütlichkeit im Unterricht.",
        en: "Order in the grammar, coziness in the lesson.",
      },
      {
        line: "Wir üben Fälle, Verben und wienerische Höflichkeit.",
        en: "We practise cases, verbs, and Viennese politeness.",
      },
      {
        line: "Bis bald im Kursraum.",
        en: "See you soon in the classroom.",
      },
    ],
    openness: 0.45,
    trial: false,
    portrait: "/tutors/klaus.png",
  },
  {
    id: "giulia",
    name: "Giulia Romano",
    firstName: "Giulia",
    city: "Rome",
    country: "Italy",
    cc: "IT",
    lang: "it",
    native: true,
    price: 19,
    rating: 4.8,
    lessonsTaught: 1108,
    students: 145,
    since: 2018,
    responseHrs: 2,
    specialties: ["Conversation", "Travel", "Beginners"],
    alsoSpeaks: [
      { lang: "it", level: "Native" },
      { lang: "en", level: "C2" },
      { lang: "es", level: "B2" },
    ],
    tagline: "Roman hospitality, Italian grammar.",
    bio: [
      "Roman, proud of it, allergic to boring lessons. I teach the Italian people actually speak on a Tuesday: the espresso order, the argument about parking, the compliment to the nonna. Textbook Italian is on the menu, but I recommend the daily special.",
      "Conversation first, grammar exactly when you need it. My record is a student who ordered dinner in Trastevere after lesson four — with no gestures. An Italian miracle.",
    ],
    video: [
      {
        line: "Ciao! Sono Giulia, di Roma.",
        en: "Hi! I'm Giulia, from Rome.",
      },
      {
        line: "Con me impari l'italiano che si parla davvero, tra un caffè e l'altro.",
        en: "With me you learn the Italian really spoken, one coffee at a time.",
      },
      {
        line: "La grammatica la facciamo solo quando serve, te lo prometto.",
        en: "Grammar only when it's actually needed — I promise.",
      },
      {
        line: "Ci vediamo in classe: porta le domande, io porto la pazienza.",
        en: "See you in class: bring the questions, I'll bring the patience.",
      },
    ],
    openness: 0.7,
    trial: true,
    portrait: "/tutors/giulia.png",
  },
  {
    id: "kenji",
    name: "Kenji Tanaka",
    firstName: "Kenji",
    city: "Osaka",
    country: "Japan",
    cc: "JP",
    lang: "ja",
    native: true,
    price: 30,
    rating: 4.9,
    lessonsTaught: 3210,
    students: 389,
    since: 2011,
    responseHrs: 3,
    specialties: ["Exam prep", "Grammar", "Business"],
    alsoSpeaks: [
      { lang: "ja", level: "Native" },
      { lang: "en", level: "C1" },
      { lang: "ko", level: "A2" },
    ],
    tagline: "Structured Japanese, zero shortcuts, full patience.",
    bio: [
      "I have taught Japanese since 2011, from Osaka, politely and without shortcuts. My lessons have a spine: warm-up review, target grammar drilled, then free conversation while I take notes on what we fix next time. You always know what you're doing, and why.",
      "JLPT students get past papers under real clock conditions. Business students get keigo that won't embarrass them in front of a client. Everyone gets patience, which Osaka keeps in stock.",
    ],
    video: [
      {
        line: "こんにちは、大阪のたなかけんじです。",
        en: "Hello, I'm Kenji Tanaka from Osaka. (Konnichiwa, Osaka no Tanaka Kenji desu.)",
      },
      {
        line: "ていねいに、すこしずつ。それが上達のコツです。",
        en: "Politely, little by little — that is the trick to progress. (Teinei ni, sukoshizutsu.)",
      },
      {
        line: "JLPTの過去問で、本番の緊張をなくしましょう。",
        en: "Let's kill the exam-day nerves with real JLPT past papers.",
      },
      {
        line: "いっしょにがんばりましょう。",
        en: "Let's work hard together. (Issho ni ganbarimashou.)",
      },
    ],
    openness: 0.4,
    trial: false,
    portrait: "/tutors/kenji.png",
  },
  {
    id: "jiwoo",
    name: "Ji-woo Park",
    firstName: "Ji-woo",
    city: "Seoul",
    country: "South Korea",
    cc: "KR",
    lang: "ko",
    native: true,
    price: 21,
    rating: 4.8,
    lessonsTaught: 876,
    students: 102,
    since: 2020,
    responseHrs: 1,
    specialties: ["Conversation", "Pronunciation", "Beginners"],
    alsoSpeaks: [
      { lang: "ko", level: "Native" },
      { lang: "en", level: "C1" },
      { lang: "ja", level: "B1" },
    ],
    tagline: "Korean the way the dramas actually speak it.",
    bio: [
      " dramas built my method. We study the expressions Seoul actually uses — the sighs, the comebacks, the plot twists — and drill pronunciation until your annyeonghaseyo stops sounding like a question. Grammar rides along quietly, the way it does in real life.",
      "Beginners are my specialty: we start with hangul, which you'll be reading by lesson three, and confidence, which I supply by the drumload.",
    ],
    video: [
      {
        line: "안녕하세요! 서울에서 만나요.",
        en: "Hello! We meet from Seoul. (Annyeonghaseyo! Seoul-eseo mannayo.)",
      },
      {
        line: "드라마 표현 그대로 연습해요.",
        en: "We practise expressions exactly as the dramas use them.",
      },
      {
        line: "발음은 거울 앞에서, 자신감은 제가 챙길게요.",
        en: "Pronunciation in front of a mirror — the confidence I'll handle.",
      },
      {
        line: "또 만나요!",
        en: "See you again! (Tto mannayo!)",
      },
    ],
    openness: 0.75,
    trial: true,
    portrait: "/tutors/jiwoo.png",
  },
  {
    id: "wei",
    name: "Wei Zhang",
    firstName: "Wei",
    city: "Chengdu",
    country: "China",
    cc: "CN",
    lang: "zh",
    native: true,
    price: 25,
    rating: 4.7,
    lessonsTaught: 1402,
    students: 178,
    since: 2014,
    responseHrs: 6,
    specialties: ["Exam prep", "Business", "Pronunciation"],
    alsoSpeaks: [
      { lang: "zh", level: "Native" },
      { lang: "en", level: "C1" },
      { lang: "zh-sichuan", level: "Native" },
    ],
    tagline: "Tones first, panic never.",
    bio: [
      "I teach Mandarin the Chengdu way: calm, spicy in the right measure. Tones are the staircase to everything, so we climb them slowly and correctly from day one — my tone drills involve tea, tongue positions and terrible jokes, all three effective.",
      "HSK students get level-by-level structure and past papers by the fistful. Business students get the phrases that open doors in Chengdu — and the ones that quietly close them.",
    ],
    video: [
      {
        line: "你好，我是来自成都的魏。",
        en: "Hello, I'm Wei from Chengdu. (Nǐ hǎo, wǒ shì Wéi.)",
      },
      {
        line: "声调先走，恐慌永远不来。",
        en: "Tones first, panic never. (Shēngdiào xiān zǒu.)",
      },
      {
        line: "HSK从一级到五级，我们一级一级来。",
        en: "HSK 1 to 5 — we take it one level at a time.",
      },
      {
        line: "教室见！",
        en: "See you in the classroom! (Jiàoshì jiàn!)",
      },
    ],
    openness: 0.5,
    trial: true,
    portrait: "/tutors/wei.png",
  },
  {
    id: "layla",
    name: "Layla Hassan",
    firstName: "Layla",
    city: "Cairo",
    country: "Egypt",
    cc: "EG",
    lang: "ar",
    native: true,
    price: 20,
    rating: 4.9,
    lessonsTaught: 960,
    students: 96,
    since: 2017,
    responseHrs: 2,
    specialties: ["Beginners", "Grammar", "Conversation"],
    alsoSpeaks: [
      { lang: "ar", level: "Native" },
      { lang: "en", level: "C1" },
      { lang: "fr", level: "B1" },
    ],
    tagline: "From the alphabet to Al Jazeera, calmly.",
    bio: [
      "I teach Modern Standard Arabic from Cairo — the clear, pan-Arab kind that travels from Rabat to Baghdad. We start with the alphabet, drawn beautifully (calligraphy is handwriting with self-respect), then build toward reading real news and arguing about it politely.",
      "Beginners, don't fear: Arabic has a fearsome reputation and an undeserved one. The root system is logical once you see it — three letters, a family of meanings. I'll show you.",
    ],
    video: [
      {
        line: "مرحبًا، أنا ليلى من القاهرة.",
        en: "Hello, I'm Layla from Cairo. (Marḥaban, ana Layla min al-Qāhira.)",
      },
      {
        line: "من الحروف إلى الجزيرة، خطوة بخطوة.",
        en: "From the letters to Al Jazeera, step by step.",
      },
      {
        line: "المكتبة العربية مفتوحة أمامك.",
        en: "The Arabic library stands open before you.",
      },
      {
        line: "أهلًا بك في الصف.",
        en: "Welcome to class. (Ahlan bika fī aṣ-ṣaff.)",
      },
    ],
    openness: 0.6,
    trial: true,
    portrait: "/tutors/layla.png",
  },
  {
    id: "beatriz",
    name: "Beatriz Alves",
    firstName: "Bia",
    city: "São Paulo",
    country: "Brazil",
    cc: "BR",
    lang: "pt",
    native: true,
    price: 17,
    rating: 4.8,
    lessonsTaught: 1310,
    students: 167,
    since: 2019,
    responseHrs: 2,
    specialties: ["Conversation", "Travel", "Beginners"],
    alsoSpeaks: [
      { lang: "pt", level: "Native" },
      { lang: "en", level: "C1" },
      { lang: "es", level: "B2" },
    ],
    tagline: "Grammar with a bossa nova soundtrack.",
    bio: [
      "São Paulo raised me, bossa nova raised my curriculum. My lessons come with a soundtrack: MPB for the subjunctive, samba for numbers, Chico Buarque for the days you need poetry with your grammar. You'll speak Brazilian Portuguese — paulistano-proud, carioca-free.",
      "Fear of the accent is the real beginner's disease, and mine is the cure clinic. Mistakes are raw material: we mine them, fix them, and play them back in bossa rhythm.",
    ],
    video: [
      {
        line: "Oi! Eu sou a Bia, de São Paulo.",
        en: "Hi! I'm Bia, from São Paulo.",
      },
      {
        line: "Aqui a gramática tem trilha sonora: bossa, MPB e samba.",
        en: "Here grammar has a soundtrack: bossa, MPB and samba.",
      },
      {
        line: "Vamos falar sem medo — sotaque é charme.",
        en: "Let's speak without fear — an accent is charm.",
      },
      {
        line: "Te espero na aula, viu?",
        en: "I'll be waiting for you in class, okay?",
      },
    ],
    openness: 0.85,
    trial: true,
    portrait: "/tutors/beatriz.png",
  },
  {
    id: "natalia",
    name: "Natalia Petrova",
    firstName: "Natalia",
    city: "St. Petersburg",
    country: "Russia",
    cc: "RU",
    lang: "ru",
    native: true,
    price: 23,
    rating: 4.7,
    lessonsTaught: 640,
    students: 71,
    since: 2012,
    responseHrs: 5,
    specialties: ["Literature", "Grammar", "Pronunciation"],
    alsoSpeaks: [
      { lang: "ru", level: "Native" },
      { lang: "en", level: "C1" },
      { lang: "de", level: "B2" },
    ],
    tagline: "Chekhov's language, minus the despair.",
    bio: [
      "I'm from St. Petersburg, where everyone is a literary critic by default. We'll read Pushkin and Chekhov one page at a time, and you'll discover the cases are six doors, not a wall — each opens somewhere interesting. Grammar with me is architecture, not bureaucracy.",
      "Twelve years of teaching have taught me that pronunciation fixes confidence, not the reverse. So we fix the “ы” early, and the confidence follows.",
    ],
    video: [
      {
        line: "Привет! Я Наташа из Петербурга.",
        en: "Hi! I'm Natasha from Petersburg. (Privet! Ya Natasha iz Peterburga.)",
      },
      {
        line: "Падежи — это шесть дверей, а не стена.",
        en: "The cases are six doors, not a wall. (Padezhi — shest dverey.)",
      },
      {
        line: "Читаем Чехова в оригинале, по одной странице.",
        en: "We read Chekhov in the original, one page at a time.",
      },
      {
        line: "До встречи!",
        en: "Until we meet! (Do vstrechi!)",
      },
    ],
    openness: 0.5,
    trial: false,
    portrait: "/tutors/natalia.png",
  },
  {
    id: "grace",
    name: "Grace Osei",
    firstName: "Grace",
    city: "Accra",
    country: "Ghana",
    cc: "GH",
    lang: "en",
    native: false,
    price: 16,
    rating: 4.9,
    lessonsTaught: 1502,
    students: 210,
    since: 2018,
    responseHrs: 1,
    specialties: ["Exam prep", "Business", "Interview prep"],
    alsoSpeaks: [
      { lang: "tw", level: "Native" },
      { lang: "en", level: "C2" },
      { lang: "fr", level: "B1" },
    ],
    tagline: "IELTS is a rules game. I teach the rules.",
    bio: [
      "I graded IELTS speaking for three exam centres before teaching full-time, which means I know exactly where the points leak. English is technically my second language — Twi came first, English came fast — so I know the exam culture from both sides of the desk. We repair your articles, your coherence and your nerves, in that order.",
      "My students are nurses, engineers, and one very determined footballer moving to Manchester. Interviews, standups, small talk on trains: if it happens in English, we rehearse it until it's boring. Boring, on exam day, is the goal.",
    ],
    video: [
      {
        line: "Hello, I'm Grace, calling in from Accra.",
        en: "Hello, I'm Grace, calling in from Accra.",
      },
      {
        line: "IELTS is a game with rules — I teach you the rules.",
        en: "IELTS is a game with rules — I teach you the rules.",
      },
      {
        line: "We fix the articles, then the nerves, then the score.",
        en: "We fix the articles, then the nerves, then the score.",
      },
      {
        line: "See you in class.",
        en: "See you in class.",
      },
    ],
    openness: 0.8,
    trial: true,
    portrait: "/tutors/grace.png",
  },
];

export function tutorById(id: string | null | undefined): Tutor | undefined {
  if (!id) return undefined;
  return TUTORS.find((t) => t.id === id);
}

/** Display names for languages that are spoken but not taught (Tw, Sichuanese…). */
const EXTRA_SPOKEN: Record<string, string> = {
  tw: "Twi",
  "zh-sichuan": "Sichuanese",
  val: "Valencian",
};

export function spokenLabel(code: string): string {
  return (
    EXTRA_SPOKEN[code] ?? languageByCode(code)?.name ?? code.toUpperCase()
  );
}

export function tutorLanguage(t: Tutor): Language {
  return languageByCode(t.lang) ?? { code: t.lang, name: t.lang, nativeName: t.lang, exam: "proficiency" };
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function tutorsByLanguage(code: string): Tutor[] {
  return TUTORS.filter((t) => t.lang === code);
}
