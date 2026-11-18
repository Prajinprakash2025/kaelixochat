import { NextResponse } from "next/server";
import { MusicTrack } from "@/types";

export interface CategoryData {
  id: string;
  name: string;
  icon: string;
  tracks: MusicTrack[];
}

const CATEGORY_CATALOG: Record<string, { name: string; icon: string; tracks: MusicTrack[] }> = {
  trending: {
    name: "Trending Now",
    icon: "🔥",
    tracks: [
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
        id: "1F3hm6MfR1k",
        title: "Hukum - Thalaivar Alappara | Jailer",
        artist: "Anirudh Ravichander",
        duration: 206,
        durationFormatted: "3:26",
        thumbnail: "https://i.ytimg.com/vi/1F3hm6MfR1k/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=1F3hm6MfR1k",
        source: "youtube",
      },
      {
        id: "4NRXx6U8ABQ",
        title: "Blinding Lights",
        artist: "The Weeknd",
        duration: 200,
        durationFormatted: "3:20",
        thumbnail: "https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=4NRXx6U8ABQ",
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
    ],
  },
  malayalam: {
    name: "Malayalam Hits",
    icon: "🌴",
    tracks: [
      {
        id: "tOM-nWPcR4U",
        title: "Illuminati | Aavesham",
        artist: "Sushin Shyam, Dabzee",
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
        id: "Gpx6G4yWf6c",
        title: "Darshana | Hridayam",
        artist: "Hesham Abdul Wahab",
        duration: 228,
        durationFormatted: "3:48",
        thumbnail: "https://i.ytimg.com/vi/Gpx6G4yWf6c/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=Gpx6G4yWf6c",
        source: "youtube",
      },
      {
        id: "zW_f860rJ5Y",
        title: "Ole Melody | Thallumaala",
        artist: "Vishnu Vijay, Haricharan",
        duration: 202,
        durationFormatted: "3:22",
        thumbnail: "https://i.ytimg.com/vi/zW_f860rJ5Y/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=zW_f860rJ5Y",
        source: "youtube",
      },
      {
        id: "1hK4_c1YJqI",
        title: "Theerame | Malik",
        artist: "Sushin Shyam, KS Chithra",
        duration: 251,
        durationFormatted: "4:11",
        thumbnail: "https://i.ytimg.com/vi/1hK4_c1YJqI/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=1hK4_c1YJqI",
        source: "youtube",
      },
      {
        id: "g00gZfUqg94",
        title: "Nee Himamazhayayi | Edakkad Battalion",
        artist: "Kailas Menon, KS Harisankar",
        duration: 245,
        durationFormatted: "4:05",
        thumbnail: "https://i.ytimg.com/vi/g00gZfUqg94/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=g00gZfUqg94",
        source: "youtube",
      },
    ],
  },
  tamil: {
    name: "Tamil Viral",
    icon: "⚡",
    tracks: [
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
        id: "1F3hm6MfR1k",
        title: "Hukum - Thalaivar Alappara | Jailer",
        artist: "Anirudh Ravichander",
        duration: 206,
        durationFormatted: "3:26",
        thumbnail: "https://i.ytimg.com/vi/1F3hm6MfR1k/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=1F3hm6MfR1k",
        source: "youtube",
      },
      {
        id: "gD8c1kR_d3c",
        title: "Badass | Leo",
        artist: "Anirudh Ravichander",
        duration: 228,
        durationFormatted: "3:48",
        thumbnail: "https://i.ytimg.com/vi/gD8c1kR_d3c/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=gD8c1kR_d3c",
        source: "youtube",
      },
      {
        id: "szvt1vD0Uug",
        title: "Naa Ready | Leo",
        artist: "Thalapathy Vijay, Anirudh",
        duration: 247,
        durationFormatted: "4:07",
        thumbnail: "https://i.ytimg.com/vi/szvt1vD0Uug/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=szvt1vD0Uug",
        source: "youtube",
      },
      {
        id: "KUN5Uf9mObQ",
        title: "Arabic Kuthu | Beast",
        artist: "Anirudh, Jonita Gandhi",
        duration: 279,
        durationFormatted: "4:39",
        thumbnail: "https://i.ytimg.com/vi/KUN5Uf9mObQ/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=KUN5Uf9mObQ",
        source: "youtube",
      },
      {
        id: "vx2u5uUny30",
        title: "Vaathi Coming | Master",
        artist: "Anirudh Ravichander",
        duration: 229,
        durationFormatted: "3:49",
        thumbnail: "https://i.ytimg.com/vi/vx2u5uUny30/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=vx2u5uUny30",
        source: "youtube",
      },
      {
        id: "x6Q7c9RyMzk",
        title: "Rowdy Baby | Maari 2",
        artist: "Dhanush, Dhee, Yuvan",
        duration: 284,
        durationFormatted: "4:44",
        thumbnail: "https://i.ytimg.com/vi/x6Q7c9RyMzk/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=x6Q7c9RyMzk",
        source: "youtube",
      },
    ],
  },
  english: {
    name: "English & Pop",
    icon: "🌍",
    tracks: [
      {
        id: "4NRXx6U8ABQ",
        title: "Blinding Lights",
        artist: "The Weeknd",
        duration: 200,
        durationFormatted: "3:20",
        thumbnail: "https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=4NRXx6U8ABQ",
        source: "youtube",
      },
      {
        id: "34Na4j8AVgA",
        title: "Starboy",
        artist: "The Weeknd ft. Daft Punk",
        duration: 230,
        durationFormatted: "3:50",
        thumbnail: "https://i.ytimg.com/vi/34Na4j8AVgA/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=34Na4j8AVgA",
        source: "youtube",
      },
      {
        id: "JGwWNGJdvx8",
        title: "Shape of You",
        artist: "Ed Sheeran",
        duration: 233,
        durationFormatted: "3:53",
        thumbnail: "https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=JGwWNGJdvx8",
        source: "youtube",
      },
      {
        id: "TUVcZfQe-Kw",
        title: "Levitating",
        artist: "Dua Lipa",
        duration: 203,
        durationFormatted: "3:23",
        thumbnail: "https://i.ytimg.com/vi/TUVcZfQe-Kw/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=TUVcZfQe-Kw",
        source: "youtube",
      },
      {
        id: "7wtfhZwyrcc",
        title: "Believer",
        artist: "Imagine Dragons",
        duration: 204,
        durationFormatted: "3:24",
        thumbnail: "https://i.ytimg.com/vi/7wtfhZwyrcc/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=7wtfhZwyrcc",
        source: "youtube",
      },
      {
        id: "ApXoWvfEYVU",
        title: "Sunflower - Spider-Man: Into the Spider-Verse",
        artist: "Post Malone, Swae Lee",
        duration: 158,
        durationFormatted: "2:38",
        thumbnail: "https://i.ytimg.com/vi/ApXoWvfEYVU/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=ApXoWvfEYVU",
        source: "youtube",
      },
    ],
  },
  lofi: {
    name: "Lo-Fi & Deep Focus",
    icon: "☕",
    tracks: [
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
      {
        id: "5qap5aO4i9A",
        title: "Lofi Beats to Study - Cozy Coffee Shop",
        artist: "Lofi Girl",
        duration: 0,
        durationFormatted: "24/7 Live",
        thumbnail: "https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=5qap5aO4i9A",
        source: "youtube",
      },
      {
        id: "wAPCSnAhhC8",
        title: "Night Drive - Synthwave Chill Radio",
        artist: "Synthwave Beats",
        duration: 0,
        durationFormatted: "24/7 Live",
        thumbnail: "https://i.ytimg.com/vi/wAPCSnAhhC8/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=wAPCSnAhhC8",
        source: "youtube",
      },
    ],
  },
  hindi: {
    name: "Hindi & Bollywood",
    icon: "🌙",
    tracks: [
      {
        id: "BddP6PYo2gs",
        title: "Kesariya | Brahmastra",
        artist: "Arijit Singh, Pritam",
        duration: 268,
        durationFormatted: "4:28",
        thumbnail: "https://i.ytimg.com/vi/BddP6PYo2gs/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=BddP6PYo2gs",
        source: "youtube",
      },
      {
        id: "ElZfdU54Cp8",
        title: "Apna Bana Le | Bhediya",
        artist: "Arijit Singh, Sachin-Jigar",
        duration: 261,
        durationFormatted: "4:21",
        thumbnail: "https://i.ytimg.com/vi/ElZfdU54Cp8/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=ElZfdU54Cp8",
        source: "youtube",
      },
      {
        id: "Umqb9KENgmk",
        title: "Tum Hi Ho | Aashiqui 2",
        artist: "Arijit Singh, Mithoon",
        duration: 262,
        durationFormatted: "4:22",
        thumbnail: "https://i.ytimg.com/vi/Umqb9KENgmk/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=Umqb9KENgmk",
        source: "youtube",
      },
      {
        id: "VAdGW7QDJUI",
        title: "Chaleya | Jawan",
        artist: "Arijit Singh, Shilpa Rao, Anirudh",
        duration: 200,
        durationFormatted: "3:20",
        thumbnail: "https://i.ytimg.com/vi/VAdGW7QDJUI/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=VAdGW7QDJUI",
        source: "youtube",
      },
    ],
  },
};

