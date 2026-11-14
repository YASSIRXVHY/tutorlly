/** State shapes for the Tutorly store. */

export interface SessionUser {
  name: string;
  email: string;
  since: number;
}

export type LessonStatus = "upcoming" | "completed" | "cancelled";

export interface Lesson {
  id: string;
  tutorId: string;
  /** The subject this lesson is for (subject id — tutors teach several). */
  subject: string;
  dateISO: string;
  hour: number;
  durationMin: number;
  price: number;
  status: LessonStatus;
  createdAt: number;
  /** Set when the lesson belongs to a weekly package. */
  packId?: string;
  packSize?: number;
  reviewed?: boolean;
  notes?: string;
}

export interface UserReview {
  id: string;
  tutorId: string;
  stars: number;
  tags: string[];
  text: string;
  date: number;
  author: string;
  lessons: number;
}

export interface Message {
  id: string;
  from: "me" | "tutor";
  text: string;
  at: number;
}

export interface Conversation {
  tutorId: string;
  messages: Message[];
  read: boolean;
}

export type ToastKind = "success" | "error" | "info";

export interface ToastMsg {
  id: string;
  text: string;
  kind: ToastKind;
}

export interface UIState {
  authOpen: boolean;
  /** Contextual line shown at the top of the auth modal, e.g. "Log in to book". */
  authNotice: string | null;
  searchOpen: boolean;
}

export interface AppState {
  session: SessionUser | null;
  favorites: string[];
  lessons: Lesson[];
  userReviews: UserReview[];
  conversations: Conversation[];
  toasts: ToastMsg[];
  ui: UIState;
}

/** The slice written to localStorage. */
export interface PersistedState {
  version: 2;
  session: SessionUser | null;
  favorites: string[];
  lessons: Lesson[];
  userReviews: UserReview[];
  conversations: Conversation[];
}
