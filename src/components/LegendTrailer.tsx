"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize, MoreVertical, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { TrailerPlayer } from "@/components/TrailerPlayer";

const VIDEO_EXT = /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i;

function isDirectVideo(src?: string) {
  if (!src) return false;
  return VIDEO_EXT.test(src) || src.startsWith("blob:") || src.startsWith("data:");
}

function clock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * The ±15s skip glyph — a three-quarter arc with an arrowhead and the number
 * inside it. lucide's rotate icons leave no room for the "15", which is the
 * only part of the control that tells you how far it jumps.
 */
function SkipIcon({ back = false }: { back?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5">
      <g
        transform={back ? "scale(-1,1) translate(-24,0)" : undefined}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 4a8 8 0 1 0 7.5 5.2" />
        <path d="M20.5 3.5v5h-5" />
      </g>
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fill="currentColor"
        stroke="none"
        fontSize="9.5"
        fontWeight="600"
        fontFamily="inherit"
      >
        15
      </text>
    </svg>
  );
}

const CTRL =
  "inline-flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export function LegendTrailer({
  src,
  poster,
  name,
  subtitle = "Documentary Trailer",
}: {
  src?: string;
  poster?: string;
  name: string;
  subtitle?: string;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);

  const direct = isDirectVideo(src);

  const toggle = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const skip = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(Math.max(v.currentTime + delta, 0), v.duration || 0);
  }, []);

  const scrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const box = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - box.left) / box.width) * v.duration;
  };

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.playbackRate = speed;
  }, [speed]);

  // Close the speed menu on an outside click so it behaves like a menu rather
  // than a sticky panel over the video.
  useEffect(() => {
    if (!speedOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setSpeedOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [speedOpen]);

  const frame =
    "relative aspect-[16/10] w-full overflow-hidden rounded-[12px] border border-[#4A4A4A] bg-black sm:aspect-[1200/640]";

  const badge = (
    <span className="pointer-events-none absolute right-4 top-4 z-20 inline-flex h-11 items-center rounded-full border-[1.5px] border-ink-700 bg-ink-800 px-6 text-[15px] font-medium text-white sm:right-6 sm:top-6">
      Trailer
    </span>
  );

  // Embedded players (YouTube/Vimeo) own their own chrome, so we only dress the
  // frame around them.
  if (!direct) {
    return (
      <div className={frame}>
        <TrailerPlayer
          src={src}
          poster={poster}
          title={`${name} — ${subtitle}`}
          className="absolute inset-0 h-full w-full"
        />
        {badge}
      </div>
    );
  }

  const progress = duration ? (time / duration) * 100 : 0;

  return (
    <div ref={wrapRef} className={frame}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        preload="metadata"
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
        className="absolute inset-0 h-full w-full cursor-pointer object-cover object-top"
      />

      {badge}

      {/* Bottom scrim — carries the title block and the controls. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[185px] bg-gradient-to-t from-black via-black/80 to-transparent"
      />

      <div className="absolute inset-x-4 bottom-4 sm:inset-x-10 sm:bottom-6">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-base font-medium text-white sm:text-xl">
              {name}
            </p>
            <p className="mt-1 truncate text-sm text-[#A5A5A5] sm:text-[15px]">
              {subtitle}
            </p>
          </div>
          <p className="shrink-0 text-sm tabular-nums text-[#A5A5A5] sm:text-[15px]">
            {clock(time)} / {clock(duration)}
          </p>
        </div>

        {/* Progress. A 2px rail with a generous invisible hit area above and
            below it, so it is grabbable without being a thick bar. */}
        <div
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(time)}
          onClick={scrub}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") skip(5);
            if (e.key === "ArrowLeft") skip(-5);
          }}
          className="group mt-4 cursor-pointer py-2"
        >
          <div className="h-0.5 w-full rounded-full bg-[#D9D9D9]/40">
            <div
              className="h-full rounded-full bg-white transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? "Pause" : "Play"}
              className={CTRL}
            >
              {playing ? (
                <Pause className="h-[18px] w-[18px] fill-current" />
              ) : (
                <Play className="h-[18px] w-[18px] fill-current" />
              )}
            </button>
            <button
              type="button"
              onClick={() => skip(-15)}
              aria-label="Back 15 seconds"
              className={CTRL}
            >
              <SkipIcon back />
            </button>
            <button
              type="button"
              onClick={() => skip(15)}
              aria-label="Forward 15 seconds"
              className={CTRL}
            >
              <SkipIcon />
            </button>
          </div>

          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const v = videoRef.current;
                if (v) v.muted = !v.muted;
              }}
              aria-label={muted ? "Unmute" : "Mute"}
              className={CTRL}
            >
              {muted ? (
                <VolumeX className="h-[18px] w-[18px]" />
              ) : (
                <Volume2 className="h-[18px] w-[18px]" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                if (document.fullscreenElement) document.exitFullscreen();
                else wrapRef.current?.requestFullscreen?.();
              }}
              aria-label="Full screen"
              className={CTRL}
            >
              <Maximize className="h-[18px] w-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => setSpeedOpen((v) => !v)}
              aria-label="Playback speed"
              aria-expanded={speedOpen}
              className={CTRL}
            >
              <MoreVertical className="h-[18px] w-[18px]" />
            </button>

            {speedOpen && (
              <ul className="absolute bottom-11 right-0 z-30 w-32 overflow-hidden rounded-[12px] border-[1.5px] border-ink-700 bg-ink-800 py-1">
                {SPEEDS.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => {
                        setSpeed(s);
                        setSpeedOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-4 py-2 text-sm transition hover:bg-white/10 ${
                        s === speed ? "text-white" : "text-[#A5A5A5]"
                      }`}
                    >
                      {s === 1 ? "Normal" : `${s}x`}
                      {s === speed && <span aria-hidden>•</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
