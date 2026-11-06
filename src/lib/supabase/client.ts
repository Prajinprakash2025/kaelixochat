import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://untypucxdpgxnfezzwuo.supabase.co";

// Standard JWT anon key required by Supabase Realtime WebSocket server.
// Note: sb_publishable_ keys cause Realtime WebSockets to fail with 401 UNAUTHORIZED_INVALID_API_KEY.
export const SUPABASE_JWT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVudHlwdWN4ZHBneG5mZXp6d3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM4NTA2MjQsImV4cCI6MjEwOTQyNjYyNH0.jvU8BPgGH9oFTAwX0xB1mTwHRZu3kv1Z-3cSwUDKVHk";

const envKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// If envKey is a valid JWT (starts with eyJ), use it; otherwise fallback to the verified JWT anon key.
const supabaseKey =
  envKey && envKey.startsWith("eyJ") ? envKey : SUPABASE_JWT_ANON_KEY;

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (typeof window === "undefined") {
    return createBrowserClient(supabaseUrl, supabaseKey);
  }
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseKey, {
      realtime: {
        params: {
          eventsPerSecond: 20,
        },
      },
    });
  }
  return browserClient;
}
