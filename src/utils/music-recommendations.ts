import { MusicTrack } from "@/types";

export type MusicLanguage =
  | "malayalam"
  | "tamil"
  | "hindi"
  | "telugu"
  | "punjabi"
  | "kpop"
  | "english"
  | "general";

export interface SmartRecommendationResult {
  query: string;
  fallbackCategory: string;
  language: MusicLanguage;
  descriptor: string;
}

// Clean title by removing noise like (Official Video), [4K], (Full Movie), etc.
export function cleanRawTitle(title: string): string {
  if (!title) return "";
  return title
    .replace(/[\(\[\{].*?[\)\]\}]/g, "") // remove bracketed content like (Official Video), [4K], etc.
    .replace(
      /(?:official\s*(?:video|audio|music\s*video|lyric\s*video|hd|4k|song)|full\s*(?:video|movie|song)|video\s*song|audio\s*song|lyrical\s*video|video\s*hd|4k\s*ultra\s*hd|hd\s*video)/gi,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

// Clean artist name by removing YouTube topic tags
export function cleanRawArtist(artist: string): string {
  if (!artist) return "";
  return artist
    .replace(/ - Topic$/i, "")
    .replace(/VEVO$/i, "")
    .replace(/Official$/i, "")
    .trim();
}

// Extract core segments from a YouTube title (e.g. "Song | Movie | Singer")
export function extractTrackSegments(track: MusicTrack): string[] {
  const rawTitle = track.title || "";
  const parts = rawTitle
    .split(/[\-\|\—\•\:\/]/)
    .map((p) => cleanRawTitle(p))
    .filter((p) => p.length > 1);

  if (parts.length === 0 && rawTitle) {
    const cleaned = cleanRawTitle(rawTitle);
    if (cleaned) parts.push(cleaned);
  }
  return parts;
}

// Malayalam cultural, movie, singer, and lyricist keyword dictionary
const MALAYALAM_KEYWORDS: string[] = [
  "malayalam",
  "kerala",
  "mallu",
  "mollywood",
  "thattathin",
  "marayathu",
  "muthuchippi",
  "namosthuthe",
  "shyamambaram",
  "aavesham",
  "illuminati",
  "armadham",
  "jaada",
  "galatta",
  "manjummel",
  "kuthanthram",
  "thaai manam",
  "premam",
  "malare",
  "aluva puzha",
  "pathivayi",
  "hridayam",
  "darshana",
  "nagumo",
  "onakka munthiri",
  "arike ninna",
  "minnal murali",
  "vazhiye",
  "thee minnal",
  "thallumaala",
  "ole melody",
  "tupathu",
  "bheeshma parvam",
  "parudeesa",
  "aakasham pole",
  "rdx",
  "neela nilave",
  "halaballoo",
  "varshangalkku shesham",
  "madhu pakarnnu",
  "nyabagam",
  "kishkindha",
  "appoopan thadi",
  "bougainvillea",
  "maravikale",
  "turbo",
  "burn my head",
  "vaazha",
  "oru katha parayam",
  "kannur squad",
  "mridhu bhave",
  "falimy",
  "manjeera",
  "neru",
  "premalu",
  "welcome to hyderabad",
  "mini maharani",
  "kutty kudiye",
  "aadujeevitham",
  "goat life",
  "periyone",
  "omane",
  "kumbalangi",
  "cherathukal",
  "uyiril thodum",
  "romancham",
  "aathmave poova",
  "manavaalan thug",
  "chatha mazha",
  "lucifer",
  "l2 empuraan",
  "kadavule",
  "om shanti oshana",
  "kaattu mooliyo",
  "bangalore days",
  "aethu kari raavilum",
  "charlie",
  "akale",
  "pularikalo",
  "ustad hotel",
  "appangal embadum",
  "ennu ninte moideen",
  "mukkathe penne",
  "sharadambaram",
  "joseph",
  "poomuthole",
  "vellam",
  "pulari viriyum",
  "joji",
  "kuruthi",
  "bramayugam",
  "chithram",
  "kilukkam",
  "spadikam",
  "devasuram",
  "kireedam",
  "manichitrathazhu",
  "sushin shyam",
  "sushin",
  "vineeth sreenivasan",
  "vineeth",
  "dabzee",
  "vedan",
  "shaan rahman",
  "hesham abdul wahab",
  "hesham",
  "vishnu vijay",
  "jassie gift",
  "pranavam sasi",
  "k s chithra",
  "ks chithra",
  "chithra",
  "k j yesudas",
  "kj yesudas",
  "yesudas",
  "m g sreekumar",
  "mg sreekumar",
  "sujatha",
  "vidyasagar",
  "gopi sundar",
  "bijibal",
  "deepak dev",
  "job kurian",
  "sooraj santhosh",
  "vijay yesudas",
  "sithara krishnakumar",
  "sithara",
  "fejo",
  "baby jean",
  "hanumankind",
  "kaithapram",
  "gireesh puthenchery",
  "shreya ghoshal",
  "haricharan",
  "mohanlal",
  "mammootty",
  "nivin pauly",
  "nivin",
  "dulquer salmaan",
  "dulquer",
  "dq",
  "fahadh faasil",
  "fahadh",
  "tovino thomas",
  "tovino",
  "prithviraj",
  "asif ali",
  "dhyan sreenivasan",
  "dhyan",
  "basil joseph",
  "unni mukundan",
  "naslen",
  "mamitha",
  "soubin",
  "sreenath bhasi",
  "think music india",
  "muzik247",
  "saina music",
  "saina",
  "manorama music",
  "satyam videos",
  "speed audio",
  "goodwill",
];

const TAMIL_KEYWORDS: string[] = [
  "tamil",
  "kollywood",
  "anirudh",
  "anirudh ravichander",
  "ar rahman",
  "a r rahman",
  "a.r. rahman",
  "yuvan",
  "yuvan shankar",
  "harris jayaraj",
  "ilaiyaraaja",
  "ilayaraja",
  "santhosh narayanan",
  "d imman",
  "gv prakash",
  "sid sriram",
  "jailer",
  "hukum",
  "kaavaalaa",
  "leo",
  "badass",
  "naa ready",
  "katchi sera",
  "vikram",
  "master",
  "vaathi",
  "goat",
  "amaran",
  "devara",
  "raayan",
  "viduthalai",
  "ponniyin selvan",
  "chola chola",
  "aga naga",
  "thiruchitrambalam",
  "megham karukatha",
  "rowdy baby",
  "sun pictures",
  "sony music south",
];

const HINDI_KEYWORDS: string[] = [
  "hindi",
  "bollywood",
  "arijit singh",
  "arijit",
  "pritam",
  "neha kakkar",
  "shreya ghoshal",
  "badshah",
  "atif aslam",
  "jubin nautiyal",
  "jubin",
  "darshan raval",
  "vishal mishra",
  "stree",
  "animal",
  "jawan",
  "pathaan",
  "brahmastra",
  "kesariya",
  "kabir singh",
  "tum hi ho",
  "channa mereya",
  "kalank",
  "t-series",
  "zeemusiccompany",
  "yrf",
];

const TELUGU_KEYWORDS: string[] = [
  "telugu",
  "tollywood",
  "devi sri prasad",
  "dsp",
  "thaman",
  "rrr",
  "pushpa",
  "oo antava",
  "salaar",
  "kalki",
  "guntur kaaram",
  "aditya music",
];

const PUNJABI_KEYWORDS: string[] = [
  "punjabi",
  "diljit dosanjh",
  "diljit",
  "karan aujla",
  "sidhu moose wala",
  "sidhu",
  "ap dhillon",
  "shubh",
  "ammy virk",
];

const KPOP_KEYWORDS: string[] = [
  "kpop",
  "k-pop",
  "bts",
  "blackpink",
  "jungkook",
  "jimin",
  "stray kids",
  "newjeans",
  "twice",
  "aespa",
];

/**
 * Detect language of track based on Unicode script and vocabulary
 */
export function detectMusicLanguage(track: MusicTrack): MusicLanguage {
  const fullText = `${track.title} ${track.artist}`.toLowerCase();

  // 1. Unicode script detection
  if (/[\u0D00-\u0D7F]/.test(fullText)) return "malayalam";
  if (/[\u0B80-\u0BFF]/.test(fullText)) return "tamil";
  if (/[\u0900-\u097F]/.test(fullText)) return "hindi";
  if (/[\u0C00-\u0C7F]/.test(fullText)) return "telugu";
  if (/[\u0A00-\u0A7F]/.test(fullText)) return "punjabi";
  if (/[\uAC00-\uD7AF]/.test(fullText)) return "kpop";

  // 2. Keyword detection
  if (MALAYALAM_KEYWORDS.some((kw) => fullText.includes(kw))) return "malayalam";
  if (TAMIL_KEYWORDS.some((kw) => fullText.includes(kw))) return "tamil";
  if (HINDI_KEYWORDS.some((kw) => fullText.includes(kw))) return "hindi";
  if (TELUGU_KEYWORDS.some((kw) => fullText.includes(kw))) return "telugu";
  if (PUNJABI_KEYWORDS.some((kw) => fullText.includes(kw))) return "punjabi";
  if (KPOP_KEYWORDS.some((kw) => fullText.includes(kw))) return "kpop";

  return "general";
}

/**
 * Generates high-accuracy YouTube Up Next related search query
 * so that when a song finishes, related tracks in the same language and vibe automatically play!
 */
export function getSmartRelatedRecommendation(track: MusicTrack): SmartRecommendationResult {
  const lang = detectMusicLanguage(track);
  const segments = extractTrackSegments(track);
  const cleanTitle = cleanRawTitle(segments[0] || track.title || "");
  const cleanArtist = cleanRawArtist(track.artist || "");

  // Secondary segment is often the movie or singer (e.g. "Muthuchippi | Thattathin Marayathu | ...")
  const secondarySegment = segments.length > 1 ? segments[1] : "";

  switch (lang) {
    case "malayalam": {
      // Check if a prominent movie or artist name exists in the segments
      const prominentKw = MALAYALAM_KEYWORDS.find(
        (kw) => `${track.title} ${track.artist}`.toLowerCase().includes(kw) && kw.length > 4
      );

      let query = "";
      if (secondarySegment && secondarySegment.length > 2) {
        query = `${secondarySegment} Malayalam hit songs`;
      } else if (prominentKw && !cleanTitle.toLowerCase().includes(prominentKw)) {
        query = `${prominentKw} Malayalam hit songs`;
      } else if (cleanTitle) {
        query = `${cleanTitle} Malayalam songs`;
      } else {
        query = `Malayalam viral hit songs`;
      }

      return {
        query,
        fallbackCategory: "malayalam",
        language: "malayalam",
        descriptor: "Malayalam Hits & Up Next",
      };
    }

    case "tamil": {
      const query = secondarySegment && secondarySegment.length > 2
        ? `${secondarySegment} Tamil hit songs`
        : cleanTitle
        ? `${cleanTitle} Tamil hit songs`
        : `Tamil viral hits`;
      return {
        query,
        fallbackCategory: "tamil",
        language: "tamil",
        descriptor: "Tamil Hits & Up Next",
      };
    }

    case "hindi": {
      const query = secondarySegment && secondarySegment.length > 2
        ? `${secondarySegment} Hindi Bollywood songs`
        : cleanTitle
        ? `${cleanTitle} Bollywood hits`
        : `Bollywood hit songs`;
      return {
        query,
        fallbackCategory: "hindi",
        language: "hindi",
        descriptor: "Bollywood Hits & Up Next",
      };
    }

    case "telugu": {
      const query = cleanTitle ? `${cleanTitle} Telugu hit songs` : `Telugu hit songs`;
      return {
        query,
        fallbackCategory: "trending",
        language: "telugu",
        descriptor: "Telugu Hits & Up Next",
      };
    }

    case "punjabi": {
      const query = cleanTitle ? `${cleanTitle} Punjabi hits` : `Punjabi hit songs`;
      return {
        query,
        fallbackCategory: "punjabi",
        language: "punjabi",
        descriptor: "Punjabi Hits & Up Next",
      };
    }

    case "kpop": {
      const query = cleanTitle ? `${cleanTitle} K-Pop hits` : `K-Pop hits`;
      return {
        query,
        fallbackCategory: "kpop",
        language: "kpop",
        descriptor: "K-Pop Hits & Up Next",
      };
    }

    default: {
      const query =
        cleanArtist && cleanTitle
          ? `${cleanArtist} ${cleanTitle} hit songs`
          : cleanArtist
          ? `${cleanArtist} official songs`
          : cleanTitle
          ? `${cleanTitle} songs`
          : `trending hit songs`;
      return {
        query,
        fallbackCategory: "trending",
        language: "general",
        descriptor: "Related Songs & Up Next",
      };
    }
  }
}
