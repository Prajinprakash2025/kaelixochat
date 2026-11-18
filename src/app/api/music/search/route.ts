import { NextResponse } from "next/server";
import { MusicTrack } from "@/types";

// Curated Top Hits & Stations for instant play
const CURATED_TRENDING: MusicTrack[] = [
  {
    id: "tOM-nWPcR4U",
    title: "Illuminati | Aavesham",
    artist: "Sushin Shyam, Dabzee, Vinayak Sasikumar",
    duration: 149,
    durationFormatted: "2:29",
    thumbnail: "https://i.ytimg.com/vi/tOM-nWPcR4U/hqdefault.jpg",
    url: "https://www.youtube.com/watch?v=tOM-nWPcR4U",
    source: "youtube",
  },
  {
    id: "HkvVaj_28C8",
    title: "Armadham | Aavesham",
    artist: "Sushin Shyam, Pranavam Sasi",
    duration: 187,
    durationFormatted: "3:07",
    thumbnail: "https://i.ytimg.com/vi/HkvVaj_28C8/hqdefault.jpg",
    url: "https://www.youtube.com/watch?v=HkvVaj_28C8",
    source: "youtube",
  },
  {
    id: "W6-O00alJUo",
    title: "Kuthanthram | Manjummel Boys",
    artist: "Sushin Shyam, Vedan",
    duration: 266,
    durationFormatted: "4:26",
    thumbnail: "https://i.ytimg.com/vi/W6-O00alJUo/hqdefault.jpg",
    url: "https://www.youtube.com/watch?v=W6-O00alJUo",
    source: "youtube",
  },
  {
    id: "2eOuXhyGvVo",
    title: "Katchi Sera",
    artist: "Sai Abhyankkar",
    duration: 191,
    durationFormatted: "3:11",
    thumbnail: "https://i.ytimg.com/vi/2eOuXhyGvVo/hqdefault.jpg",
    url: "https://www.youtube.com/watch?v=2eOuXhyGvVo",
    source: "youtube",
  },
  {
    id: "kffacxfA7G4",
    title: "Vazhiye | Minnal Murali",
    artist: "Sushin Shyam",
    duration: 232,
    durationFormatted: "3:52",
    thumbnail: "https://i.ytimg.com/vi/kffacxfA7G4/hqdefault.jpg",
    url: "https://www.youtube.com/watch?v=kffacxfA7G4",
    source: "youtube",
  },
  {
    id: "jfKfPfyJRdk",
    title: "Lofi Hip Hop Radio - Beats to Relax/Code",
    artist: "Lofi Girl",
    duration: 0,
    durationFormatted: "24/7 Live",
    thumbnail: "https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg",
    url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
    source: "youtube",
  },
  {
    id: "4xDzrJKXOOY",
    title: "synthwave radio - chill beats to code to",
    artist: "Lofi Girl",
    duration: 0,
    durationFormatted: "24/7 Live",
    thumbnail: "https://i.ytimg.com/vi/4xDzrJKXOOY/hqdefault.jpg",
    url: "https://www.youtube.com/watch?v=4xDzrJKXOOY",
    source: "youtube",
  },
];

// Helper to extract YouTube video ID from URL or raw ID
function extractVideoId(text: string): string | null {
  if (!text) return null;
  const clean = text.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
  const regex = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const match = clean.match(regex);
  return match ? match[1] : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const trending = searchParams.get("trending") === "true";

  if (!q || trending) {
    return NextResponse.json({
      success: true,
      query: "",
      tracks: CURATED_TRENDING,
    });
  }

  // 1. Direct YouTube URL or Video ID
  const directVideoId = extractVideoId(q);
  if (directVideoId) {
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${directVideoId}&format=json`,
        { next: { revalidate: 3600 } }
      );
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        const directTrack: MusicTrack = {
          id: directVideoId,
          title: data.title || "YouTube Audio",
          artist: data.author_name || "YouTube Creator",
          duration: 180,
          durationFormatted: "3:00",
          thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${directVideoId}/hqdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${directVideoId}`,
          source: "youtube",
        };
        return NextResponse.json({
          success: true,
          query: q,
          tracks: [directTrack, ...CURATED_TRENDING.slice(0, 4)],
        });
      }
    } catch (e) {
      console.warn("oEmbed fetch failed for", directVideoId, e);
    }
  }

  // 2. Keyword Search on YouTube
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
    const ytRes = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 300 }, // Cache search for 5 minutes
    });

    if (ytRes.ok) {
      const html = await ytRes.text();
      const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
      if (match && match[1]) {
        const parsed = JSON.parse(match[1]);
        const sections =
          parsed.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
            ?.contents || [];

        const tracks: MusicTrack[] = [];
        for (const section of sections) {
          const items = section.itemSectionRenderer?.contents || [];
          for (const item of items) {
            const v = item.videoRenderer;
            if (v && v.videoId && v.lengthText) {
              const title =
                v.title?.runs?.[0]?.text || v.title?.simpleText || "YouTube Audio Track";
              const artist = v.ownerText?.runs?.[0]?.text || "YouTube Music";
              const durationStr = v.lengthText?.simpleText || "0:00";
              const parts = durationStr.split(":").map(Number);
              let sec = 0;
              if (parts.length === 3) sec = parts[0] * 3600 + parts[1] * 60 + parts[2];
              else if (parts.length === 2) sec = parts[0] * 60 + parts[1];

              const thumb =
                v.thumbnail?.thumbnails?.[v.thumbnail.thumbnails.length - 1]?.url ||
                `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;

              tracks.push({
                id: v.videoId,
                title,
                artist,
                duration: sec,
                durationFormatted: durationStr,
                thumbnail: thumb,
                url: `https://www.youtube.com/watch?v=${v.videoId}`,
                source: "youtube",
              });
            }
          }
        }

        if (tracks.length > 0) {
          return NextResponse.json({
            success: true,
            query: q,
            tracks: tracks.slice(0, 10),
          });
        }
      }
    }
  } catch (err) {
    console.warn("YouTube search error:", err);
  }

  // Fallback to filtered curated
  const filtered = CURATED_TRENDING.filter(
    (t) =>
      t.title.toLowerCase().includes(q.toLowerCase()) ||
      t.artist.toLowerCase().includes(q.toLowerCase())
  );

  return NextResponse.json({
    success: true,
    query: q,
    tracks: filtered.length > 0 ? filtered : CURATED_TRENDING,
  });
}
