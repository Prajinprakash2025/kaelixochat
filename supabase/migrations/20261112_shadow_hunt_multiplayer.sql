-- ==============================================================================
-- KAELIXO SHADOW HUNT MULTIPLAYER MIGRATION (PHASE 6)
-- Migration File: supabase/migrations/20261112_shadow_hunt_multiplayer.sql
-- Scope: Private rooms, 2-6 players, roles, authoritative tags, round timing,
--        RLS, Realtime authorization, and reconnect recovery.
-- ==============================================================================

-- 1. ROOMS TABLE
CREATE TABLE IF NOT EXISTS public.shadow_hunt_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'playing', 'finished')),
    round_number INT NOT NULL DEFAULT 1,
    seeker_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    head_start_seconds INT NOT NULL DEFAULT 12,
    round_seconds INT NOT NULL DEFAULT 70,
    started_at TIMESTAMPTZ,
    hunt_starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    winner TEXT CHECK (winner IN ('seeker', 'hiders')),
    last_tag_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. PLAYERS TABLE
CREATE TABLE IF NOT EXISTS public.shadow_hunt_players (
    room_id UUID NOT NULL REFERENCES public.shadow_hunt_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL DEFAULT 'Player',
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'hider' CHECK (role IN ('hider', 'seeker')),
    is_alive BOOLEAN NOT NULL DEFAULT true,
    eliminated_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (room_id, user_id)
);

-- 3. INDEXES FOR FAST LOOKUP AND JOIN OPERATIONS
CREATE INDEX IF NOT EXISTS idx_shadow_hunt_rooms_code ON public.shadow_hunt_rooms(code);
CREATE INDEX IF NOT EXISTS idx_shadow_hunt_rooms_host_id ON public.shadow_hunt_rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_shadow_hunt_rooms_seeker_id ON public.shadow_hunt_rooms(seeker_id);
CREATE INDEX IF NOT EXISTS idx_shadow_hunt_players_room_id ON public.shadow_hunt_players(room_id);
CREATE INDEX IF NOT EXISTS idx_shadow_hunt_players_user_id ON public.shadow_hunt_players(user_id);

-- 4. ROW LEVEL SECURITY
ALTER TABLE public.shadow_hunt_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shadow_hunt_players ENABLE ROW LEVEL SECURITY;

-- Rooms RLS:
-- Authenticated users can read any room they are in, or any active lobby (to resolve room codes)
DROP POLICY IF EXISTS "shadow_hunt_rooms_select" ON public.shadow_hunt_rooms;
CREATE POLICY "shadow_hunt_rooms_select" ON public.shadow_hunt_rooms
    FOR SELECT TO authenticated
    USING (
        status = 'lobby'
        OR host_id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.shadow_hunt_players p
            WHERE p.room_id = shadow_hunt_rooms.id
              AND p.user_id = (SELECT auth.uid())
        )
    );

-- Host update defense-in-depth (authoritative RPCs handle primary state updates)
DROP POLICY IF EXISTS "shadow_hunt_rooms_update" ON public.shadow_hunt_rooms;
CREATE POLICY "shadow_hunt_rooms_update" ON public.shadow_hunt_rooms
    FOR UPDATE TO authenticated
    USING (host_id = (SELECT auth.uid()))
    WITH CHECK (host_id = (SELECT auth.uid()));

-- Players RLS:
-- Authenticated users can view players in the rooms they belong to
DROP POLICY IF EXISTS "shadow_hunt_players_select" ON public.shadow_hunt_players;
CREATE POLICY "shadow_hunt_players_select" ON public.shadow_hunt_players
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.shadow_hunt_players self_p
            WHERE self_p.room_id = shadow_hunt_players.room_id
              AND self_p.user_id = (SELECT auth.uid())
        )
    );

