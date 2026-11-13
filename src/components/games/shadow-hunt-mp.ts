/**
 * Shadow Hunt Multiplayer - Realtime & Authoritative RPC Engine
 * Manages Supabase Realtime Broadcast (low-latency pose sync), Presence (online tracking),
 * and Postgres RPC state transitions (rooms, authoritative tags, roles, countdown).
 */

import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export type RoomStatus = "lobby" | "playing" | "finished";
export type PlayerRole = "hider" | "seeker";

export interface ShadowHuntRoom {
  id: string;
  code: string;
  host_id: string;
  status: RoomStatus;
  round_number: number;
  seeker_id: string | null;
  head_start_seconds: number;
  round_seconds: number;
  started_at: string | null;
  hunt_starts_at: string | null;
  ends_at: string | null;
  winner: "seeker" | "hiders" | null;
  alive_hiders: number;
}

export interface ShadowHuntPlayer {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  role: PlayerRole;
  is_alive: boolean;
  eliminated_at: string | null;
  joined_at: string;
  last_seen_at: string;
}

export interface ShadowHuntState {
  room: ShadowHuntRoom;
  players: ShadowHuntPlayer[];
  server_time: string;
}

export interface PlayerPosePayload {
  userId: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch?: number;
  velocity: number;
  gait: number;
  propId?: string | null;
  propYaw?: number;
  frozen?: boolean;
  paint?: string;
  timestamp: number;
}

export interface ShadowHuntCallbacks {
  onStateUpdate?: (state: ShadowHuntState) => void;
  onPoseUpdate?: (pose: PlayerPosePayload) => void;
  onPlayerTagged?: (payload: { target_user_id: string; remaining_hiders: number; state: ShadowHuntState }) => void;
  onRoundStarted?: (state: ShadowHuntState) => void;
  onRoundFinished?: (payload: { winner: "seeker" | "hiders"; state: ShadowHuntState }) => void;
  onPresenceSync?: (activeUserIds: string[]) => void;
  onError?: (err: Error) => void;
}

// -----------------------------------------------------------------------------
// Authoritative RPC Calls
// -----------------------------------------------------------------------------

export async function createShadowHuntRoom(
  supabase: SupabaseClient,
  displayName?: string,
  avatarUrl?: string
): Promise<ShadowHuntState> {
  const { data, error } = await supabase.rpc("create_shadow_hunt_room", {
    p_display_name: displayName || null,
    p_avatar_url: avatarUrl || null,
  });

  if (error) throw new Error(error.message || "Failed to create Shadow Hunt room");
  return data as ShadowHuntState;
}

export async function joinShadowHuntRoom(
  supabase: SupabaseClient,
  code: string,
  displayName?: string,
  avatarUrl?: string
): Promise<ShadowHuntState> {
  const cleanCode = code.trim().toUpperCase();
  const { data, error } = await supabase.rpc("join_shadow_hunt_room", {
    p_code: cleanCode,
    p_display_name: displayName || null,
    p_avatar_url: avatarUrl || null,
  });

  if (error) throw new Error(error.message || "Failed to join room");
  return data as ShadowHuntState;
}

export async function startShadowHuntRound(
  supabase: SupabaseClient,
  roomId: string
): Promise<ShadowHuntState> {
  const { data, error } = await supabase.rpc("start_shadow_hunt_round", {
    p_room_id: roomId,
  });

  if (error) throw new Error(error.message || "Failed to start round");
  return data as ShadowHuntState;
}

export async function submitShadowHuntTag(
  supabase: SupabaseClient,
  roomId: string,
  targetUserId: string,
  distance?: number
): Promise<ShadowHuntState> {
  const { data, error } = await supabase.rpc("submit_shadow_hunt_tag", {
    p_room_id: roomId,
    p_target_user_id: targetUserId,
    p_distance: typeof distance === "number" ? distance : null,
  });

  if (error) throw new Error(error.message || "Tag attempt rejected");
  return data as ShadowHuntState;
}

export async function resolveShadowHuntTimeout(
  supabase: SupabaseClient,
  roomId: string
): Promise<ShadowHuntState> {
  const { data, error } = await supabase.rpc("resolve_shadow_hunt_timeout", {
    p_room_id: roomId,
  });

  if (error) throw new Error(error.message || "Failed to resolve round timeout");
  return data as ShadowHuntState;
}

export async function leaveShadowHuntRoom(
  supabase: SupabaseClient,
  roomId: string
): Promise<void> {
  const { error } = await supabase.rpc("leave_shadow_hunt_room", {
    p_room_id: roomId,
  });

  if (error) {
    console.warn("Failed to cleanly leave shadow hunt room:", error);
  }
}

