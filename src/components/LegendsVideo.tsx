"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { HERO_VIDEO_POSTER, HERO_VIDEO_SRC } from "@/lib/data";

export function LegendsVideo() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Keep React state in sync with native fullscreen changes (esc key etc.)
  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const togglePlay = async () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      await v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const toggleFullscreen = async () => {
    const el = wrapperRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  };

  return (
    <section
      aria-labelledby="legends-title"
      className="mx-auto max-w-7xl px-5 pb-16 pt-6 sm:px-8 sm:pb-24"
    >
      <h2
        id="legends-title"
        className="mx-auto max-w-2xl text-center font-serif text-3xl leading-tight text-white sm:text-5xl"
      >
        Learn from Those Who&rsquo;ve <br className="hidden sm:block" />
        Defined the Field
      </h2>

      <div
        ref={wrapperRef}
        className="group relative mx-auto mt-10 aspect-[16/9] w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-ink-800 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]"
      >
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          src={HERO_VIDEO_SRC}
          poster={HERO_VIDEO_POSTER}
          autoPlay
          muted={muted}
          loop
          playsInline
          preload="metadata"
          aria-label="Senior ophthalmology consultant introducing the OphthaXP mentorship cohorts"
        />

        {/* gradient for control legibility */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/70 to-transparent" />

        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 sm:inset-x-5 sm:bottom-5">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause video" : "Play video"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Unmute video" : "Mute video"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Expand to fullscreen"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
