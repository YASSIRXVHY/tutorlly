/**
 * The catalogue — twelve hand-authored tutors across six subject categories.
 * Ten languages, math, sciences, code, music and test prep. Prices, ratings
 * and biographies are fixed data; anything probabilistic (review corpora,
 * slot availability) is derived from these ids via seeded RNG.
 */
import type { Specialty } from "./subjects";
import { subjectById, LANG_EXAMS } from "./subjects";
import { rng } from "../utils/rng";
import { syncCommunityTutors } from "./community";

export type Level = "Native" | "C2" | "C1" | "B2" | "B1" | "A2" | "A1";

export interface Teach {
  subject: string; // subject id
  level: string; // human display level: "Native speaker", "C1", "All levels"…
}

export interface Spoken {
  code: string; // language code
  level: Level;
}

export interface CaptionLine {
  /** The line spoken in the tutor's teaching language (English for non-language tutors). */
  line: string;
  /** English subtitle (identical for non-language tutors — the player hides it then). */
  en: string;
}

export interface Tutor {
  id: string;
  name: string;
  firstName: string;
  city: string;
  country: string;
  cc: string;
  portrait: string;
  /** The teaching list — ordered, primary first. */
  teaches: Teach[];
  /** Languages the tutor speaks, native first. */
  spoken: Spoken[];
  tagline: string;
  bio: [string, string];
  video: CaptionLine[];
  price: number; // USD per 50-minute lesson
  rating: number;
  reviewCount: number;
  lessonsTaught: number;
  students: number;
  since: number;
  responseHrs: number;
  specialties: Specialty[];
  /** 0..1 — density of open slots in the availability grid. */
  openness: number;
  trial: boolean;
  /** Credential stamps shown next to the name. */
  badges: string[];
}

