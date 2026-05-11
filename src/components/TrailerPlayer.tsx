"use client";

/**
 * Universal trailer player. Pass any URL that came from the nocode `trailerVideo`
 * field — direct video file (mp4/webm/mov/...), YouTube, or Vimeo — and it picks
 * the right embed. Renders a poster-only block if `src` is empty.
 */

import { useRef, useState } from "react";

type Props = {
  src?: string;
  poster?: string;
  title?: string;
  className?: string;
};

const VIDEO_EXT = /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i;

function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(embed|shorts)\/([^/?]+)/);
      if (m) return m[2];
    }
  } catch {
    return null;
  }
  return null;
}

function vimeoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("vimeo.com")) return null;
    const m = u.pathname.match(/\/(\d+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function DirectVideo({
  src,
  poster,
  className,
}: {
  src: string;
  poster?: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleStart = () => {
    setStarted(true);
    requestAnimationFrame(() => {
      videoRef.current?.play().catch(() => {});
    });
  };

  return (
    <div
      className={`relative bg-black ${className ?? ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <video
        ref={videoRef}
        playsInline
        preload="metadata"
        poster={poster}
        controls={started && hovered}
        className="absolute inset-0 h-full w-full"
      >
        <source src={src} />
        Your browser does not support the video tag.
      </video>
      {!started ? (
        <button
          type="button"
          onClick={handleStart}
          aria-label="Play trailer"
          className="absolute inset-0 z-10 cursor-pointer bg-transparent"
        />
      ) : null}
    </div>
  );
}

export function TrailerPlayer({ src, poster, title = "Trailer", className }: Props) {
  if (!src) {
    return (
      <div className={className}>
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-black/40 text-sm text-white/60">
            No trailer uploaded
          </div>
        )}
      </div>
    );
  }

  const yt = youtubeId(src);
  if (yt) {
    return (
      <iframe
        title={title}
        src={`https://www.youtube.com/embed/${yt}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className={className}
      />
    );
  }

  const vm = vimeoId(src);
  if (vm) {
    return (
      <iframe
        title={title}
        src={`https://player.vimeo.com/video/${vm}`}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className={className}
      />
    );
  }

  // Direct video file — covers /api/public/files/<name>.mp4 from the backend
  // upload endpoint, plus any external mp4/webm.
  if (VIDEO_EXT.test(src) || src.startsWith("blob:") || src.startsWith("data:")) {
    return <DirectVideo src={src} poster={poster} className={className} />;
  }

  // Unknown URL — try a generic iframe (works for many hosted players)
  return (
    <iframe title={title} src={src} allowFullScreen className={className} />
  );
}
