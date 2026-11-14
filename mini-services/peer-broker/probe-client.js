const Peer = require("peerjs").default || require("peerjs");
const log = (...a) => console.log("[probe]", ...a);
(async () => {
  const host = new Peer("probe-host-x1", { host: "localhost", port: 3031, path: "/peerjs", secure: false, debug: 0, config: { iceServers: [] } });
  const hostOpen = await new Promise((res) => {
    host.on("open", () => res("open"));
    host.on("error", (e) => res("err:" + (e && e.type) + "/" + (e && e.message)));
    setTimeout(() => res("timeout"), 6000);
  });
  log("host:", hostOpen);
  if (hostOpen !== "open") process.exit(1);
  let hostGot = "";
  host.on("connection", (c) => {
    c.on("data", (d) => { hostGot = String(d); c.send("pong"); });
  });
  const guest = new Peer({ host: "localhost", port: 3031, path: "/peerjs", secure: false, debug: 0, config: { iceServers: [] } });
  const guestOpen = await new Promise((res) => {
    guest.on("open", () => res("open:" + guest.id));
    guest.on("error", (e) => res("err:" + (e && e.type) + "/" + (e && e.message)));
    setTimeout(() => res("timeout"), 6000);
  });
  log("guest:", guestOpen);
  if (!guestOpen.startsWith("open")) process.exit(1);
  const conn = guest.connect("probe-host-x1", { reliable: true });
  const chan = await new Promise((res) => {
    const to = setTimeout(() => res("chan-timeout"), 6000);
    conn.on("open", () => { clearTimeout(to); res("chan-open"); });
    conn.on("error", (e) => { clearTimeout(to); res("chan-err:" + (e && e.type)); });
  });
  log("channel:", chan);
  if (chan !== "chan-open") process.exit(1);
  conn.send("ping");
  await new Promise((r) => setTimeout(r, 800));
  log("hostGot:", hostGot);
  try { host.destroy(); guest.destroy(); } catch (e) {}
  process.exit(hostGot === "ping" ? 0 : 2);
})().catch((e) => { log("exception", e && e.message); process.exit(3); });
