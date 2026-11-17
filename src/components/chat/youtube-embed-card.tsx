"use client";

import React, { useState, useEffect } from "react";
import { Play, ExternalLink, X, Film } from "lucide-react";

export interface YouTubeVideoInfo {
  videoId: string;
  url: string;
  isShort: boolean;
}

export interface YouTubeMeta {
  videoId: string;
  title: string;
  authorName: string;
  authorUrl: string;
  thumbnailUrl: string;
  providerName: string;
}

// In-memory cache to prevent duplicate network calls across re-renders
const metaCache = new Map<string, YouTubeMeta>();

/**
 * Extracts YouTube video IDs and metadata from text
 */
export function extractYouTubeVideos(text: string): YouTubeVideoInfo[] {
  if (!text) return [];

  // Robust regex for regular watch URLs, short youtu.be URLs, and YouTube Shorts
  const regex =
    /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[^\s"'>]*)?/gi;

  const results: YouTubeVideoInfo[] = [];
  const seenIds = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const rawUrl = match[0];
    const videoId = match[1];

    if (videoId && !seenIds.has(videoId)) {
      seenIds.add(videoId);
      const isShort = rawUrl.toLowerCase().includes("/shorts/");
      const fullUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
      results.push({
        videoId,
        url: fullUrl,
        isShort,
      });
    }

    if (results.length >= 3) break; // Limit to 3 embeds per message
  }

  return results;
}

export function YouTubeEmbedCard({
  videoId,
  url,
  isShort,
}: {
  videoId: string;
  url: string;
  isShort?: boolean;
}) {
  const [meta, setMeta] = useState<YouTubeMeta | null>(() => metaCache.get(videoId) || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [thumbError, setThumbError] = useState(false);

  useEffect(() => {
    if (metaCache.has(videoId)) {
      setMeta(metaCache.get(videoId)!);
      return;
    }

    let isMounted = true;
    fetch(`/api/youtube-preview?videoId=${videoId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: YouTubeMeta | null) => {
        if (!isMounted || !data) return;
        metaCache.set(videoId, data);
        setMeta(data);
      })
      .catch((err) => {
        console.warn("Failed to load YouTube meta:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [videoId]);

  const title = meta?.title || (isShort ? "YouTube Short" : "YouTube Video");
  const authorName = meta?.authorName || "YouTube";
  const channelUrl = meta?.authorUrl || `https://www.youtube.com/watch?v=${videoId}`;
  const thumbnailUrl =
    !thumbError && meta?.thumbnailUrl
      ? meta.thumbnailUrl
      : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <div className="my-2.5 max-w-lg w-full rounded-xl border border-neutral-200/90 dark:border-neutral-800 bg-neutral-50/70 dark:bg-[#16191d] overflow-hidden shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition">
      {/* Top Header Row (Slack-like Media Card) */}
      <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-neutral-200/60 dark:border-neutral-800/80 bg-white/60 dark:bg-neutral-900/40">
        <div className="flex items-center space-x-2 min-w-0">
          {/* Red YouTube Brand Emblem */}
          <div className="w-5 h-4 bg-red-600 rounded-sm flex items-center justify-center flex-shrink-0 shadow-xs">
            <div className="w-0 h-0 border-y-[3px] border-y-transparent border-l-[6px] border-l-white ml-0.5" />
          </div>
          <span className="font-semibold text-xs text-neutral-800 dark:text-neutral-200 flex-shrink-0">
            YouTube
          </span>
          {isShort && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center gap-0.5 flex-shrink-0">
              <Film className="w-2.5 h-2.5" /> Shorts
            </span>
          )}
          <span className="text-neutral-300 dark:text-neutral-700">•</span>
          <a
            href={channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline truncate"
            title={authorName}
          >
            {authorName}
          </a>
        </div>

        <div className="flex items-center space-x-1.5 flex-shrink-0">
          {isPlaying && (
            <button
              type="button"
              onClick={() => setIsPlaying(false)}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              title="Close player"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            title="Open in YouTube (new tab)"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Video Title */}
      <div className="px-3.5 pt-2 pb-1.5">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline line-clamp-2 leading-snug"
          title={title}
        >
          {title}
        </a>
      </div>

      {/* Live Player / Interactive Preview Body */}
      <div className="p-3 pt-1">
        <div
          className={`relative w-full ${
            isShort ? "aspect-video" : "aspect-video"
          } rounded-lg overflow-hidden bg-black shadow-inner border border-black/10`}
        >
          {isPlaying ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
              title={title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div
              onClick={() => setIsPlaying(true)}
              className="group/thumb relative w-full h-full cursor-pointer overflow-hidden bg-neutral-900 flex items-center justify-center select-none"
              title="Click to play live in chat"
            >
              {/* High-res Thumbnail */}
              <img
                src={thumbnailUrl}
                alt={title}
                className="w-full h-full object-cover group-hover:scale-102 transition duration-300 opacity-90 group-hover:opacity-100"
                onError={() => {
                  if (!thumbError) {
                    setThumbError(true);
                  }
                }}
              />

              {/* Gradient Scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 group-hover:from-black/40 transition" />

              {/* Official YouTube-style Play Button */}
              <div className="absolute z-10 w-16 h-11 bg-red-600 group-hover:bg-red-500 rounded-2xl flex items-center justify-center shadow-2xl group-hover:scale-110 transition duration-200">
                <Play className="w-6 h-6 text-white fill-white ml-0.5" />
              </div>

              {/* Live Play pill indicator */}
              <div className="absolute bottom-2.5 left-2.5 z-10 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-[11px] font-medium text-white flex items-center space-x-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span>Play Live in Chat</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function YouTubePreviews({ content }: { content: string }) {
  const videos = extractYouTubeVideos(content);
  if (videos.length === 0) return null;

  return (
    <div className="space-y-2 mt-1">
      {videos.map((vid) => (
        <YouTubeEmbedCard
          key={vid.videoId}
          videoId={vid.videoId}
          url={vid.url}
          isShort={vid.isShort}
        />
      ))}
    </div>
  );
}