-- 5. REALTIME AUTHORIZATION POLICIES
-- Enables authenticated users to subscribe to and publish on their private room channel: shadow-hunt:<room_id>
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname = 'realtime' AND tablename = 'messages'
    ) THEN
        DROP POLICY IF EXISTS "shadow_hunt_realtime_broadcast_select" ON realtime.messages;
        CREATE POLICY "shadow_hunt_realtime_broadcast_select" ON realtime.messages
            FOR SELECT TO authenticated
            USING (
                realtime.topic() LIKE 'shadow-hunt:%'
                AND EXISTS (
                    SELECT 1 FROM public.shadow_hunt_players p
                    WHERE ('shadow-hunt:' || p.room_id::text) = realtime.topic()
                      AND p.user_id = (SELECT auth.uid())
                )
            );

        DROP POLICY IF EXISTS "shadow_hunt_realtime_broadcast_insert" ON realtime.messages;
        CREATE POLICY "shadow_hunt_realtime_broadcast_insert" ON realtime.messages
            FOR INSERT TO authenticated
            WITH CHECK (
                realtime.topic() LIKE 'shadow-hunt:%'
                AND EXISTS (
                    SELECT 1 FROM public.shadow_hunt_players p
                    WHERE ('shadow-hunt:' || p.room_id::text) = realtime.topic()
                      AND p.user_id = (SELECT auth.uid())
                )
            );
    END IF;
END $$;

-- 6. BROADCAST HELPER
CREATE OR REPLACE FUNCTION public._broadcast_shadow_hunt_event(
    p_room_id UUID,
    p_event TEXT,
    p_payload JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'realtime' AND p.proname = 'send'
    ) THEN
        BEGIN
            PERFORM realtime.send(
                p_payload,
                p_event,
                'shadow-hunt:' || p_room_id::text,
                false
            );
        EXCEPTION WHEN OTHERS THEN
            -- Realtime broadcast notification failure shouldn't abort DB transaction
            NULL;
        END;
    END IF;
END;
$$;

