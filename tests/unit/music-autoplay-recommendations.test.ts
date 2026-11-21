import {
  detectMusicLanguage,
  getSmartRelatedRecommendation,
  cleanRawTitle,
  cleanRawArtist,
  extractTrackSegments,
} from "../../src/utils/music-recommendations";
import { MusicTrack } from "../../src/types";

function runTests() {
  console.log("Running YouTube Autoplay & Music Recommendation Unit Tests...\n");

  // Test 1: User's exact case - Thattathin Marayathu
  const thattathinTrack: MusicTrack = {
    id: "vid_thattathin_1",
    title: "Muthuchippi Poloru Video Song | Thattathin Marayathu | Nivin Pauly, Isha Talwar | Shaan Rahman",
    artist: "Sony Music South",
    thumbnail: "https://i.ytimg.com/vi/vid_thattathin_1/hqdefault.jpg",
  };
  const lang1 = detectMusicLanguage(thattathinTrack);
  if (lang1 !== "malayalam") {
    throw new Error(`Expected 'malayalam' for Thattathin Marayathu, got '${lang1}'`);
  }
  const rec1 = getSmartRelatedRecommendation(thattathinTrack);
  if (rec1.language !== "malayalam" || rec1.fallbackCategory !== "malayalam") {
    throw new Error(`Invalid recommendation for Thattathin: ${JSON.stringify(rec1)}`);
  }
  if (!rec1.query.toLowerCase().includes("thattathin") || !rec1.query.toLowerCase().includes("malayalam")) {
    throw new Error(`Expected query to include 'Thattathin' and 'Malayalam', got '${rec1.query}'`);
  }
  console.log("✓ Test 1: Correctly identifies Malayalam and generates related query for Thattathin Marayathu:", rec1.query);

  // Test 2: Manjummel Boys - Kuthanthram (from user screenshot 3)
  const kuthanthramTrack: MusicTrack = {
    id: "vid_kuthanthram",
    title: "Kuthanthram - Video Song | Manjummel Boys | Chidambaram | Sushin Shyam | Vedan | Parava Films",
    artist: "Think Music India",
    thumbnail: "https://i.ytimg.com/vi/vid_kuthanthram/hqdefault.jpg",
  };
  const lang2 = detectMusicLanguage(kuthanthramTrack);
  if (lang2 !== "malayalam") {
    throw new Error(`Expected 'malayalam' for Kuthanthram, got '${lang2}'`);
  }
  const rec2 = getSmartRelatedRecommendation(kuthanthramTrack);
  if (rec2.language !== "malayalam" || !rec2.query.toLowerCase().includes("manjummel")) {
    throw new Error(`Invalid recommendation for Kuthanthram: ${JSON.stringify(rec2)}`);
  }
  console.log("✓ Test 2: Correctly identifies Malayalam and generates query for Kuthanthram / Manjummel Boys:", rec2.query);

  // Test 3: Illuminati / Aavesham
  const aaveshamTrack: MusicTrack = {
    id: "vid_illuminati",
    title: "Illuminati | Aavesham | Fahadh Faasil | Jithu Madhavan | Sushin Shyam",
    artist: "Think Music India",
    thumbnail: "https://i.ytimg.com/vi/vid_illuminati/hqdefault.jpg",
  };
  const lang3 = detectMusicLanguage(aaveshamTrack);
  if (lang3 !== "malayalam") {
    throw new Error(`Expected 'malayalam' for Illuminati, got '${lang3}'`);
  }
  const rec3 = getSmartRelatedRecommendation(aaveshamTrack);
  if (rec3.language !== "malayalam" || !rec3.query.toLowerCase().includes("aavesham")) {
    throw new Error(`Invalid recommendation for Aavesham: ${JSON.stringify(rec3)}`);
  }
  console.log("✓ Test 3: Correctly identifies Malayalam and generates query for Aavesham / Illuminati:", rec3.query);

  // Test 4: Malayalam Unicode script in title
  const malayalamScriptTrack: MusicTrack = {
    id: "vid_script",
    title: "മലയാളം പാട്ടുകൾ - Top Melody Hits",
    artist: "Malayalam Music",
    thumbnail: "https://i.ytimg.com/vi/vid_script/hqdefault.jpg",
  };
  const lang4 = detectMusicLanguage(malayalamScriptTrack);
  if (lang4 !== "malayalam") {
    throw new Error(`Expected 'malayalam' for Unicode script, got '${lang4}'`);
  }
  console.log("✓ Test 4: Correctly identifies Malayalam script Unicode characters");

  // Test 5: Tamil - Jailer / Hukum / Anirudh
  const jailerTrack: MusicTrack = {
    id: "vid_jailer",
    title: "Hukum - Thalaivar Alappara | Jailer | Rajinikanth | Sun Pictures | Anirudh Ravichander",
    artist: "Sun TV",
    thumbnail: "https://i.ytimg.com/vi/vid_jailer/hqdefault.jpg",
  };
  const lang5 = detectMusicLanguage(jailerTrack);
  if (lang5 !== "tamil") {
    throw new Error(`Expected 'tamil' for Jailer, got '${lang5}'`);
  }
  const rec5 = getSmartRelatedRecommendation(jailerTrack);
  if (rec5.language !== "tamil" || rec5.fallbackCategory !== "tamil") {
    throw new Error(`Invalid recommendation for Tamil: ${JSON.stringify(rec5)}`);
  }
  console.log("✓ Test 5: Correctly identifies Tamil and generates query:", rec5.query);

  // Test 6: Hindi - Kesariya / Brahmastra / Arijit Singh
  const hindiTrack: MusicTrack = {
    id: "vid_kesariya",
    title: "Kesariya - Brahmāstra | Ranbir Kapoor | Alia Bhatt | Pritam | Arijit Singh",
    artist: "Sony Music India",
    thumbnail: "https://i.ytimg.com/vi/vid_kesariya/hqdefault.jpg",
  };
  const lang6 = detectMusicLanguage(hindiTrack);
  if (lang6 !== "hindi") {
    throw new Error(`Expected 'hindi' for Kesariya, got '${lang6}'`);
  }
  const rec6 = getSmartRelatedRecommendation(hindiTrack);
  if (rec6.language !== "hindi" || rec6.fallbackCategory !== "hindi") {
    throw new Error(`Invalid recommendation for Hindi: ${JSON.stringify(rec6)}`);
  }
  console.log("✓ Test 6: Correctly identifies Hindi and generates query:", rec6.query);

  // Test 7: General / English track fallback
  const englishTrack: MusicTrack = {
    id: "vid_weeknd",
    title: "Blinding Lights (Official Audio)",
    artist: "The Weeknd - Topic",
    thumbnail: "https://i.ytimg.com/vi/vid_weeknd/hqdefault.jpg",
  };
  const lang7 = detectMusicLanguage(englishTrack);
  if (lang7 !== "general") {
    throw new Error(`Expected 'general' for The Weeknd, got '${lang7}'`);
  }
  const rec7 = getSmartRelatedRecommendation(englishTrack);
  if (rec7.language !== "general" || rec7.fallbackCategory !== "trending") {
    throw new Error(`Invalid recommendation for English track: ${JSON.stringify(rec7)}`);
  }
  console.log("✓ Test 7: Correctly falls back to artist related hits for general tracks:", rec7.query);

  // Test 8: Title Cleaning Utilities
  const noisyTitle = "Muthuchippi Poloru Video Song [Official 4K UHD] (Full Song) - Thattathin Marayathu";
  const cleaned = cleanRawTitle(noisyTitle);
  if (cleaned.includes("[Official 4K UHD]") || cleaned.includes("(Full Song)") || cleaned.includes("Video Song")) {
    throw new Error(`Clean title failed to strip noise: '${cleaned}'`);
  }
  console.log("✓ Test 8: cleanRawTitle correctly strips noise words: ", cleaned);

  console.log("\nAll 8 YouTube Autoplay & Music Recommendation tests PASSED successfully!\n");
}

runTests();