// Dynamic queries when searching by category or pagination
const CATEGORY_SEARCH_QUERIES: Record<string, string[]> = {
  trending: ["latest viral hit songs 2024", "billboard global trending music"],
  malayalam: [
    "latest malayalam hit songs 2024",
    "malayalam viral movie songs",
    "malayalam evergreen melody hits",
    "sushin shyam shaan rahman hits",
  ],
  tamil: [
    "tamil hit songs 2024",
    "anirudh songs viral hits",
    "ar rahman tamil super hits",
    "tamil melody hits",
  ],
  english: [
    "top billboard hot 100 songs",
    "viral pop songs 2024",
    "top global hits english",
  ],
  lofi: [
    "lofi hip hop radio beats to study",
    "chillhop beats coding focus",
    "ambient lofi chill songs",
  ],
  hindi: [
    "arijit singh best songs",
    "bollywood romantic hit songs",
    "hindi viral party hits",
  ],
};

// Helper to extract YouTube video ID from URL or raw ID
function extractVideoId(text: string): string | null {
  if (!text) return null;
  const clean = text.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
  const regex = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const match = clean.match(regex);
  return match ? match[1] : null;
}

// Scrape YouTube search results
async function searchYouTube(query: string, limit: number = 15): Promise<MusicTrack[]> {
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const ytRes = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 300 },
    });

    if (!ytRes.ok) return [];

    const html = await ytRes.text();
    const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
    if (!match || !match[1]) return [];

    const parsed = JSON.parse(match[1]);
    const sections =
      parsed.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
        ?.contents || [];

    const tracks: MusicTrack[] = [];
    const seenIds = new Set<string>();

    for (const section of sections) {
      const items = section.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const v = item.videoRenderer;
        if (v && v.videoId && v.lengthText && !seenIds.has(v.videoId)) {
          seenIds.add(v.videoId);
          const title =
            v.title?.runs?.[0]?.text || v.title?.simpleText || "Audio Track";
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
    return tracks.slice(0, limit);
  } catch (err) {
    console.warn("searchYouTube error:", err);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const category = (searchParams.get("category") || "trending").toLowerCase();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const trending = searchParams.get("trending") === "true";

  // 1. Direct YouTube URL or Video ID
  if (q) {
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
            tracks: [directTrack],
            hasMore: false,
          });
        }
      } catch (e) {
        console.warn("oEmbed fetch failed for", directVideoId, e);
      }
    }

    // Keyword Search
    const searchTracks = await searchYouTube(q, 20);
    return NextResponse.json({
      success: true,
      query: q,
      tracks: searchTracks,
      hasMore: searchTracks.length >= 10,
    });
  }

  // 2. Category browsing with infinite/dynamic recommendations
  const categoryInfo = CATEGORY_CATALOG[category] || CATEGORY_CATALOG["trending"];
  const curated = categoryInfo.tracks;

  if (page === 1) {
    // For page 1: Start with high quality curated tracks, and supplement with live YouTube hits
    const queryList = CATEGORY_SEARCH_QUERIES[category] || CATEGORY_SEARCH_QUERIES["trending"];
    const dynamicHits = await searchYouTube(queryList[0], 12);

    // Merge without duplicates
    const seen = new Set(curated.map((t) => t.id));
    const merged = [...curated];
    for (const t of dynamicHits) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        merged.push(t);
      }
    }

    return NextResponse.json({
      success: true,
      category,
      categoryName: categoryInfo.name,
      icon: categoryInfo.icon,
      page: 1,
      tracks: merged,
      hasMore: true,
    });
  }

  // Page 2+: Query deeper searches so it never ends
  const queryList = CATEGORY_SEARCH_QUERIES[category] || CATEGORY_SEARCH_QUERIES["trending"];
  const queryIndex = (page - 1) % queryList.length;
  const deeperHits = await searchYouTube(`${queryList[queryIndex]} page ${page}`, 15);

  return NextResponse.json({
    success: true,
    category,
    categoryName: categoryInfo.name,
    icon: categoryInfo.icon,
    page,
    tracks: deeperHits,
    hasMore: deeperHits.length >= 6,
  });
}
