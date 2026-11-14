/**
 * Tutorly dev relay — a minimal peerjs-compatible signaling server
 * (~70 lines of protocol: REST id allocation + WS message relay).
 * Accepts ANY path (the npm `peer` server's exact-path matching breaks
 * against peerjs client 1.5.5 in this environment). Production apps use
 * the PeerJS cloud; this relay exists for sandboxed verification and
 * offline demos. Protocol summary (from peerjs 1.5.5 client source):
 *   GET  {anything}/id?ts=&version=  -> 200 text: <uuid>
 *   WS   ?key=&id=&token=&version=  -> server sends {type:"OPEN"}
 *   relay client JSON {type:OFFER|ANSWER|CANDIDATE|LEAVE..., src, dst, payload}
 *        to the socket registered as `dst`; undeliverable -> {type:"EXPIRE", src:dst}
 */
const http = require("http");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");

const clients = new Map(); // peer id -> ws

const server = http.createServer((req, res) => {
  // NOTE: through the platform gateway the whole peerjs URL arrives inside
  // the query string ("/?XTransformPort=3031&j=/peerjs/id"), and the peerjs
  // client's URLSearchParams re-encodes it ("%2Fpeerjs%2Fid") — so decode
  // before matching.
  let urlDecoded = req.url;
  try {
    urlDecoded = decodeURIComponent(req.url);
  } catch {
    /* malformed escape — fall back to the raw URL */
  }
  if (urlDecoded.includes("/id")) {
    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(crypto.randomUUID());
    console.log(`[relay ${new Date().toISOString().slice(11, 23)}] id allocated -> ${res.statusMessage === "" ? "" : ""}`);
    return;
  }
  res.writeHead(404, { "Access-Control-Allow-Origin": "*" });
  res.end("not found");
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    const url = new URL(req.url, "http://localhost");
    const id = url.searchParams.get("id");
    if (!id) {
      ws.close(4003, "no id");
      return;
    }
    if (clients.has(id)) {
      ws.send(JSON.stringify({ type: "ID-TAKEN" }));
      setTimeout(() => ws.close(4001, "id taken"), 250);
      console.log(`[relay ${new Date().toISOString().slice(11, 23)}] ID-TAKEN ${id}`);
      return;
    }
    clients.set(id, ws);
    ws.send(JSON.stringify({ type: "OPEN" }));
    console.log(`[relay ${new Date().toISOString().slice(11, 23)}] joined ${id} (${clients.size} online)`);
    ws.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (!msg || !msg.type) return;
      if (msg.type === "HEARTBEAT") return;
      // The peerjs client does not set src on outgoing messages —
      // the server stamps the sender's identity (this is what the
      // official peerjs-server does inside its message handler).
      msg.src = id;
      const dst = msg.dst;
      const dstWs = dst ? clients.get(dst) : null;
      console.log(`[relay ${new Date().toISOString().slice(11, 23)}] msg ${msg.type} ${String(msg.src).slice(0, 12)} -> ${String(msg.dst).slice(0, 12)}`);
      if (dstWs && dstWs.readyState === 1) {
        dstWs.send(JSON.stringify(msg));
      } else if (msg.src) {
        ws.send(JSON.stringify({ type: "EXPIRE", src: dst }));
      }
    });
    ws.on("close", () => {
      if (clients.get(id) === ws) clients.delete(id);
      console.log(`[relay ${new Date().toISOString().slice(11, 23)}] left ${id} (${clients.size} online)`);
    });
    ws.on("error", () => {});
  });
});

server.listen(3031, "0.0.0.0", () => {
  console.log("[relay] listening on http+ws://localhost:3031 (any path)");
});
