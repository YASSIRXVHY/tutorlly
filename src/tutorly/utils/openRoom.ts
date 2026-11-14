/**
 * Opens a classroom window — the P2P test bench affordance shared by the
 * dashboard and the admin console. "tutor" joins as the demo teacher device.
 */
export function openRoomWindow(role: "student" | "tutor", lessonId = "demo"): void {
  const url = `${window.location.origin}${window.location.pathname}#/classroom/${lessonId}${
    role === "tutor" ? "?role=tutor" : ""
  }`;
  window.open(url, "_blank", "noopener");
}
