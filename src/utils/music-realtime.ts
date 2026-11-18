import { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { MusicTrack, MusicSyncState, MusicSyncAction, WorkspaceMember, MusicReaction } from "@/types";

export type MusicEventListener = (action: MusicSyncAction) => void;
export type MusicPresenceListener = (listeners: WorkspaceMember[]) => void;

class MusicSyncManager {
  private channel: RealtimeChannel | null = null;
  private actionListeners: Set<MusicEventListener> = new Set();
  private presenceListeners: Set<MusicPresenceListener> = new Set();
  private currentUser: WorkspaceMember | null = null;
  private activeRoom: string = "general-lounge";

  public init(currentUser: WorkspaceMember, roomName: string = "general-lounge") {
    this.currentUser = currentUser;
    this.activeRoom = roomName;

    if (this.channel) {
      return;
    }

    const supabase = createClient();
    const channelName = `kaelixo-music-room-${roomName}`;

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: false, self: false },
        presence: { key: currentUser.id },
      },
    });

    this.channel = channel;

    // 1. Listen for Broadcast Actions (Play, Pause, Seek, Track change, Queue)
    channel.on("broadcast", { event: "music-action" }, (event: any) => {
      const action = event.payload as MusicSyncAction;
      if (action) {
        this.actionListeners.forEach((listener) => {
          try {
            listener(action);
          } catch (err) {
            console.error("Error in music action listener:", err);
          }
        });
      }
    });

    // 2. Track listeners presence
    channel
      .on("presence", { event: "sync" }, () => this.handlePresenceSync())
      .on("presence", { event: "join" }, () => this.handlePresenceSync())
      .on("presence", { event: "leave" }, () => this.handlePresenceSync());

    channel.subscribe(async (status: any) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          id: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar,
          role: currentUser.role,
          department: currentUser.department,
          joinedAt: new Date().toISOString(),
        });

        // Request initial state from anyone already playing in the room
        this.broadcastAction({
          type: "SYNC_REQUEST",
          payload: {},
          sentAt: Date.now(),
          sender: {
            id: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar,
          },
        });
      }
    });
  }

  private handlePresenceSync() {
    if (!this.channel) return;
    const state = this.channel.presenceState();
    const listeners: WorkspaceMember[] = [];

    Object.keys(state).forEach((key) => {
      const entries = state[key] as any[];
      if (entries && entries.length > 0) {
        const latest = entries[entries.length - 1];
        listeners.push({
          id: latest.id || key,
          name: latest.name || "Listener",
          email: `${latest.id}@kaelixo.com`,
          avatar: latest.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${key}`,
          role: latest.role || "member",
          department: latest.department || "dev",
          status: "online",
        });
      }
    });

    this.presenceListeners.forEach((listener) => {
      try {
        listener(listeners);
      } catch (err) {
        console.error("Error in presence listener:", err);
      }
    });
  }

  public subscribe(listener: MusicEventListener): () => void {
    this.actionListeners.add(listener);
    return () => {
      this.actionListeners.delete(listener);
    };
  }

  public subscribePresence(listener: MusicPresenceListener): () => void {
    this.presenceListeners.add(listener);
    return () => {
      this.presenceListeners.delete(listener);
    };
  }

  public broadcastAction(action: MusicSyncAction) {
    if (!this.channel) return;
    this.channel.send({
      type: "broadcast",
      event: "music-action",
      payload: action,
    });
  }

  public play(track: MusicTrack, position: number, dj: WorkspaceMember) {
    this.broadcastAction({
      type: "PLAY",
      payload: { track, position },
      sentAt: Date.now(),
      sender: { id: dj.id, name: dj.name, avatar: dj.avatar },
    });
  }

  public pause(position: number, dj: WorkspaceMember) {
    this.broadcastAction({
      type: "PAUSE",
      payload: { position },
      sentAt: Date.now(),
      sender: { id: dj.id, name: dj.name, avatar: dj.avatar },
    });
  }

  public seek(position: number, dj: WorkspaceMember) {
    this.broadcastAction({
      type: "SEEK",
      payload: { position },
      sentAt: Date.now(),
      sender: { id: dj.id, name: dj.name, avatar: dj.avatar },
    });
  }

  public trackChange(track: MusicTrack, dj: WorkspaceMember) {
    this.broadcastAction({
      type: "TRACK_CHANGE",
      payload: { track, position: 0 },
      sentAt: Date.now(),
      sender: { id: dj.id, name: dj.name, avatar: dj.avatar },
    });
  }

  public addToQueue(track: MusicTrack, sender: WorkspaceMember) {
    this.broadcastAction({
      type: "QUEUE_ADD",
      payload: { track },
      sentAt: Date.now(),
      sender: { id: sender.id, name: sender.name, avatar: sender.avatar },
    });
  }

  public removeFromQueue(index: number, sender: WorkspaceMember) {
    this.broadcastAction({
      type: "QUEUE_REMOVE",
      payload: { index },
      sentAt: Date.now(),
      sender: { id: sender.id, name: sender.name, avatar: sender.avatar },
    });
  }

  public respondState(state: MusicSyncState, respondent: WorkspaceMember) {
    this.broadcastAction({
      type: "SYNC_RESPONSE",
      payload: state,
      sentAt: Date.now(),
      sender: { id: respondent.id, name: respondent.name, avatar: respondent.avatar },
    });
  }

  public sendReaction(emoji: string, sender: WorkspaceMember) {
    this.broadcastAction({
      type: "REACTION",
      payload: { emoji, id: `react-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` },
      sentAt: Date.now(),
      sender: { id: sender.id, name: sender.name, avatar: sender.avatar },
    });
  }

  public cleanup() {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
    this.actionListeners.clear();
    this.presenceListeners.clear();
  }
}

export const musicSync = new MusicSyncManager();
