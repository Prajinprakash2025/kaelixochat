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
        id: "VU23OPQ1Pmc",
        title: "Katchi Sera",
        artist: "Sai Abhyankkar",
        duration: 185,
        durationFormatted: "3:05",
        thumbnail: "https://i.ytimg.com/vi/VU23OPQ1Pmc/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=VU23OPQ1Pmc",
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
        id: "5qap5aO4i9A",
        title: "Lofi Hip Hop Radio - Beats to Relax/Code",
        artist: "Lofi Girl",
        duration: 0,
        durationFormatted: "24/7 Live",
        thumbnail: "https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=5qap5aO4i9A",
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
        id: "epAFDEJImrU",
        title: "Darshana | Hridayam",
        artist: "Hesham Abdul Wahab",
        duration: 292,
        durationFormatted: "4:52",
        thumbnail: "https://i.ytimg.com/vi/epAFDEJImrU/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=epAFDEJImrU",
        source: "youtube",
      },
      {
        id: "Bm48lOWNpBI",
        title: "Ole Melody | Thallumaala",
        artist: "Vishnu Vijay, Haricharan",
        duration: 234,
        durationFormatted: "3:54",
        thumbnail: "https://i.ytimg.com/vi/Bm48lOWNpBI/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=Bm48lOWNpBI",
        source: "youtube",
      },
      {
        id: "18cpx0zI6SY",
        title: "Theerame | Malik",
        artist: "Sushin Shyam, KS Chithra",
        duration: 270,
        durationFormatted: "4:30",
        thumbnail: "https://i.ytimg.com/vi/18cpx0zI6SY/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=18cpx0zI6SY",
        source: "youtube",
      },
      {
        id: "_eWvDaztcjI",
        title: "Manavaalan Thug | Thallumaala",
        artist: "Dabzee, SA, Vishnu Vijay",
        duration: 228,
        durationFormatted: "3:48",
        thumbnail: "https://i.ytimg.com/vi/_eWvDaztcjI/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=_eWvDaztcjI",
        source: "youtube",
      },
    ],
  },
  tamil: {
    name: "Tamil Viral",
    icon: "⚡",
    tracks: [
      {
        id: "VU23OPQ1Pmc",
        title: "Katchi Sera",
        artist: "Sai Abhyankkar",
        duration: 185,
        durationFormatted: "3:05",
        thumbnail: "https://i.ytimg.com/vi/VU23OPQ1Pmc/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=VU23OPQ1Pmc",
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
        id: "IqwIOlhfCak",
        title: "Badass | Leo",
        artist: "Anirudh Ravichander",
        duration: 236,
        durationFormatted: "3:56",
        thumbnail: "https://i.ytimg.com/vi/IqwIOlhfCak/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=IqwIOlhfCak",
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
        id: "fRD_3vJagxk",
        title: "Vaathi Coming | Master",
        artist: "Anirudh Ravichander",
        duration: 257,
        durationFormatted: "4:17",
        thumbnail: "https://i.ytimg.com/vi/fRD_3vJagxk/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=fRD_3vJagxk",
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
        id: "5qap5aO4i9A",
        title: "Lofi Hip Hop Radio - Beats to Relax/Code",
        artist: "Lofi Girl",
        duration: 0,
        durationFormatted: "24/7 Live",
        thumbnail: "https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=5qap5aO4i9A",
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
        id: "VAdGW7QDJiU",
        title: "Chaleya | Jawan",
        artist: "Arijit Singh, Shilpa Rao, Anirudh",
        duration: 188,
        durationFormatted: "3:08",
        thumbnail: "https://i.ytimg.com/vi/VAdGW7QDJiU/hqdefault.jpg",
        url: "https://www.youtube.com/watch?v=VAdGW7QDJiU",
        source: "youtube",
      },
    ],
  },
};