-- 7. HELPER: GET CURRENT FULL STATE
CREATE OR REPLACE FUNCTION public.get_shadow_hunt_state(p_room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_room RECORD;
    v_players JSONB;
    v_alive_hiders INT;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT * INTO v_room FROM public.shadow_hunt_rooms WHERE id = p_room_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Room not found';
    END IF;

    -- Verify caller is a member of this room
    IF NOT EXISTS (
        SELECT 1 FROM public.shadow_hunt_players WHERE room_id = p_room_id AND user_id = v_uid
    ) THEN
        RAISE EXCEPTION 'Access denied: not a member of this room';
    END IF;

    SELECT jsonb_agg(
        jsonb_build_object(
            'user_id', p.user_id,
            'display_name', p.display_name,
            'avatar_url', p.avatar_url,
            'role', p.role,
            'is_alive', p.is_alive,
            'eliminated_at', p.eliminated_at,
            'joined_at', p.joined_at,
            'last_seen_at', p.last_seen_at
        ) ORDER BY p.joined_at ASC
    ) INTO v_players
    FROM public.shadow_hunt_players p
    WHERE p.room_id = p_room_id;

    SELECT COUNT(*) INTO v_alive_hiders
    FROM public.shadow_hunt_players
    WHERE room_id = p_room_id AND role = 'hider' AND is_alive = true;

    RETURN jsonb_build_object(
        'room', jsonb_build_object(
            'id', v_room.id,
            'code', v_room.code,
            'host_id', v_room.host_id,
            'status', v_room.status,
            'round_number', v_room.round_number,
            'seeker_id', v_room.seeker_id,
            'head_start_seconds', v_room.head_start_seconds,
            'round_seconds', v_room.round_seconds,
            'started_at', v_room.started_at,
            'hunt_starts_at', v_room.hunt_starts_at,
            'ends_at', v_room.ends_at,
            'winner', v_room.winner,
            'alive_hiders', v_alive_hiders
        ),
        'players', COALESCE(v_players, '[]'::jsonb),
        'server_time', now()
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_shadow_hunt_state(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shadow_hunt_state(UUID) TO authenticated;

-- 8. RPC: CREATE ROOM
CREATE OR REPLACE FUNCTION public.create_shadow_hunt_room(
    p_display_name TEXT DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_code TEXT;
    v_room_id UUID;
    v_name TEXT;
    v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    v_i INT;
    v_state JSONB;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Resolve display name
    v_name := COALESCE(NULLIF(TRIM(p_display_name), ''), 'Host');

    -- Generate a unique 6-character room code
    LOOP
        v_code := '';
        FOR v_i IN 1..6 LOOP
            v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
        END LOOP;
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.shadow_hunt_rooms WHERE code = v_code AND status IN ('lobby', 'playing'));
    END LOOP;

    INSERT INTO public.shadow_hunt_rooms (
        code, host_id, status, round_number, head_start_seconds, round_seconds
    ) VALUES (
        v_code, v_uid, 'lobby', 1, 12, 70
    ) RETURNING id INTO v_room_id;

    INSERT INTO public.shadow_hunt_players (
        room_id, user_id, display_name, avatar_url, role, is_alive
    ) VALUES (
        v_room_id, v_uid, v_name, p_avatar_url, 'hider', true
    );

    v_state := public.get_shadow_hunt_state(v_room_id);
    RETURN v_state;
END;
$$;

REVOKE ALL ON FUNCTION public.create_shadow_hunt_room(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_shadow_hunt_room(TEXT, TEXT) TO authenticated;

-- 9. RPC: JOIN ROOM (SUPPORTS RECONNECT)
CREATE OR REPLACE FUNCTION public.join_shadow_hunt_room(
    p_code TEXT,
    p_display_name TEXT DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_clean_code TEXT := UPPER(TRIM(p_code));
    v_room RECORD;
    v_player_count INT;
    v_name TEXT;
    v_state JSONB;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT * INTO v_room FROM public.shadow_hunt_rooms WHERE code = v_clean_code;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Room code not found';
    END IF;

    -- Reconnect check: if player is already a member, return current state without error
    IF EXISTS (
        SELECT 1 FROM public.shadow_hunt_players WHERE room_id = v_room.id AND user_id = v_uid
    ) THEN
        UPDATE public.shadow_hunt_players
        SET last_seen_at = now()
        WHERE room_id = v_room.id AND user_id = v_uid;

        v_state := public.get_shadow_hunt_state(v_room.id);
        PERFORM public._broadcast_shadow_hunt_event(v_room.id, 'player_reconnected', jsonb_build_object('user_id', v_uid));
        RETURN v_state;
    END IF;

    -- If joining new, room must be in lobby state
    IF v_room.status != 'lobby' THEN
        RAISE EXCEPTION 'Game already in progress';
    END IF;

    -- Enforce 2-6 player room cap
    SELECT COUNT(*) INTO v_player_count FROM public.shadow_hunt_players WHERE room_id = v_room.id;
    IF v_player_count >= 6 THEN
        RAISE EXCEPTION 'Room is full (maximum 6 players)';
    END IF;

    v_name := COALESCE(NULLIF(TRIM(p_display_name), ''), 'Player ' || (v_player_count + 1));

    INSERT INTO public.shadow_hunt_players (
        room_id, user_id, display_name, avatar_url, role, is_alive
    ) VALUES (
        v_room.id, v_uid, v_name, p_avatar_url, 'hider', true
    );

    v_state := public.get_shadow_hunt_state(v_room.id);
    PERFORM public._broadcast_shadow_hunt_event(v_room.id, 'room_updated', v_state);
    RETURN v_state;
END;
$$;

REVOKE ALL ON FUNCTION public.join_shadow_hunt_room(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_shadow_hunt_room(TEXT, TEXT, TEXT) TO authenticated;

-- 10. RPC: START ROUND (AUTHORITATIVE ROLES & COUNTDOWN)
CREATE OR REPLACE FUNCTION public.start_shadow_hunt_round(p_room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_room RECORD;
    v_player_count INT;
    v_seeker_id UUID;
    v_now TIMESTAMPTZ := now();
    v_hunt_starts TIMESTAMPTZ;
    v_ends TIMESTAMPTZ;
    v_state JSONB;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT * INTO v_room FROM public.shadow_hunt_rooms WHERE id = p_room_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Room not found';
    END IF;

    IF v_room.host_id != v_uid THEN
        RAISE EXCEPTION 'Only the room host can start the game';
    END IF;

    SELECT COUNT(*) INTO v_player_count FROM public.shadow_hunt_players WHERE room_id = p_room_id;
    IF v_player_count < 2 THEN
        RAISE EXCEPTION 'Need at least 2 players to start multiplayer';
    END IF;

    -- Pick 1 seeker randomly (or pick next if already had seeker in previous round)
    SELECT user_id INTO v_seeker_id
    FROM public.shadow_hunt_players
    WHERE room_id = p_room_id
    ORDER BY (CASE WHEN user_id = v_room.seeker_id THEN 1 ELSE 0 END), random()
    LIMIT 1;

    -- Assign roles and reset vitality
    UPDATE public.shadow_hunt_players
    SET role = CASE WHEN user_id = v_seeker_id THEN 'seeker' ELSE 'hider' END,
        is_alive = true,
        eliminated_at = NULL
    WHERE room_id = p_room_id;

    v_hunt_starts := v_now + (v_room.head_start_seconds || ' seconds')::interval;
    v_ends := v_hunt_starts + (v_room.round_seconds || ' seconds')::interval;

    UPDATE public.shadow_hunt_rooms
    SET status = 'playing',
        seeker_id = v_seeker_id,
        started_at = v_now,
        hunt_starts_at = v_hunt_starts,
        ends_at = v_ends,
        winner = NULL,
        last_tag_at = NULL,
        updated_at = v_now
    WHERE id = p_room_id;

    v_state := public.get_shadow_hunt_state(p_room_id);
    PERFORM public._broadcast_shadow_hunt_event(p_room_id, 'round_started', v_state);
    RETURN v_state;
END;
$$;

REVOKE ALL ON FUNCTION public.start_shadow_hunt_round(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_shadow_hunt_round(UUID) TO authenticated;

-- 11. RPC: SUBMIT TAG (AUTHORITATIVE VALIDATION)
CREATE OR REPLACE FUNCTION public.submit_shadow_hunt_tag(
    p_room_id UUID,
    p_target_user_id UUID,
    p_distance FLOAT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_room RECORD;
    v_target RECORD;
    v_now TIMESTAMPTZ := now();
    v_remaining_hiders INT;
    v_state JSONB;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT * INTO v_room FROM public.shadow_hunt_rooms WHERE id = p_room_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Room not found';
    END IF;

    IF v_room.status != 'playing' THEN
        RAISE EXCEPTION 'Game is not currently active';
    END IF;

    -- Enforce caller is seeker
    IF v_room.seeker_id != v_uid THEN
        RAISE EXCEPTION 'Only the active seeker can tag hiders';
    END IF;

    -- Enforce head start countdown has completed
    IF v_now < v_room.hunt_starts_at THEN
        RAISE EXCEPTION 'Seeker is still locked in countdown';
    END IF;

    -- Enforce round has not expired
    IF v_now > v_room.ends_at THEN
        RAISE EXCEPTION 'Round has already ended';
    END IF;

    -- Tag rate limit / cooldown check (min 450ms between successful hits)
    IF v_room.last_tag_at IS NOT NULL AND (v_now - v_room.last_tag_at) < interval '450 milliseconds' THEN
        RAISE EXCEPTION 'Tag cooldown active';
    END IF;

    -- Target must be an alive hider in the same room
    SELECT * INTO v_target
    FROM public.shadow_hunt_players
    WHERE room_id = p_room_id AND user_id = p_target_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target player not found in room';
    END IF;

    IF v_target.role != 'hider' OR NOT v_target.is_alive THEN
        RAISE EXCEPTION 'Target is not an alive hider';
    END IF;

    -- Distance validation (TAG_RANGE is 12m, allow 15m tolerance for latency)
    IF p_distance IS NOT NULL AND p_distance > 15.0 THEN
        RAISE EXCEPTION 'Target is out of tag range';
    END IF;

    -- Mark target eliminated
    UPDATE public.shadow_hunt_players
    SET is_alive = false,
        eliminated_at = v_now
    WHERE room_id = p_room_id AND user_id = p_target_user_id;

    UPDATE public.shadow_hunt_rooms
    SET last_tag_at = v_now,
        updated_at = v_now
    WHERE id = p_room_id;

    -- Check remaining hiders
    SELECT COUNT(*) INTO v_remaining_hiders
    FROM public.shadow_hunt_players
    WHERE room_id = p_room_id AND role = 'hider' AND is_alive = true;

    IF v_remaining_hiders = 0 THEN
        UPDATE public.shadow_hunt_rooms
        SET status = 'finished',
            winner = 'seeker',
            updated_at = v_now
        WHERE id = p_room_id;
    END IF;

    v_state := public.get_shadow_hunt_state(p_room_id);

    PERFORM public._broadcast_shadow_hunt_event(
        p_room_id,
        'player_tagged',
        jsonb_build_object(
            'target_user_id', p_target_user_id,
            'remaining_hiders', v_remaining_hiders,
            'state', v_state
        )
    );

    IF v_remaining_hiders = 0 THEN
        PERFORM public._broadcast_shadow_hunt_event(
            p_room_id,
            'round_finished',
            jsonb_build_object('winner', 'seeker', 'state', v_state)
        );
    END IF;

    RETURN v_state;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_shadow_hunt_tag(UUID, UUID, FLOAT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_shadow_hunt_tag(UUID, UUID, FLOAT) TO authenticated;

-- 12. RPC: RESOLVE TIMEOUT (IDEMPOTENT END-OF-ROUND)
CREATE OR REPLACE FUNCTION public.resolve_shadow_hunt_timeout(p_room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_room RECORD;
    v_now TIMESTAMPTZ := now();
    v_alive_hiders INT;
    v_winner TEXT;
    v_state JSONB;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT * INTO v_room FROM public.shadow_hunt_rooms WHERE id = p_room_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Room not found';
    END IF;

    IF v_room.status != 'playing' THEN
        RETURN public.get_shadow_hunt_state(p_room_id);
    END IF;

    IF v_now < v_room.ends_at THEN
        RAISE EXCEPTION 'Round timer has not expired yet';
    END IF;

    SELECT COUNT(*) INTO v_alive_hiders
    FROM public.shadow_hunt_players
    WHERE room_id = p_room_id AND role = 'hider' AND is_alive = true;

    IF v_alive_hiders > 0 THEN
        v_winner := 'hiders';
    ELSE
        v_winner := 'seeker';
    END IF;

    UPDATE public.shadow_hunt_rooms
    SET status = 'finished',
        winner = v_winner,
        updated_at = v_now
    WHERE id = p_room_id;

    v_state := public.get_shadow_hunt_state(p_room_id);
    PERFORM public._broadcast_shadow_hunt_event(
        p_room_id,
        'round_finished',
        jsonb_build_object('winner', v_winner, 'state', v_state)
    );

    RETURN v_state;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_shadow_hunt_timeout(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_shadow_hunt_timeout(UUID) TO authenticated;

-- 13. RPC: LEAVE ROOM (HOST MIGRATION & FORFEIT HANDLING)
CREATE OR REPLACE FUNCTION public.leave_shadow_hunt_room(p_room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_room RECORD;
    v_new_host_id UUID;
    v_remaining_players INT;
    v_alive_hiders INT;
    v_now TIMESTAMPTZ := now();
    v_state JSONB;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT * INTO v_room FROM public.shadow_hunt_rooms WHERE id = p_room_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('left', true);
    END IF;

    DELETE FROM public.shadow_hunt_players
    WHERE room_id = p_room_id AND user_id = v_uid;

    SELECT COUNT(*) INTO v_remaining_players
    FROM public.shadow_hunt_players
    WHERE room_id = p_room_id;

    -- If no players left, clean up the room
    IF v_remaining_players = 0 THEN
        DELETE FROM public.shadow_hunt_rooms WHERE id = p_room_id;
        RETURN jsonb_build_object('left', true, 'room_closed', true);
    END IF;

    -- If host left, transfer host role to the earliest joined player
    IF v_room.host_id = v_uid THEN
        SELECT user_id INTO v_new_host_id
        FROM public.shadow_hunt_players
        WHERE room_id = p_room_id
        ORDER BY joined_at ASC
        LIMIT 1;

        UPDATE public.shadow_hunt_rooms
        SET host_id = v_new_host_id,
            updated_at = v_now
        WHERE id = p_room_id;
    END IF;

    -- If in playing state and seeker left, hiders win by forfeit
    IF v_room.status = 'playing' THEN
        IF v_room.seeker_id = v_uid THEN
            UPDATE public.shadow_hunt_rooms
            SET status = 'finished',
                winner = 'hiders',
                updated_at = v_now
            WHERE id = p_room_id;
        ELSE
            -- A hider left, check if any alive hiders remain
            SELECT COUNT(*) INTO v_alive_hiders
            FROM public.shadow_hunt_players
            WHERE room_id = p_room_id AND role = 'hider' AND is_alive = true;

            IF v_alive_hiders = 0 THEN
                UPDATE public.shadow_hunt_rooms
                SET status = 'finished',
                    winner = 'seeker',
                    updated_at = v_now
                WHERE id = p_room_id;
            END IF;
        END IF;
    END IF;

    v_state := public.get_shadow_hunt_state(p_room_id);
    PERFORM public._broadcast_shadow_hunt_event(p_room_id, 'player_left', jsonb_build_object('user_id', v_uid, 'state', v_state));
    RETURN v_state;
END;
$$;

REVOKE ALL ON FUNCTION public.leave_shadow_hunt_room(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_shadow_hunt_room(UUID) TO authenticated;
