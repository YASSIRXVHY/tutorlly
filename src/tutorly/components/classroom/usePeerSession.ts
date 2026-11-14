'use client';

/**
 * usePeerSession — real peer-to-peer live sessions via PeerJS.
 *
 * The student tab is the HOST: it claims a deterministic peer id
 * (`tutorly-{room}-host`) and waits. The "tutor device" is a GUEST: a second
 * tab (opened via the invite button/link) connects to that id. Once the data
 * channel is open, both sides exchange:
 *   {t:'stroke', s} — whiteboard strokes, drawn on both canvases
 *   {t:'clear'} / {t:'undo'} — board commands
 *   {t:'chat', text, name} — class chat
 *   {t:'hello', name, role} — handshake
 * plus live audio/video via getUserMedia (falling back gracefully to
 * camera-off mode when permission is denied, and to full demo mode when no
 * second device ever arrives).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Peer from "peerjs";
import type { DataConnection, MediaConnection } from "peerjs";
import type { Stroke } from "./Whiteboard";
import { resolveBroker, gatewayPeerOptions, type BrokerInfo } from "./broker";

export type PeerStatus = "idle" | "connecting" | "live" | "demo" | "failed";

export interface PeerMessage {
  t: "stroke" | "clear" | "undo" | "chat" | "hello";
  s?: Stroke;
  text?: string;
  name?: string;
  role?: "host" | "guest";
}

export interface PeerSessionOptions {
  /** Deterministic room id (shortCode of the lesson). */
  roomId: string;
  /** host = student tab, guest = the tutor device tab. */
  role: "host" | "guest";
  /** Only start once the session UI is live. */
  enabled: boolean;
  onMessage: (msg: PeerMessage) => void;
}

const HOST_PREFIX = "tutorly";
const hostPeerId = (roomId: string) => `${HOST_PREFIX}-${roomId}-host`;

