import { extractYouTubeVideos } from "../../src/components/chat/youtube-embed-card";

function runTests() {
  console.log("Running YouTube Embed Extraction Unit Tests...");

  // 1. YouTube Shorts with query parameters
  const shortsText = "Check this short out: youtube.com/shorts/09NzKX_npRg?si=Aada1iUGuyQaEk-r amazing!";
  const shortsResult = extractYouTubeVideos(shortsText);
  if (shortsResult.length !== 1 || shortsResult[0].videoId !== "09NzKX_npRg" || !shortsResult[0].isShort) {
    throw new Error(`Failed on shorts: ${JSON.stringify(shortsResult)}`);
  }
  console.log("✓ Correctly extracts YouTube Shorts ID and sets isShort=true");

  // 2. Standard YouTube watch URL
  const watchText = "Here is the tutorial: https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s enjoy";
  const watchResult = extractYouTubeVideos(watchText);
  if (watchResult.length !== 1 || watchResult[0].videoId !== "dQw4w9WgXcQ" || watchResult[0].isShort) {
    throw new Error(`Failed on watch: ${JSON.stringify(watchResult)}`);
  }
  console.log("✓ Correctly extracts standard watch URL and sets isShort=false");

  // 3. Shortened youtu.be URL
  const shortUrlText = "Quick link: https://youtu.be/dQw4w9WgXcQ";
  const shortUrlResult = extractYouTubeVideos(shortUrlText);
  if (shortUrlResult.length !== 1 || shortUrlResult[0].videoId !== "dQw4w9WgXcQ") {
    throw new Error(`Failed on youtu.be: ${JSON.stringify(shortUrlResult)}`);
  }
  console.log("✓ Correctly extracts youtu.be shortened URL");

  // 4. Deduplication
  const duplicateText = "Look: https://youtu.be/09NzKX_npRg and youtube.com/shorts/09NzKX_npRg";
  const dupResult = extractYouTubeVideos(duplicateText);
  if (dupResult.length !== 1) {
    throw new Error(`Failed to deduplicate: ${JSON.stringify(dupResult)}`);
  }
  console.log("✓ Successfully deduplicates identical video IDs in same message");

  // 5. Multiple distinct videos with 3 limit
  const multiText = "1: https://youtu.be/vid11111111 2: https://youtu.be/vid22222222 3: https://youtu.be/vid33333333 4: https://youtu.be/vid44444444";
  const multiResult = extractYouTubeVideos(multiText);
  if (multiResult.length !== 3) {
    throw new Error(`Expected 3 max videos, got ${multiResult.length}`);
  }
  console.log("✓ Correctly limits max embeds to 3 per message");

  // 6. Non-YouTube URLs ignored
  const nonYtText = "Visit https://google.com or https://github.com/kaelixo for details";
  const nonYtResult = extractYouTubeVideos(nonYtText);
  if (nonYtResult.length !== 0) {
    throw new Error(`Expected 0 videos, got ${nonYtResult.length}`);
  }
  console.log("✓ Properly ignores non-YouTube URLs");

  console.log("All YouTube Embed unit tests passed successfully!");
}

runTests();
