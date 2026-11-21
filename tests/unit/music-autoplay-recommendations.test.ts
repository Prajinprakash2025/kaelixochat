import {
  detectMusicLanguage,
  getSmartRelatedRecommendation,
  cleanRawTitle,
  cleanRawArtist,
  extractTrackSegments,
  isMusicSongTrack,
  isLongMixTrack,
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

  // Test 9: isMusicSongTrack - Non-Song and Review Protection (User Issue)
  // 9a. User's exact screenshot case: Operation Mole Movie Malayalam Review by REELOAD MEDIA
  const reviewResult = isMusicSongTrack("O.M: Operation Mole Movie Malayalam Review", "REELOAD MEDIA", 13);
  if (reviewResult !== false) {
    throw new Error("Failed to block Operation Mole Movie Review!");
  }
  console.log("✓ Test 9a: Correctly blocks movie reviews and review channels (REELOAD MEDIA)");

  // 9b. Full movies
  const fullMovieResult = isMusicSongTrack("Thattathin Marayathu Full Movie HD", "Harmony Cinemas", 8100);
  if (fullMovieResult !== false) {
    throw new Error("Failed to block Full Movie!");
  }
  console.log("✓ Test 9b: Correctly blocks full feature movies");

  // 9c. Trailers & Teasers
  const trailerResult = isMusicSongTrack("Aavesham Official Trailer", "Think Music India", 140);
  if (trailerResult !== false) {
    throw new Error("Failed to block movie trailer!");
  }
  console.log("✓ Test 9c: Correctly blocks movie trailers without musical score");

  // 9d. Interviews & Press Meets
  const interviewResult = isMusicSongTrack("Fahadh Faasil Exclusive Interview with Behindwoods", "Behindwoods", 1200);
  if (interviewResult !== false) {
    throw new Error("Failed to block interview video!");
  }
  console.log("✓ Test 9d: Correctly blocks interviews and press meets");

  // 9e. Comedy / Climax scenes
  const sceneResult = isMusicSongTrack("Mohanlal Comedy Scene from Chithram", "Satyam Videos", 300);
  if (sceneResult !== false) {
    throw new Error("Failed to block comedy scene clip!");
  }
  console.log("✓ Test 9e: Correctly blocks movie scene clips");

  // 9f. Valid music tracks must be allowed!
  const validSong1 = isMusicSongTrack("Muthuchippi Poloru Video Song | Thattathin Marayathu", "Sony Music South", 210);
  const validSong2 = isMusicSongTrack("Kuthanthram - Video Song | Manjummel Boys", "Think Music India", 266);
  const validSong3 = isMusicSongTrack("Illuminati | Aavesham | Fahadh Faasil | Sushin Shyam", "Think Music India", 149);
  const validSong4 = isMusicSongTrack("Leo Trailer Theme Music BGM", "Anirudh Ravichander", 120);
  if (!validSong1 || !validSong2 || !validSong3 || !validSong4) {
    throw new Error("Legitimate songs were incorrectly blocked!");
  }
  console.log("✓ Test 9f: Correctly allows all legitimate songs and theme tracks");

  // 9g. User Issue: 2-Hour long compilation playlists and non-stop mixes must NOT appear in normal feeds!
  const twoHourPlaylist1 = isMusicSongTrack("Top Hits 2026 Playlist ~ Trending Music 2026 🎵", "Dynamic Deep House", 9177, false);
  const twoHourPlaylist2 = isMusicSongTrack("Spotify VIRAL Music 2026 - Top Spotify Songs Mix 🎧", "Dynamic Deep House", 9362, false);
  const thirtyMinCompilation = isMusicSongTrack("TRENDING SONGS 2026", "Elsie Music", 1938, false);
  if (twoHourPlaylist1 !== false || twoHourPlaylist2 !== false || thirtyMinCompilation !== false) {
    throw new Error("Failed to block 2-hour long compilation playlists from regular songs feed!");
  }
  console.log("✓ Test 9g: Correctly blocks 2-hour compilations and long playlist videos from normal songs feed");

  // Test 10: Dedicated Long Mix View allows long mixes while still rejecting non-music
  const allowedInLongMixView1 = isMusicSongTrack("Top Hits 2026 Playlist ~ Trending Music 2026 🎵", "Dynamic Deep House", 9177, true);
  const allowedInLongMixView2 = isMusicSongTrack("Malayalam Evergreen Non-Stop 2 Hours Jukebox", "KJ Yesudas", 7200, true);
  const reviewBlockedInLongMix = isMusicSongTrack("Operation Mole Movie Review", "REELOAD MEDIA", 7200, true);
  if (!allowedInLongMixView1 || !allowedInLongMixView2 || reviewBlockedInLongMix !== false) {
    throw new Error("Failed in dedicated Long Mix view validation!");
  }
  console.log("✓ Test 10: Dedicated Long Mix mode allows genuine 1-3 hr mixes while maintaining non-music rejection");

  console.log("\nAll 10 YouTube Autoplay, Recommendation, Non-Music & 2-Hour Filter tests PASSED successfully!\n");
}

runTests();
