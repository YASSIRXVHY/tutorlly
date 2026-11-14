'use client';

/**
 * VideoTile — one participant's video feed, with the full designed
 * fallback ladder: live stream → camera-off (avatar) → waiting for the
 * tutor device (placeholder + invite hint).
 */
import { useEffect, useRef, type ReactNode } from "react";
import { MicOff, VideoOff } from "lucide-react";
import { Avatar } from "../common/Avatar";
import { cx } from "../../utils/misc";

export interface VideoTileProps {
  stream: MediaStream | null;
  name: string;
  /** "You" / tutor name — chip bottom-left. */
  label: string;
  avatarSrc?: string;
  /** Local preview shouldn't play its own audio back (echo). */
  isLocal?: boolean;
  micOn?: boolean;
  camOn?: boolean;
  /** Placeholder state text when no stream (e.g. "Camera off" / "Waiting…"). */
  placeholder?: string;
  /** Speaking indicator (demo mode waves). */
  speaking?: boolean;
  waiting?: boolean;
  children?: ReactNode;
  className?: string;
}

export function VideoTile({
  stream,
  name,
  label,
  avatarSrc,
  isLocal = false,
  micOn = true,
  camOn = true,
  placeholder,
  speaking = false,
  waiting = false,
  children,
  className,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (stream && el.srcObject !== stream) {
      el.srcObject = stream;
      el.play().catch(() => {
        /* autoplay guard — muted video plays, audio needs user gesture */
      });
    }
    if (!stream) el.srcObject = null;
  }, [stream]);

  const videoTrackOn = stream?.getVideoTracks().some((t) => t.enabled) ?? false;
  const showVideo = Boolean(stream) && (isLocal ? camOn && videoTrackOn : videoTrackOn);

  return (
    <div className={cx("cl-tile", waiting && "cl-tile--waiting", className)}>
      {showVideo ? (
        <video ref={videoRef} autoPlay playsInline muted={isLocal} aria-label={`${label} video feed`} />
      ) : (
        <div className="cl-tile-fallback">
          <Avatar name={name} src={avatarSrc} size="lg" ring />
          <span className="cl-tile-fallback-name">{label}</span>
          {placeholder ? <span className="cl-tile-fallback-note">{placeholder}</span> : null}
          {speaking ? (
            <span className="wavebars cl-tile-wave" aria-hidden>
              <span className="wavebar" />
              <span className="wavebar" />
              <span className="wavebar" />
              <span className="wavebar" />
              <span className="wavebar" />
              <span className="wavebar" />
              <span className="wavebar" />
            </span>
          ) : null}
        </div>
      )}
      <span className="cl-tile-label">{label}</span>
      {children}
      {!micOn ? (
        <span className="cl-tile-mic" role="img" aria-label="Microphone off">
          <MicOff size={13} aria-hidden />
        </span>
      ) : null}
      {stream && !showVideo && !waiting ? (
        <span className="cl-tile-mic" role="img" aria-label="Camera off">
          <VideoOff size={13} aria-hidden />
        </span>
      ) : null}
    </div>
  );
}
