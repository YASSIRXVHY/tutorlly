/**
 * Broker resolution — which PeerJS signaling server the classroom dials.
 *
 * Three modes:
 *  • cloud    — the public PeerJS broker (0.peerjs.com). Default on localhost.
 *  • gateway  — the co-located relay (mini-services/peer-broker, :3031)
 *              reached through the platform gateway's query-port route:
 *              "/?XTransformPort=3031&j=/" prepends the peerjs URL into the
 *              query string, which the gateway forwards to the relay.
 *              Default when the app is served from a non-local origin (the
 *              preview), where public WebSockets are often blocked.
 *  • local    — an explicit "host:port" override for development.
 *
 * localStorage key "tutorly-peer-dev-server":
 *   "gateway" | "cloud" | "host:port" — explicit wins over the origin default.
 */
import type { PeerOptions } from "peerjs";

export type BrokerMode = "cloud" | "gateway" | "local";

export interface BrokerInfo {
  mode: BrokerMode;
  /** Human label for the admin console. */
  label: string;
  /** null → PeerJS cloud defaults. */
  opts: PeerOptions | null;
}

export const RELAY_QUERY_PORT = 3031;

const LOCAL_HOSTNAMES = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"];

export function gatewayPeerOptions(): PeerOptions {
  const secure = location.protocol === "https:";
  const port = Number(location.port) || (secure ? 443 : 80);
  return {
    host: location.hostname,
    port,
    // The whole peerjs URL rides inside the query string so the platform
    // gateway's XTransformPort route forwards it to the local relay.
    path: `/?XTransformPort=${RELAY_QUERY_PORT}&j=/`,
    secure,
    debug: 0,
  };
}

function localPeerOptions(host: string, port: number): PeerOptions {
  return {
    host,
    port,
    path: "/",
    secure: false,
    debug: 0,
    // Local loopback needs no STUN; host candidates suffice.
    config: { iceServers: [] },
  };
}

function isLocalOrigin(): boolean {
  try {
    return (
      LOCAL_HOSTNAMES.includes(location.hostname) ||
      location.hostname.endsWith(".local")
    );
  } catch {
    return true;
  }
}

export function resolveBroker(): BrokerInfo {
  if (typeof window === "undefined") {
    return { mode: "cloud", label: "PeerJS cloud", opts: null };
  }
  try {
    const raw = localStorage.getItem("tutorly-peer-dev-server")?.trim();
    if (raw === "gateway") {
      return { mode: "gateway", label: "Gateway relay (manual)", opts: gatewayPeerOptions() };
    }
    if (raw === "cloud") {
      return { mode: "cloud", label: "PeerJS cloud (manual)", opts: null };
    }
    const m = raw ? /^([\w.-]+):(\d+)$/.exec(raw) : null;
    if (m) {
      return {
        mode: "local",
        label: `Local broker ${raw}`,
        opts: localPeerOptions(m[1], Number(m[2])),
      };
    }
  } catch {
    /* storage unavailable — fall through to the origin default */
  }
  // Origin default: the preview (non-local origin) signals through the
  // co-located relay; local development uses the PeerJS cloud.
  if (!isLocalOrigin()) {
    return { mode: "gateway", label: "Gateway relay (preview default)", opts: gatewayPeerOptions() };
  }
  return { mode: "cloud", label: "PeerJS cloud (default)", opts: null };
}

export function setBrokerMode(mode: "cloud" | "gateway"): void {
  try {
    localStorage.setItem("tutorly-peer-dev-server", mode);
  } catch {
    /* storage unavailable — mode stays per-session */
  }
}