export async function getShadowHuntState(
  supabase: SupabaseClient,
  roomId: string
): Promise<ShadowHuntState> {
  const { data, error } = await supabase.rpc("get_shadow_hunt_state", {
    p_room_id: roomId,
  });

  if (error) throw new Error(error.message || "Failed to fetch room state");
  return data as ShadowHuntState;
}

// -----------------------------------------------------------------------------
// Realtime Channel Manager
// -----------------------------------------------------------------------------

export class ShadowHuntChannelManager {
  private channel: RealtimeChannel | null = null;
  private supabase: SupabaseClient;
  private roomId: string;
  private currentUserId: string;
  private callbacks: ShadowHuntCallbacks;
  private lastBroadcastTime = 0;
  private broadcastThrottleMs = 65; // ~15 updates/second max

  constructor(
    supabase: SupabaseClient,
    roomId: string,
    currentUserId: string,
    callbacks: ShadowHuntCallbacks
  ) {
    this.supabase = supabase;
    this.roomId = roomId;
    this.currentUserId = currentUserId;
    this.callbacks = callbacks;
  }

  public subscribe(currentUserMetadata: { displayName: string; avatarUrl?: string | null }): void {
    const topic = `shadow-hunt:${this.roomId}`;

    // Clean up any existing channel with same topic
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
    }

    this.channel = this.supabase.channel(topic, {
      config: {
        broadcast: { self: false },
        presence: { key: this.currentUserId },
      },
    });

    // 1. Broadcast listeners
    this.channel
      .on("broadcast", { event: "pose" }, payload => {
        if (!payload || !payload.payload) return;
        const pose = payload.payload as PlayerPosePayload;
        // Ignore self broadcasts
        if (pose.userId === this.currentUserId) return;
        this.callbacks.onPoseUpdate?.(pose);
      })
      .on("broadcast", { event: "room_updated" }, payload => {
        if (!payload || !payload.payload) return;
        this.callbacks.onStateUpdate?.(payload.payload as ShadowHuntState);
      })
      .on("broadcast", { event: "round_started" }, payload => {
        if (!payload || !payload.payload) return;
        this.callbacks.onRoundStarted?.(payload.payload as ShadowHuntState);
      })
      .on("broadcast", { event: "player_tagged" }, payload => {
        if (!payload || !payload.payload) return;
        this.callbacks.onPlayerTagged?.(payload.payload as {
          target_user_id: string;
          remaining_hiders: number;
          state: ShadowHuntState;
        });
      })
      .on("broadcast", { event: "round_finished" }, payload => {
        if (!payload || !payload.payload) return;
        this.callbacks.onRoundFinished?.(payload.payload as {
          winner: "seeker" | "hiders";
          state: ShadowHuntState;
        });
      });

    // 2. Presence listeners
    this.channel
      .on("presence", { event: "sync" }, () => {
        if (!this.channel) return;
        const state = this.channel.presenceState();
        const activeIds = Object.keys(state);
        this.callbacks.onPresenceSync?.(activeIds);
      })
      .on("presence", { event: "join" }, () => {
        if (!this.channel) return;
        const state = this.channel.presenceState();
        this.callbacks.onPresenceSync?.(Object.keys(state));
      })
      .on("presence", { event: "leave" }, () => {
        if (!this.channel) return;
        const state = this.channel.presenceState();
        this.callbacks.onPresenceSync?.(Object.keys(state));
      });

    // 3. Connect and track presence
    this.channel.subscribe(async status => {
      if (status === "SUBSCRIBED" && this.channel) {
        try {
          await this.channel.track({
            userId: this.currentUserId,
            displayName: currentUserMetadata.displayName,
            avatarUrl: currentUserMetadata.avatarUrl || null,
            onlineAt: new Date().toISOString(),
          });
        } catch (e) {
          console.warn("Presence track error:", e);
        }
      }
    });
  }

  public broadcastPose(pose: Omit<PlayerPosePayload, "userId" | "timestamp">): void {
    if (!this.channel) return;
    const now = performance.now();
    if (now - this.lastBroadcastTime < this.broadcastThrottleMs) return;
    this.lastBroadcastTime = now;

    const payload: PlayerPosePayload = {
      ...pose,
      userId: this.currentUserId,
      timestamp: Date.now(),
    };

    this.channel.send({
      type: "broadcast",
      event: "pose",
      payload,
    }).catch(err => {
      // Fire-and-forget; do not block gameplay loop
      console.debug("Pose broadcast dropped:", err);
    });
  }

  public unsubscribe(): void {
    if (this.channel) {
      try {
        this.channel.untrack();
      } catch {
        // Ignore
      }
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