// Dynamic queries when searching by category or pagination
const CATEGORY_SEARCH_QUERIES: Record<string, string[]> = {
  trending: [
    "latest viral hit songs 2024",
    "billboard global trending music hits",
    "top spotify viral hits today",
    "worldwide trending songs official audio",
    "trending music playlist hits",
  ],
  malayalam: [
    "latest malayalam hit songs 2024",
    "malayalam viral movie songs",
    "sushin shyam latest songs",
    "dabzee new malayalam tracks",
    "malayalam evergreen melody hits",
    "kerala indie music trending",
    "tovino thomas fahadh faasil hit songs",
  ],
  tamil: [
    "tamil viral hits 2024",
    "anirudh songs viral hits",
    "ar rahman tamil super hits",
    "tamil melody songs hits",
    "yuvan shankar raja super hits",
    "sid sriram tamil love songs",
    "kollywood latest trending songs",
  ],
  hindi: [
    "arijit singh best songs",
    "bollywood romantic hit songs",
    "hindi viral party hits",
    "pritam arijit romantic hits",
    "latest bollywood songs 2024",
    "90s bollywood melodies evergreen",
  ],
  english: [
    "top billboard hot 100 songs",
    "viral pop songs 2024",
    "the weeknd taylor swift hits",
    "top global hits english pop",
    "dua lipa imagine dragons hits",
  ],
  korean: [
    "kpop viral hits 2024",
    "bts official songs hits",
    "blackpink top hit songs",
    "korean drama best ost",
    "newjeans aespa stray kids kpop",
    "kpop top 50 songs",
  ],
  punjabi: [
    "punjabi viral hits 2024",
    "sidhu moose wala diljit dosanjh",
    "karan aujla latest songs",
    "ap dhillon punjabi hits",
    "top punjabi songs playlist",
  ],
  telugu: [
    "telugu super hits 2024",
    "ss thaman telugu hits",
    "devi sri prasad songs",
    "telugu romantic melody songs",
  ],
  arabic: [
    "arabic viral songs",
    "middle east trending music",
    "amr diab nancy ajram hits",
    "arabic pop hits",
  ],
  lofi: [
    "lofi hip hop radio beats to study",
    "chillhop beats coding focus",
    "ambient lofi chill songs",
    "japanese lofi beats to sleep",
  ],
  reels: [
    "instagram trending reels songs 2024",
    "viral reels audio songs shorts",
    "trending reels background music",
    "popular reels songs playlist",
    "tiktok viral music hits shorts",
  ],
  "malayalam reels": [
    "malayalam trending reels songs",
    "malayalam viral reel audio",
    "malayalam reels bgm songs",
    "sushin shyam viral reels audio",
  ],
  "tamil reels": [
    "tamil trending reels songs",
    "tamil viral reel audio hits",
    "anirudh viral reels songs",
  ],
  romantic: [
    "romantic love songs all time hits",
    "all time favorite romantic melodies",
    "heart touching love songs playlist",
  ],
  gym: [
    "gym workout motivation music high bass",
    "hard workout phonk songs",
    "gym pump up bass boosted music",
  ],
  nostalgia: [
    "90s evergreen melody hits all time",
    "2000s nostalgic songs playlist",
    "golden retro hits",
  ],
  "sushin shyam": [
    "sushin shyam latest hit songs",
    "sushin shyam bgm and movie hits",
    "sushin shyam songs aavesham manjummel boys",
  ],
  anirudh: [
    "anirudh ravichander latest hits",
    "anirudh viral songs master leo jailer",
    "anirudh party dance hits",
  ],
  "ar rahman": [
    "ar rahman greatest hits all time",
    "ar rahman 90s evergreen tamil hindi",
    "ar rahman soul melodies",
  ],
  "arijit singh": [
    "arijit singh all time best songs",
    "arijit singh romantic hits",
    "arijit singh soulful melodies",
  ],
  "sid sriram": [
    "sid sriram best love songs",
    "sid sriram tamil telugu hits",
    "sid sriram live acoustic hits",
  ],
  bts: [
    "bts top hit songs",
    "bts best songs playlist",
    "jungkook bts solo hits",
  ],
};

function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

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
      cache: "no-store",
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
  const rawCategory = (searchParams.get("category") || "trending").trim();
  const isReels = searchParams.get("reels") === "true";
  const category = (isReels && (rawCategory.toLowerCase() === "trending" || rawCategory.toLowerCase() === "all"))
    ? "reels"
    : rawCategory.toLowerCase();
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
  // Support both pre-defined catalog categories AND any custom user category/singer/place!
  const isKnownCatalog = category in CATEGORY_CATALOG;
  const isKnownQuery = category in CATEGORY_SEARCH_QUERIES;

  const queryList: string[] = isKnownQuery
    ? CATEGORY_SEARCH_QUERIES[category]
    : isReels
    ? [
        `${rawCategory} trending reels songs shorts`,
        `${rawCategory} viral reel audio hits`,
        `${rawCategory} instagram music shorts`,
        `${rawCategory} hit songs official audio`,
      ]
    : [
        `${rawCategory} hit songs official audio`,
        `${rawCategory} popular music songs`,
        `${rawCategory} viral playlist 2024`,
        `${rawCategory} songs best hits`,
      ];

  const categoryName = isKnownCatalog
    ? CATEGORY_CATALOG[category].name
    : rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1);

  const icon = isKnownCatalog ? CATEGORY_CATALOG[category].icon : "🎵";

  if (page === 1) {
    // Pick a randomized query from queryList so EVERY reload brings fresh, varied songs like YouTube/Spotify!
    const randomQueryIdx = Math.floor(Math.random() * queryList.length);
    const chosenQuery = queryList[randomQueryIdx];
    const dynamicHits = await searchYouTube(chosenQuery, 16);

    let tracksToReturn: MusicTrack[] = [];

    if (isKnownCatalog) {
      // Pick a shuffled sample of 3 curated songs + merge with dynamic hits
      const curatedShuffled = shuffleArray(CATEGORY_CATALOG[category].tracks).slice(0, 3);
      const seen = new Set(curatedShuffled.map((t) => t.id));
      tracksToReturn = [...curatedShuffled];

      for (const t of dynamicHits) {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          tracksToReturn.push(t);
        }
      }
      // Shuffle combined batch so order is fresh on every reload
      tracksToReturn = shuffleArray(tracksToReturn);
    } else {
      tracksToReturn = dynamicHits;
    }

    return NextResponse.json({
      success: true,
      category: rawCategory,
      categoryName,
      icon,
      page: 1,
      tracks: tracksToReturn,
      hasMore: true,
    });
  }

  // Page 2+: Query subsequent rotated queries so endless scroll never runs out
  const queryIndex = (page - 1) % queryList.length;
  const deeperQuery = `${queryList[queryIndex]} part ${page}`;
  const deeperHits = await searchYouTube(deeperQuery, 15);

  return NextResponse.json({
    success: true,
    category: rawCategory,
    categoryName,
    icon,
    page,
    tracks: deeperHits,
    hasMore: deeperHits.length >= 6,
  });
}