/** Wait helpers that don't keep the process alive in Node SSR-land. */
function wait(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
void wait;

/** Broker errors worth one automatic gateway-relay retry before demo mode. */
const BROKER_ERRORS = ["network", "server-error", "socket-error", "ssl-unavailable", "websocket-error"];

export function usePeerSession({ roomId, role, enabled, onMessage }: PeerSessionOptions) {
  const [status, setStatus] = useState<PeerStatus>("idle");
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [cameraDenied, setCameraDenied] = useState(false);

  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const callRef = useRef<MediaConnection | null>(null);
  const msgRef = useRef(onMessage);
  const endedRef = useRef(false);
  const demoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);
  const brokerRef = useRef<BrokerInfo | null>(null);
  const fallbackTriedRef = useRef(false);

  useEffect(() => {
    msgRef.current = onMessage;
  }, [onMessage]);

  const stopStream = (s: MediaStream | null) => {
    s?.getTracks().forEach((tr) => tr.stop());
  };

  const teardown = useCallback(() => {
    endedRef.current = true;
    if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    try {
      callRef.current?.close();
    } catch { /* already closed */ }
    try {
      connRef.current?.close();
    } catch { /* already closed */ }
    try {
      peerRef.current?.destroy();
    } catch { /* already destroyed */ }
    callRef.current = null;
    connRef.current = null;
    peerRef.current = null;
    setRemoteStream(null);
  }, []);

  /** Media acquisition: full → audio-only → none (camera-off mode).
   *  Every attempt is raced against a timeout: a permission prompt that
   *  never settles (kiosk browsers, locked-down contexts) must never be
   *  allowed to hang the whole session — the room opens camera-off. */
  const acquireMedia = useCallback(async (): Promise<MediaStream | null> => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraDenied(true);
      return null;
    }
    const raceTimeout = (p: Promise<MediaStream>, ms: number) =>
      Promise.race([
        p,
        new Promise<null>((res) => setTimeout(() => res(null), ms)),
      ]);
    try {
      const s = await raceTimeout(
        navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true,
        }),
        4000
      );
      if (s) {
        setCameraDenied(false);
        return s;
      }
    } catch { /* denied or unavailable — try audio-only */ }
    try {
      const s = await raceTimeout(
        navigator.mediaDevices.getUserMedia({ audio: true }),
        2500
      );
      if (s) {
        setCameraDenied(true);
        return s;
      }
    } catch { /* no microphone either — camera-off session */ }
    setCameraDenied(true);
    return null;
  }, []);

  const attachConn = useCallback(
    (conn: DataConnection, alreadyOpen = false) => {
      connRef.current = conn;
      const hello = () => {
        setStatus("live");
        try {
          conn.send({ t: "hello", name: role === "host" ? "student" : "tutor", role });
        } catch {
          /* channel momentarily gone */
        }
      };
      // The guest attaches inside its own on-open callback — the event has
      // already fired by then, so we flip status directly instead of
      // listening for an open that will never fire again.
      if (alreadyOpen) hello();
      else conn.on("open", hello);
      conn.on("data", (d: unknown) => {
        if (d && typeof d === "object" && "t" in (d as PeerMessage)) {
          msgRef.current(d as PeerMessage);
        }
      });
      conn.on("close", () => {
        // The far side left — back to solo demo mode (media stays for re-joins).
        if (connRef.current === conn) connRef.current = null;
        setRemoteStream((prev) => {
          stopStream(prev);
          return null;
        });
        setStatus("demo");
      });
      conn.on("error", () => {
        /* transport hiccups — the close handler covers real loss */
      });
    },
    [role]
  );

  const wireHost = useCallback(async (myId: string, stream: MediaStream | null) => {
    const peer = peerRef.current;
    if (!peer) return;
    peer.on("connection", (conn) => {
      attachConn(conn);
      if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
    });
    peer.on("call", (call) => {
      callRef.current = call;
      call.answer(stream ?? undefined);
      call.on("stream", (remote) => {
        setRemoteStream(remote as MediaStream);
      });
      call.on("close", () => {
        setRemoteStream((prev) => {
          stopStream(prev);
          return null;
        });
      });
    });
    // Host waits 4.5s for the tutor device; solo demo mode after that,
    // but the listener stays warm — late joiners flip us back to live.
    demoTimerRef.current = setTimeout(() => {
      if (!connRef.current && !endedRef.current) setStatus("demo");
    }, 4500);
    void myId; // (peer id fixed at construction)
  }, [attachConn]);

  const wireGuestRef = useRef<((peer: Peer, stream: MediaStream | null) => Promise<void>) | null>(null);

  const wireGuest = useCallback(
    async (peer: Peer, stream: MediaStream | null): Promise<void> => {
      const target = hostPeerId(roomId);
      const tryConnect = async (): Promise<boolean> => {
        const conn = peer.connect(target, { reliable: true });
        return await new Promise<boolean>((resolve) => {
          // ICE over loopback takes ~5-10s here; a too-short timeout kills
          // healthy attempts mid-negotiation.
          const timeout = setTimeout(() => resolve(false), 12000);
          conn.on("open", () => {
            clearTimeout(timeout);
            attachConn(conn, true);
            const call = stream ? peer.call(target, stream) : peer.call(target, new MediaStream());
            if (call) {
              callRef.current = call;
              call.on("stream", (remote) => setRemoteStream(remote as MediaStream));
              call.on("close", () => {
                setRemoteStream((prev) => {
                  stopStream(prev);
                  return null;
                });
              });
            }
            resolve(true);
          });
          conn.on("error", () => {
            clearTimeout(timeout);
            resolve(false);
          });
        });
      };
      const ok = await tryConnect();
      if (!ok && !endedRef.current) {
        attemptsRef.current += 1;
        if (attemptsRef.current >= 5) {
          setStatus("demo");
          return;
        }
        retryTimerRef.current = setTimeout(async () => {
          if (!endedRef.current && !connRef.current) await wireGuestRef.current?.(peer, stream);
        }, 2600);
      }
    },
    [attachConn, roomId]
  );

  useEffect(() => {
    wireGuestRef.current = wireGuest;
  }, [wireGuest]);

  const startRef = useRef<(() => Promise<void>) | null>(null);

  const start = useCallback(async () => {
    if (peerRef.current || endedRef.current) return;
    endedRef.current = false;
    setStatus("connecting");
    const stream = await acquireMedia();
    setMyStream(stream);

    // Which signaling broker: explicit override, else origin default
    // (cloud locally, gateway relay in the sandbox preview).
    if (!brokerRef.current) brokerRef.current = resolveBroker();
    const opts = brokerRef.current.opts;

    const makePeer = (id?: string) =>
      opts
        ? id
          ? new Peer(id, opts)
          : new Peer(opts)
        : id
          ? new Peer(id, { debug: 0 })
          : new Peer({ debug: 0 });

    // One automatic retry through the gateway relay when the primary
    // broker can't be reached (captive networks, blocked WebSockets).
    const tryGatewayFallback = (): boolean => {
      if (fallbackTriedRef.current || brokerRef.current?.mode === "gateway") return false;
      fallbackTriedRef.current = true;
      brokerRef.current = {
        mode: "gateway",
        label: "Gateway relay (auto-fallback)",
        opts: gatewayPeerOptions(),
      };
      return true;
    };

    const restartViaGateway = () => {
      try { peerRef.current?.destroy(); } catch { /* noop */ }
      peerRef.current = null;
      retryTimerRef.current = setTimeout(() => {
        void startRef.current?.();
      }, 900);
    };

    try {
      if (role === "host") {
        peerRef.current = makePeer(hostPeerId(roomId));
        peerRef.current.on("open", () => void wireHost(hostPeerId(roomId), stream));
        peerRef.current.on("error", (err) => {
          const type = (err as { type?: string })?.type;
          if (type === "unavailable-id" && !endedRef.current) {
            // A previous instance of this room is still releasing on the
            // broker — destroy, breathe, and reclaim (bounded, 4 tries).
            attemptsRef.current += 1;
            try { peerRef.current?.destroy(); } catch { /* noop */ }
            peerRef.current = null;
            if (attemptsRef.current > 4) {
              setStatus("demo");
              return;
            }
            retryTimerRef.current = setTimeout(() => {
              void startRef.current?.();
            }, 1600);
          } else if (BROKER_ERRORS.includes(type ?? "") && !connRef.current && !endedRef.current && tryGatewayFallback()) {
            restartViaGateway();
          } else if (type && type !== "peer-unavailable" && !connRef.current && !endedRef.current) {
            // Broker unreachable / network error — demo mode with a designed state.
            setStatus("demo");
          }
        });
      } else {
        peerRef.current = makePeer();
        peerRef.current.on("open", () => void wireGuest(peerRef.current!, stream));
        peerRef.current.on("error", (err) => {
          const type = (err as { type?: string })?.type;
          if (type === "peer-unavailable" && !endedRef.current) {
            // Host isn't up yet — the wireGuest retry ladder handles it.
            return;
          }
          if (BROKER_ERRORS.includes(type ?? "") && !connRef.current && !endedRef.current && tryGatewayFallback()) {
            restartViaGateway();
            return;
          }
          if (type && !connRef.current && !endedRef.current) setStatus("demo");
        });
      }
    } catch {
      setStatus("failed");
    }

  }, [acquireMedia, roomId, role, wireGuest, wireHost]);

  useEffect(() => {
    startRef.current = start;
  }, [start]);

  const send = useCallback((msg: PeerMessage) => {
    const conn = connRef.current;
    if (conn && conn.open) {
      try {
        conn.send(msg);
      } catch {
        /* channel momentarily gone — ignore */
      }
    }
  }, []);

  const end = useCallback(() => {
    teardown();
    stopStream(myStream);
    setMyStream(null);
    setStatus("idle");
     
  }, [teardown, myStream]);

  useEffect(() => {
    if (enabled) {
      // A fresh effect setup means the session is live again — previous
      // cleanups (Fast Refresh remounts, StrictMode, re-entry) must not
      // deadlock start() through a stale endedRef.
      endedRef.current = false;
      void start();
    }
    return () => {
      endedRef.current = true;
      teardown();
    };
    // role/roomId in deps: if the identity settles late for any reason,
    // the wrongly-roled peer is torn down and restarted correctly.
     
  }, [enabled, role, roomId]);

  return { status, myStream, remoteStream, cameraDenied, send, end };
}
