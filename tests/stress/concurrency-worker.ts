import { getOrCreateDmChannel } from "../../src/utils/channels";

// Load environment variables for Supabase
if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // env file optional
  }
}

async function main() {
  const [,, userA, userB, userName] = process.argv;
  if (!userA || !userB) {
    console.error("Missing arguments: userA userB");
    process.exit(1);
  }

  try {
    const channelId = await getOrCreateDmChannel(userA, userB, userName || "Concurrent Worker");
    // Output single line with channelId
    console.log(`RESOLVED_UUID:${channelId}`);
    process.exit(0);
  } catch (err: any) {
    console.error(`ERROR:${err.message}`);
    process.exit(1);
  }
}

main();
