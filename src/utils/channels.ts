import { createClient } from "@/lib/supabase/client";
import { Channel } from "@/types";

// In-memory cache mapping canonical dmKey (e.g. "dm:user-1:user-2") to Postgres UUID
const dmChannelCache = new Map<string, string>();

// In-flight resolution promises to collapse concurrent calls for the same dmKey
const inFlightResolutions = new Map<string, Promise<string>>();

let cachedOrgId: string | null = null;

/**
 * Returns the canonical, deterministic DM key for two user IDs.
 * Encodes each user ID using encodeURIComponent to guarantee:
 * 1. Delimiter safety: Colons (":") inside user IDs are encoded as "%3A",
 *    preventing key collisions between different user pairs.
 * 2. PostgREST safety: Commas and query operators are safely encoded,
 *    preventing filter syntax crashes in queries.
 * 3. Backward compatibility: Standard UUIDs and alphanumeric slugs
 *    contain no reserved characters and remain identical.
 */
export function getDmKey(userIdA: string, userIdB: string): string {
  const encA = encodeURIComponent(String(userIdA ?? ""));
  const encB = encodeURIComponent(String(userIdB ?? ""));
  const sorted = [encA, encB].sort();
  return `dm:${sorted[0]}:${sorted[1]}`;
}

/**
 * Resolves default organization ID from Supabase or fallback seed UUID
 */
async function getDefaultOrganizationId(): Promise<string> {
  if (cachedOrgId) return cachedOrgId;
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("organizations")
      .select("id")
      .limit(1)
      .maybeSingle();
    if (data?.id) {
      cachedOrgId = data.id;
      return data.id;
    }
  } catch {
    // Fall back to seed organization
  }
  return "11111111-1111-1111-1111-111111111111";
}

/**
 * Provisions or queries a 1-on-1 DM channel in public.channels, returning a valid Postgres UUID.
 *
 * Implements PROJECT.md Contract 6:
 * getOrCreateDmChannel(currentUserId, otherUserId, otherUserName, otherUserAvatar): Promise<string>
 */
export async function getOrCreateDmChannel(
  currentUserId: string,
  otherUserId: string,
  otherUserName: string,
  otherUserAvatar?: string
): Promise<string> {
  const dmKey = getDmKey(currentUserId, otherUserId);
  const encCurrent = encodeURIComponent(String(currentUserId ?? ""));
  const encOther = encodeURIComponent(String(otherUserId ?? ""));
  const legacyDmKey = `dm-${[encCurrent, encOther].sort().join("-")}`;

  // 1. Check in-memory cache for instant zero-latency return
  if (dmChannelCache.has(dmKey)) {
    return dmChannelCache.get(dmKey)!;
  }

  // 2. Check for an active in-flight resolution for this DM pair
  const activePromise = inFlightResolutions.get(dmKey);
  if (activePromise) {
    return await activePromise;
  }

  // 3. Register resolution promise
  const resolutionPromise = (async (): Promise<string> => {
    const supabase = createClient();

    try {
      const orgId = await getDefaultOrganizationId();

      // Query public.channels for existing DM record
      // Use .in() array filter to safely handle commas and special characters
      const { data: existing, error: queryError } = await supabase
        .from("channels")
        .select("id")
        .eq("is_dm", true)
        .eq("organization_id", orgId)
        .in("name", [dmKey, legacyDmKey])
        .limit(1)
        .maybeSingle();

      if (!queryError && existing?.id) {
        dmChannelCache.set(dmKey, existing.id);
        return existing.id;
      }

      // Provision new DM channel in public.channels
      const insertPayload = {
        organization_id: orgId,
        name: dmKey,
        topic: `Direct 1-on-1 message with ${otherUserName}`,
        is_private: true,
        is_dm: true,
        recipient_id: otherUserId,
        recipient_name: otherUserName,
        recipient_avatar: otherUserAvatar || null,
      };

      const { data: created, error: insertError } = await supabase
        .from("channels")
        .insert(insertPayload)
        .select("id")
        .single();

      if (created?.id) {
        dmChannelCache.set(dmKey, created.id);
        return created.id;
      }

      // 4. Handle concurrent insertion race condition or unique constraint error (e.g. 23505)
      if (insertError) {
        const { data: retry } = await supabase
          .from("channels")
          .select("id")
          .eq("is_dm", true)
          .eq("organization_id", orgId)
          .in("name", [dmKey, legacyDmKey])
          .limit(1)
          .maybeSingle();

        if (retry?.id) {
          dmChannelCache.set(dmKey, retry.id);
          return retry.id;
        }
        console.warn("Failed to insert DM channel record:", insertError);
      }
    } catch (err) {
      console.warn("getOrCreateDmChannel network exception:", err);
    }

    // 5. Offline Fallback: Generate valid UUID v4 to avoid SQL syntax crash
    // NOTE: Do NOT store in dmChannelCache to prevent caching unpersisted IDs that cause FK violations
    const fallbackUuid =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : "11111111-2222-3333-4444-" + Date.now().toString(16).padStart(12, "0");

    return fallbackUuid;
  })();

  inFlightResolutions.set(dmKey, resolutionPromise);

  try {
    return await resolutionPromise;
  } finally {
    inFlightResolutions.delete(dmKey);
  }
}

/**
 * Checks whether a given channel is a 1-on-1 Direct Message
 */
export function isDmChannel(channel: Channel): boolean {
  return Boolean(channel.isDm || channel.name?.startsWith("dm:"));
}

/**
 * Clears in-memory DM cache (e.g. on user profile switch or test resets)
 */
export function clearDmChannelCache(): void {
  dmChannelCache.clear();
  inFlightResolutions.clear();
  cachedOrgId = null;
}
