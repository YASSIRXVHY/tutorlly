'use client';

/**
 * The Tutorly store — Context + useReducer, persisted to localStorage.
 * Nothing here talks to a server; the "backend" is the browser's own memory.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from "react";
import type {
  AppState,
  Conversation,
  Lesson,
  PersistedState,
  SessionUser,
  ToastKind,
  UserReview,
} from "./types";
import {
  buildDemoConversations,
  buildDemoFavorites,
  buildDemoLessons,
  buildDemoReviews,
} from "./demoSeed";
import { uid } from "../utils/misc";

const STORAGE_KEY = "tutorly.v2";

export type Action =
  | { type: "signIn"; user: SessionUser }
  | { type: "signUp"; user: SessionUser }
  | { type: "signOut" }
  | { type: "toggleFavorite"; tutorId: string }
  | { type: "addLessons"; lessons: Lesson[] }
  | { type: "cancelLesson"; lessonId: string }
  | { type: "completeLesson"; lessonId: string; notes?: string }
  | {
      type: "giveReview";
      lessonId: string;
      tutorId: string;
      stars: number;
      tags: string[];
      text: string;
    }
  | { type: "addMessage"; tutorId: string; from: "me" | "tutor"; text: string }
  | { type: "ensureConversation"; tutorId: string }
  | { type: "markConversationRead"; tutorId: string }
  | { type: "toast"; text: string; kind?: ToastKind }
  | { type: "dismissToast"; id: string }
  | { type: "openAuth"; notice?: string | null }
  | { type: "closeAuth" }
  | { type: "setSearch"; open: boolean };

const EMPTY: AppState = {
  session: null,
  favorites: [],
  lessons: [],
  userReviews: [],
  conversations: [],
  toasts: [],
  ui: { authOpen: false, authNotice: null, searchOpen: false },
};

function readPersisted(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed || parsed.version !== 2) return null;
    return parsed;
  } catch {
    // Corrupt storage is wiped rather than crashing the marketplace.
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* private mode — carry on with empty state */
    }
    return null;
  }
}

function init(): AppState {
  const persisted = readPersisted();
  if (!persisted) return EMPTY;
  return {
    ...EMPTY,
    session: persisted.session ?? null,
    favorites: persisted.favorites ?? [],
    lessons: persisted.lessons ?? [],
    userReviews: persisted.userReviews ?? [],
    conversations: persisted.conversations ?? [],
  };
}

function ensureConversation(
  conversations: Conversation[],
  tutorId: string
): Conversation[] {
  if (conversations.some((c) => c.tutorId === tutorId)) return conversations;
  return [...conversations, { tutorId, messages: [], read: true }];
}

function appendMessage(
  conversations: Conversation[],
  tutorId: string,
  from: "me" | "tutor",
  text: string
): Conversation[] {
  return conversations.map((c) =>
    c.tutorId === tutorId
      ? {
          ...c,
          // Your own sends imply you're looking at the thread; a tutor's
          // reply marks the conversation unread (the navbar badge counts
          // these; the messages page re-marks read while you're viewing).
          read: from === "me" ? true : false,
          messages: [...c.messages, { id: uid("msg"), from, text, at: Date.now() }],
        }
      : c
  );
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "signIn": {
      // Demo build: signing in lands you in a populated account.
      return {
        ...state,
        session: action.user,
        favorites: buildDemoFavorites(),
        lessons: buildDemoLessons(),
        userReviews: buildDemoReviews(),
        conversations: buildDemoConversations(),
        ui: { ...state.ui, authOpen: false, authNotice: null },
      };
    }
    case "signUp": {
      // A fresh account is honestly empty — the empty states are part of the design.
      return {
        ...state,
        session: action.user,
        favorites: [],
        lessons: [],
        userReviews: [],
        conversations: [],
        ui: { ...state.ui, authOpen: false, authNotice: null },
      };
    }
    case "signOut":
      return { ...EMPTY, ui: { ...state.ui, authOpen: false, authNotice: null } };

    case "toggleFavorite":
      return {
        ...state,
        favorites: state.favorites.includes(action.tutorId)
          ? state.favorites.filter((f) => f !== action.tutorId)
          : [...state.favorites, action.tutorId],
      };

    case "addLessons":
      return { ...state, lessons: [...action.lessons, ...state.lessons] };

    case "cancelLesson":
      return {
        ...state,
        lessons: state.lessons.map((l) =>
          l.id === action.lessonId ? { ...l, status: "cancelled" as const } : l
        ),
      };

    case "completeLesson":
      return {
        ...state,
        lessons: state.lessons.map((l) =>
          l.id === action.lessonId
            ? { ...l, status: "completed" as const, notes: action.notes ?? l.notes }
            : l
        ),
      };

    case "giveReview": {
      const review: UserReview = {
        id: uid("ur"),
        tutorId: action.tutorId,
        stars: action.stars,
        tags: action.tags,
        text: action.text,
        date: Date.now(),
        author: "You",
        lessons: 1,
      };
      return {
        ...state,
        lessons: state.lessons.map((l) =>
          l.id === action.lessonId ? { ...l, reviewed: true } : l
        ),
        userReviews: [review, ...state.userReviews],
      };
    }

    case "addMessage":
      return {
        ...state,
        conversations: appendMessage(
          ensureConversation(state.conversations, action.tutorId),
          action.tutorId,
          action.from,
          action.text
        ),
      };

    case "ensureConversation":
      return {
        ...state,
        conversations: ensureConversation(state.conversations, action.tutorId),
      };

    case "markConversationRead":
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.tutorId === action.tutorId ? { ...c, read: true } : c
        ),
      };

    case "toast":
      return {
        ...state,
        toasts: [
          ...state.toasts.slice(-4),
          { id: uid("t"), text: action.text, kind: action.kind ?? "success" },
        ],
      };

    case "dismissToast":
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };

    case "openAuth":
      return {
        ...state,
        ui: { ...state.ui, authOpen: true, authNotice: action.notice ?? null },
      };

    case "closeAuth":
      return { ...state, ui: { ...state.ui, authOpen: false, authNotice: null } };

    case "setSearch":
      return { ...state, ui: { ...state.ui, searchOpen: action.open } };

    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced persistence of the durable slice.
  useEffect(() => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      const payload: PersistedState = {
        version: 2,
        session: state.session,
        favorites: state.favorites,
        lessons: state.lessons,
        userReviews: state.userReviews,
        conversations: state.conversations,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch {
        /* storage unavailable — the demo still works, it just won't remember */
      }
    }, 150);
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [
    state.session,
    state.favorites,
    state.lessons,
    state.userReviews,
    state.conversations,
  ]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

/** Total unread conversations — the nav badge. */
export function unreadTotal(conversations: Conversation[]): number {
  let n = 0;
  for (const c of conversations) {
    if (!c.read) n += 1;
  }
  return n;
}

export function toast(
  dispatch: Dispatch<Action>,
  text: string,
  kind: ToastKind = "success"
) {
  dispatch({ type: "toast", text, kind });
}

/** STORAGE_KEY is exported for the footer's "reset demo" affordance. */
export { STORAGE_KEY };