export const TUTORS: Tutor[] = [
  {
    id: "mariana",
    name: "Mariana Costa",
    firstName: "Mariana",
    city: "Buenos Aires",
    country: "Argentina",
    cc: "AR",
    portrait: "/tutors/mariana.png",
    teaches: [{ subject: "spanish", level: "Native speaker" }],
    spoken: [
      { code: "es", level: "Native" },
      { code: "en", level: "C1" },
      { code: "it", level: "B2" },
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
    price: 18,
    rating: 4.9,
    reviewCount: 214,
    lessonsTaught: 2341,
    students: 214,
    since: 2016,
    responseHrs: 2,
    specialties: ["Conversation", "Business", "Travel"],
    openness: 0.8,
    trial: true,
    badges: ["Ex-radio journalist"],
  },
  {
    id: "camille",
    name: "Camille Laurent",
    firstName: "Camille",
    city: "Lyon",
    country: "France",
    cc: "FR",
    portrait: "/tutors/camille.png",
    teaches: [{ subject: "french", level: "Native speaker" }],
    spoken: [
      { code: "fr", level: "Native" },
      { code: "en", level: "C2" },
      { code: "es", level: "B1" },
    ],
    tagline: "French with the smell of a good bookshop.",
    bio: [
      "I'm a bookseller turned teacher from Lyon, which explains a lot: my lessons smell of the second-hand shelf rather than the textbook aisle. We read, we argue, we laugh — and somewhere in between you start speaking French with real Lyon vowels.",
      "Pronunciation is my obsession. The French “r” is not a monster, whatever school told you; it's a muscle, and muscles get trained.",
    ],
    video: [
      { line: "Bonjour ! Moi, c'est Camille, de Lyon.", en: "Hello! I'm Camille, from Lyon." },
      {
        line: "On travaillera la prononciation — le « r » n'est pas un monstre, promis.",
        en: "We'll work pronunciation — the French “r” is not a monster, promise.",
      },
      {
        line: "Mes cours sentent la librairie, pas le manuel scolaire.",
        en: "My lessons smell of the bookshop, not the schoolbook.",
      },
      { line: "À très vite dans la salle de classe.", en: "See you very soon in the classroom." },
    ],
    price: 22,
    rating: 4.9,
    reviewCount: 301,
    lessonsTaught: 2890,
    students: 301,
    since: 2015,
    responseHrs: 1,
    specialties: ["Conversation", "Pronunciation", "Travel"],
    openness: 0.5,
    trial: true,
    badges: ["Ex-bookseller"],
  },
  {
    id: "klaus",
    name: "Klaus Weber",
    firstName: "Klaus",
    city: "Vienna",
    country: "Austria",
    cc: "AT",
    portrait: "/tutors/klaus.png",
    teaches: [
      { subject: "german", level: "Native speaker" },
      { subject: "music-theory", level: "All levels" },
      { subject: "piano", level: "Beginner & intermediate" },
    ],
    spoken: [
      { code: "de", level: "Native" },
      { code: "en", level: "C2" },
      { code: "it", level: "B1" },
    ],
    tagline: "Ordnung in your grammar, a little Schubert after.",
    bio: [
      "Twenty years in Vienna's banking district taught me Business German the way it's actually wielded — register, jargon, and the delicate art of the polite German “no”. Since 2013 I've coached professionals through presentations, negotiations and the ÖSD certificates.",
      "Vienna being Vienna, there is also a piano in my flat and a subscription at the Musikverein. I teach music theory the same way I teach cases: patiently, at the keyboard, until it stops being a subject and starts being a language you hear. My classroom has rules (Austrian, after all) but no fear.",
    ],
    video: [
      { line: "Guten Tag, hier ist Klaus aus Wien.", en: "Good day, this is Klaus from Vienna." },
      {
        line: "Ordnung in der Grammatik, ein wenig Schubert danach.",
        en: "Order in the grammar — a little Schubert afterwards.",
      },
      {
        line: "Wir üben Fälle, Verben und wienerische Höflichkeit.",
        en: "We practise cases, verbs, and Viennese politeness.",
      },
      { line: "Bis bald im Kursraum.", en: "See you soon in the classroom." },
    ],
    price: 26,
    rating: 4.7,
    reviewCount: 122,
    lessonsTaught: 1654,
    students: 122,
    since: 2013,
    responseHrs: 4,
    specialties: ["Business", "Grammar", "Exam prep"],
    openness: 0.45,
    trial: false,
    badges: ["ÖSD examiner", "20 yrs banking"],
  },
  {
    id: "giulia",
    name: "Giulia Romano",
    firstName: "Giulia",
    city: "Rome",
    country: "Italy",
    cc: "IT",
    portrait: "/tutors/giulia.png",
    teaches: [
      { subject: "italian", level: "Native speaker" },
      { subject: "guitar", level: "Beginner & intermediate" },
    ],
    spoken: [
      { code: "it", level: "Native" },
      { code: "en", level: "C2" },
      { code: "es", level: "B2" },
    ],
    tagline: "Roman hospitality, Italian grammar, an acoustic guitar.",
    bio: [
      "Roman, proud of it, allergic to boring lessons. I teach the Italian people actually speak on a Tuesday: the espresso order, the argument about parking, the compliment to the nonna. Textbook Italian is on the menu, but I recommend the daily special.",
      "And since every Roman evening ends with someone picking up a guitar: yes, I teach that too. Beginner and intermediate acoustic — chords, strumming, and the three songs that get you through any dinner party. Conversation first, grammar exactly when you need it.",
    ],
    video: [
      { line: "Ciao! Sono Giulia, di Roma.", en: "Hi! I'm Giulia, from Rome." },
      {
        line: "Con me impari l'italiano che si parla davvero, tra un caffè e l'altro.",
        en: "With me you learn the Italian really spoken, one coffee at a time.",
      },
      {
        line: "E se vuoi, dopo la grammatica, prendiamo la chitarra.",
        en: "And if you like, after the grammar, we pick up the guitar.",
      },
      {
        line: "Ci vediamo in classe: porta le domande, io porto la pazienza.",
        en: "See you in class: bring the questions, I'll bring the patience.",
      },
    ],
    price: 19,
    rating: 4.8,
    reviewCount: 145,
    lessonsTaught: 1108,
    students: 145,
    since: 2018,
    responseHrs: 2,
    specialties: ["Conversation", "Travel", "Beginners"],
    openness: 0.7,
    trial: true,
    badges: ["Trastevere local"],
  },
  {
    id: "kenji",
    name: "Kenji Tanaka",
    firstName: "Kenji",
    city: "Osaka",
    country: "Japan",
    cc: "JP",
    portrait: "/tutors/kenji.png",
    teaches: [
      { subject: "japanese", level: "Native speaker" },
      { subject: "jlpt", level: "N5 → N1" },
    ],
    spoken: [
      { code: "ja", level: "Native" },
      { code: "en", level: "C1" },
      { code: "ko", level: "A2" },
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
      { line: "いっしょにがんばりましょう。", en: "Let's work hard together. (Issho ni ganbarimashou.)" },
    ],
    price: 30,
    rating: 4.9,
    reviewCount: 389,
    lessonsTaught: 3210,
    students: 389,
    since: 2011,
    responseHrs: 3,
    specialties: ["Exam prep", "Grammar", "Business"],
    openness: 0.4,
    trial: false,
    badges: ["JLPT drill master"],
  },
  {
    id: "jiwoo",
    name: "Ji-woo Park",
    firstName: "Ji-woo",
    city: "Seoul",
    country: "South Korea",
    cc: "KR",
    portrait: "/tutors/jiwoo.png",
    teaches: [{ subject: "korean", level: "Native speaker" }],
    spoken: [
      { code: "ko", level: "Native" },
      { code: "en", level: "C1" },
      { code: "ja", level: "B1" },
    ],
    tagline: "Korean the way the dramas actually speak it.",
    bio: [
      " dramas built my method. We study the expressions Seoul actually uses — the sighs, the comebacks, the plot twists — and drill pronunciation until your annyeonghaseyo stops sounding like a question. Grammar rides along quietly, the way it does in real life.",
      "Beginners are my specialty: we start with hangul, which you'll be reading by lesson three, and confidence, which I supply by the drumload.",
    ],
    video: [
      { line: "안녕하세요! 서울에서 만나요.", en: "Hello! We meet from Seoul. (Annyeonghaseyo! Seoul-eseo mannayo.)" },
      { line: "드라마 표현 그대로 연습해요.", en: "We practise expressions exactly as the dramas use them." },
      {
        line: "발음은 거울 앞에서, 자신감은 제가 챙길게요.",
        en: "Pronunciation in front of a mirror — the confidence I'll handle.",
      },
      { line: "또 만나요!", en: "See you again! (Tto mannayo!)" },
    ],
    price: 21,
    rating: 4.8,
    reviewCount: 102,
    lessonsTaught: 876,
    students: 102,
    since: 2020,
    responseHrs: 1,
    specialties: ["Conversation", "Pronunciation", "Beginners"],
    openness: 0.75,
    trial: true,
    badges: ["K-drama fluency"],
  },
  {
    id: "wei",
    name: "Wei Zhang",
    firstName: "Wei",
    city: "Chengdu",
    country: "China",
    cc: "CN",
    portrait: "/tutors/wei.png",
    teaches: [
      { subject: "mandarin", level: "Native speaker" },
      { subject: "sat", level: "Math section" },
    ],
    spoken: [
      { code: "zh", level: "Native" },
      { code: "en", level: "C1" },
      { code: "zh-sichuan", level: "Native" },
    ],
    tagline: "Tones first, panic never — and SAT math on the side.",
    bio: [
      "I teach Mandarin the Chengdu way: calm, spicy in the right measure. Tones are the staircase to everything, so we climb them slowly and correctly from day one — my tone drills involve tea, tongue positions and terrible jokes, all three effective.",
      "By training I'm a software engineer, which explains the other half of my card: SAT Math. I drill the question types that quietly leak points — careless circle-geometry, calculator dependence — with past papers and a stopwatch. HSK students get level-by-level structure; parents get progress reports in two languages.",
    ],
    video: [
      { line: "你好，我是来自成都的魏。", en: "Hello, I'm Wei from Chengdu. (Nǐ hǎo, wǒ shì Wéi.)" },
      { line: "声调先走，恐慌永远不来。", en: "Tones first, panic never. (Shēngdiào xiān zǒu.)" },
      {
        line: "SAT数学也教——工程师的老本行。",
        en: "I also coach SAT Math — an engineer's home turf.",
      },
      { line: "教室见！", en: "See you in the classroom! (Jiàoshì jiàn!)" },
    ],
    price: 25,
    rating: 4.7,
    reviewCount: 178,
    lessonsTaught: 1402,
    students: 178,
    since: 2014,
    responseHrs: 6,
    specialties: ["Exam prep", "Business", "Test strategy"],
    openness: 0.5,
    trial: true,
    badges: ["Software engineer"],
  },
  {
    id: "layla",
    name: "Layla Hassan",
    firstName: "Layla",
    city: "Cairo",
    country: "Egypt",
    cc: "EG",
    portrait: "/tutors/layla.png",
    teaches: [{ subject: "arabic", level: "Native speaker" }],
    spoken: [
      { code: "ar", level: "Native" },
      { code: "en", level: "C1" },
      { code: "fr", level: "B1" },
    ],
    tagline: "From the alphabet to Al Jazeera, calmly.",
    bio: [
      "I teach Modern Standard Arabic from Cairo — the clear, pan-Arab kind that travels from Rabat to Baghdad. We start with the alphabet, drawn beautifully (calligraphy is handwriting with self-respect), then build toward reading real news and arguing about it politely.",
      "Beginners, don't fear: Arabic has a fearsome reputation and an undeserved one. The root system is logical once you see it — three letters, a family of meanings. I'll show you.",
    ],
    video: [
      { line: "مرحبًا، أنا ليلى من القاهرة.", en: "Hello, I'm Layla from Cairo. (Marḥaban, ana Layla min al-Qāhira.)" },
      { line: "من الحروف إلى الجزيرة، خطوة بخطوة.", en: "From the letters to Al Jazeera, step by step." },
      { line: "المكتبة العربية مفتوحة أمامك.", en: "The Arabic library stands open before you." },
      { line: "أهلًا بك في الصف.", en: "Welcome to class. (Ahlan bika fī aṣ-ṣaff.)" },
    ],
    price: 20,
    rating: 4.9,
    reviewCount: 96,
    lessonsTaught: 960,
    students: 96,
    since: 2017,
    responseHrs: 2,
    specialties: ["Beginners", "Grammar", "Conversation"],
    openness: 0.6,
    trial: true,
    badges: ["Calligrapher"],
  },
  {
    id: "beatriz",
    name: "Beatriz Alves",
    firstName: "Bia",
    city: "São Paulo",
    country: "Brazil",
    cc: "BR",
    portrait: "/tutors/beatriz.png",
    teaches: [
      { subject: "portuguese", level: "Native speaker" },
      { subject: "biology", level: "School & AP" },
      { subject: "chemistry", level: "School" },
    ],
    spoken: [
      { code: "pt", level: "Native" },
      { code: "en", level: "C1" },
      { code: "es", level: "B2" },
    ],
    tagline: "Grammar with a bossa nova soundtrack — and a biology degree.",
    bio: [
      "São Paulo raised me, bossa nova raised my curriculum, and a biology degree from USP raised my second teaching card. My Portuguese lessons come with a soundtrack: MPB for the subjunctive, samba for numbers, Chico Buarque for the days you need poetry with your grammar.",
      "With teens I switch lab coats: biology and chemistry, school through AP, taught with the same rule — mistakes are raw material. We mine them, fix them, and play them back in bossa rhythm. Fear of the accent and fear of the periodic table are the same disease.",
    ],
    video: [
      { line: "Oi! Eu sou a Bia, de São Paulo.", en: "Hi! I'm Bia, from São Paulo." },
      {
        line: "Aqui a gramática tem trilha sonora: bossa, MPB e samba.",
        en: "Here grammar has a soundtrack: bossa, MPB and samba.",
      },
      {
        line: "E de cientista: biologia e química sem medo do laboratório.",
        en: "And from my scientist side: biology and chemistry without lab fear.",
      },
      { line: "Te espero na aula, viu?", en: "I'll be waiting for you in class, okay?" },
    ],
    price: 17,
    rating: 4.8,
    reviewCount: 167,
    lessonsTaught: 1310,
    students: 167,
    since: 2019,
    responseHrs: 2,
    specialties: ["Conversation", "Beginners", "Kids"],
    openness: 0.85,
    trial: true,
    badges: ["BSc Biology"],
  },
  {
    id: "natalia",
    name: "Dr. Natalia Petrova",
    firstName: "Natalia",
    city: "St. Petersburg",
    country: "Russia",
    cc: "RU",
    portrait: "/tutors/natalia.png",
    teaches: [
      { subject: "algebra", level: "Middle school → university" },
      { subject: "calculus", level: "High school & university" },
      { subject: "statistics", level: "University" },
      { subject: "geometry", level: "All levels" },
      { subject: "physics", level: "School & AP" },
      { subject: "gre", level: "Quant section" },
    ],
    spoken: [
      { code: "ru", level: "Native" },
      { code: "en", level: "C1" },
      { code: "de", level: "B2" },
    ],
    tagline: "Math anxiety has a cure. It's called a plan.",
    bio: [
      "For nine years I was an assistant lecturer in mathematics at a university in St. Petersburg, which taught me two things: how analysis actually works, and how many people were told they're “not a math person” by someone who had no business saying it. My PhD is in probability theory; my mission is the student who freezes at the sight of a fraction.",
      "We work with a plan: diagnose the actual gap (it is almost always two topics earlier than you think), rebuild it properly, then move forward until the exam stops being a threat. GRE Quant students get my full drill library. Bring the homework you're dreading — I've seen worse, professionally.",
    ],
    video: [
      {
        line: "Hello — I'm Dr. Petrova, and I teach mathematics from St. Petersburg.",
        en: "Hello — I'm Dr. Petrova, and I teach mathematics from St. Petersburg.",
      },
      {
        line: "Math anxiety is not a talent problem. It's a missing-step problem.",
        en: "Math anxiety is not a talent problem. It's a missing-step problem.",
      },
      {
        line: "We find the missing step, we rebuild it, and the exam stops being scary.",
        en: "We find the missing step, we rebuild it, and the exam stops being scary.",
      },
      {
        line: "Bring the homework you're dreading. I've seen worse — professionally.",
        en: "Bring the homework you're dreading. I've seen worse — professionally.",
      },
    ],
    price: 34,
    rating: 4.9,
    reviewCount: 131,
    lessonsTaught: 1140,
    students: 131,
    since: 2014,
    responseHrs: 4,
    specialties: ["Exam prep", "Homework help", "Test strategy"],
    openness: 0.5,
    trial: true,
    badges: ["PhD Mathematics"],
  },
  {
    id: "grace",
    name: "Grace Osei",
    firstName: "Grace",
    city: "Accra",
    country: "Ghana",
    cc: "GH",
    portrait: "/tutors/grace.png",
    teaches: [
      { subject: "english", level: "Native-level (C2)" },
      { subject: "ielts", level: "Band 6 → 8.5" },
      { subject: "toefl", level: "iBT 80 → 110" },
    ],
    spoken: [
      { code: "tw", level: "Native" },
      { code: "en", level: "C2" },
      { code: "fr", level: "B1" },
    ],
    tagline: "IELTS is a rules game. I teach the rules.",
    bio: [
      "I graded IELTS speaking for three exam centres before teaching full-time, which means I know exactly where the points leak. English is technically my second language — Twi came first, English came fast — so I know the exam culture from both sides of the desk. We repair your articles, your coherence and your nerves, in that order.",
      "My students are nurses, engineers, and one very determined footballer moving to Manchester. Interviews, standups, small talk on trains: if it happens in English, we rehearse it until it's boring. Boring, on exam day, is the goal.",
    ],
    video: [
      { line: "Hello, I'm Grace, calling in from Accra.", en: "Hello, I'm Grace, calling in from Accra." },
      {
        line: "IELTS is a game with rules — I teach you the rules.",
        en: "IELTS is a game with rules — I teach you the rules.",
      },
      {
        line: "We fix the articles, then the nerves, then the score.",
        en: "We fix the articles, then the nerves, then the score.",
      },
      { line: "See you in class.", en: "See you in class." },
    ],
    price: 16,
    rating: 4.9,
    reviewCount: 210,
    lessonsTaught: 1502,
    students: 210,
    since: 2018,
    responseHrs: 1,
    specialties: ["Exam prep", "Business", "Interview prep"],
    openness: 0.8,
    trial: true,
    badges: ["Ex-IELTS examiner"],
  },
  {
    id: "alejandro",
    name: "Alejandro Vega",
    firstName: "Alejandro",
    city: "Madrid",
    country: "Spain",
    cc: "ES",
    portrait: "/tutors/alejandro.png",
    teaches: [
      { subject: "python", level: "Beginner → advanced" },
      { subject: "javascript", level: "Beginner → advanced" },
      { subject: "web-development", level: "First site → first job" },
    ],
    spoken: [
      { code: "es", level: "Native" },
      { code: "en", level: "C2" },
    ],
    tagline: "From your first print() to your first pull request.",
    bio: [
      "I've spent ten years building software in Madrid — fintech, then a logistics platform nobody loves but everybody uses — and the part I loved most was always onboarding the junior who had never written a line of code. Four years ago I made that the whole job.",
      "My lessons are the opposite of a video course: you code, I watch, we debug together and I explain the why behind every stack trace. Career-changers are my specialty — accountants, nurses, one professional chess player. We ship something real in the trial lesson itself, a page of your own on the internet.",
    ],
    video: [
      {
        line: "Hola — I'm Alejandro, a software engineer from Madrid.",
        en: "Hola — I'm Alejandro, a software engineer from Madrid.",
      },
      {
        line: "In the trial we deploy a real web page with your name on it.",
        en: "In the trial we deploy a real web page with your name on it.",
      },
      {
        line: "You type, I watch, we debug together. You'll learn the why, not just the how.",
        en: "You type, I watch, we debug together. You'll learn the why, not just the how.",
      },
      {
        line: "Your first print() is closer than you think.",
        en: "Your first print() is closer than you think.",
      },
    ],
    price: 24,
    rating: 4.8,
    reviewCount: 87,
    lessonsTaught: 604,
    students: 94,
    since: 2021,
    responseHrs: 3,
    specialties: ["Beginners", "Homework help", "Interview prep"],
    openness: 0.65,
    trial: true,
    badges: ["10 yrs in fintech"],
  },
];

export function tutorById(id: string | null | undefined): Tutor | undefined {
  if (!id) return undefined;
  return TUTORS.find((t) => t.id === id);
}

/** Resolved subjects a tutor teaches, in order. */
export function tutorSubjects(t: Tutor) {
  return t.teaches
    .map((te) => subjectById(te.subject))
    .filter((s): s is NonNullable<ReturnType<typeof subjectById>> => Boolean(s));
}

/** The subject the card and headline lead with. */
export function primarySubject(t: Tutor) {
  return tutorSubjects(t)[0];
}

/** Does this tutor teach any human language? */
export function isLanguageTutor(t: Tutor): boolean {
  return tutorSubjects(t).some((s) => s.cat === "languages");
}

/** The language a tutor teaches AND speaks natively, if any — drives the "native" filter. */
export function nativeTaughtLanguage(t: Tutor) {
  const taught = tutorSubjects(t).filter((s) => s.cat === "languages");
  return taught.find((s) =>
    t.spoken.some((sp) => subjectCodeMatches(sp.code, s.id) && sp.level === "Native")
  );
}

export function subjectCodeMatches(code: string, subjectId: string): boolean {
  // language codes vs subject ids: es↔spanish, zh↔mandarin, etc.
  const map: Record<string, string> = {
    en: "english",
    es: "spanish",
    fr: "french",
    de: "german",
    it: "italian",
    pt: "portuguese",
    ja: "japanese",
    ko: "korean",
    zh: "mandarin",
    ar: "arabic",
    ru: "russian",
  };
  return map[code] === subjectId;
}

/** Exam names this tutor coaches toward. */
export function tutorExams(t: Tutor): string[] {
  const out: string[] = [];
  for (const te of t.teaches) {
    if (subjectById(te.subject)?.cat === "test-prep") {
      out.push(subjectById(te.subject)!.label);
    } else if (subjectById(te.subject)?.cat === "languages") {
      out.push(...(LANG_EXAMS[te.subject] ?? []));
    }
  }
  return out;
}

/** Display names for languages that are spoken but not taught (Twi, Sichuanese…). */
const CODE_TO_NAME: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ja: "Japanese",
  ko: "Korean",
  zh: "Mandarin",
  ar: "Arabic",
  ru: "Russian",
  tw: "Twi",
  "zh-sichuan": "Sichuanese",
  cs: "Czech",
  pl: "Polish",
  nl: "Dutch",
  tr: "Turkish",
  hi: "Hindi",
  vi: "Vietnamese",
};

export function spokenLabel(code: string): string {
  return CODE_TO_NAME[code] ?? code.toUpperCase();
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

/** Deterministic "online now" — stable within the current hour, per tutor. */
export function isOnline(tutorId: string, now = new Date()): boolean {
  return rng(tutorId, "online", now.getHours()).chance(0.58);
}

/*
 * Community tutors — teachers approved through the "Become a tutor"
 * application flow (data/community.ts) fold into this same array, so every
 * consumer (search, profiles, booking, messages, admin) treats them exactly
 * like the hand-authored catalogue. Re-exported for mutation points.
 */
if (typeof window !== "undefined") {
  syncCommunityTutors();
}
export { syncCommunityTutors };
