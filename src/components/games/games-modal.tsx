"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Gamepad2,
  Trophy,
  Swords,
  Zap,
  RotateCcw,
  Play,
  Share2,
  Users,
  Check,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flame,
  Bot,
  User,
  Sparkles,
  EyeOff,
} from "lucide-react";
import { HideAndSeekGame } from "./hide-and-seek-game";
import { WorkspaceMember } from "@/types";
import { createClient } from "@/lib/supabase/client";

interface GamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: WorkspaceMember;
  teamMembers?: WorkspaceMember[];
  onShareToChannel?: (messageText: string) => void;
  activeChannelName?: string;
}

interface ScoreRecord {
  id: string;
  user_name: string;
  user_avatar?: string;
  department?: string;
  score: number;
  game_type: string;
}

export function GamesModal({
  isOpen,
  onClose,
  currentUser,
  teamMembers = [],
  onShareToChannel,
  activeChannelName = "general",
}: GamesModalProps) {
  const [activeTab, setActiveTab] = useState<"snake_duel" | "snake_solo" | "tictactoe" | "reflex" | "hide_seek">("snake_duel");
  const [hideSeekOpen, setHideSeekOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<ScoreRecord[]>([]);
  const [sharedToast, setSharedToast] = useState(false);
  const supabase = createClient();

  // Load leaderboard from Supabase
  const loadLeaderboard = useCallback(async (gameType: string) => {
    try {
      const { data, error } = await supabase
        .from("game_scores")
        .select("id, user_name, user_avatar, department, score, game_type")
        .eq("game_type", gameType)
        .order("score", { ascending: gameType === "reflex" ? true : false })
        .limit(10);

      if (data && !error) {
        setLeaderboard(data);
      }
    } catch {
      // Fallback
    }
  }, [supabase]);

  useEffect(() => {
    if (isOpen) {
      loadLeaderboard(activeTab);
    }
  }, [isOpen, activeTab, loadLeaderboard]);

  const handleSaveScore = async (gameType: string, score: number) => {
    try {
      await supabase.from("game_scores").insert({
        game_type: gameType,
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_avatar: currentUser.avatar,
        department: currentUser.department || "Dev",
        score,
      });
      loadLeaderboard(gameType);
    } catch {
      // Silent catch
    }
  };

  const handleShareResult = (text: string) => {
    if (onShareToChannel) {
      onShareToChannel(text);
      setSharedToast(true);
      setTimeout(() => setSharedToast(false), 2500);
    }
  };

  if (!isOpen) return null;

  if (hideSeekOpen) {
    return <HideAndSeekGame onExit={() => setHideSeekOpen(false)} currentUser={currentUser} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">Kaelixo Team Arcade</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                  DUO & TEAM
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Compete head-to-head in 2-Player Snake battles, Duo Tic-Tac-Toe, or reflex challenges
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {sharedToast && (
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2.5 py-1 rounded-xl animate-in fade-in">
                Shared to #{activeChannelName}!
              </span>
            )}
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition cursor-pointer"
              title="Close Arcade"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex items-center space-x-2 px-4 sm:px-6 py-2.5 bg-neutral-950/70 border-b border-neutral-800 overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab("hide_seek")} className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 ${activeTab === "hide_seek" ? "bg-violet-600 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-800/70"}`}>
            <EyeOff className="w-4 h-4" /> Hide &amp; Seek
          </button>
          <button
            onClick={() => setActiveTab("snake_duel")}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === "snake_duel"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800/70"
            }`}
          >
            <Swords className="w-3.5 h-3.5 text-emerald-300" />
            <span>2-Player Snake Duel</span>
            <span className="bg-emerald-950 text-emerald-300 text-[9px] px-1.5 py-0.2 rounded-full border border-emerald-700 font-mono">
              HOT
            </span>
          </button>

          <button
            onClick={() => setActiveTab("snake_solo")}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
              activeTab === "snake_solo"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800/70"
            }`}
          >
            <span>🐍</span>
            <span>Classic Solo Snake</span>
          </button>

          <button
            onClick={() => setActiveTab("tictactoe")}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
              activeTab === "tictactoe"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800/70"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Duo Tic-Tac-Toe</span>
          </button>

          <button
            onClick={() => setActiveTab("reflex")}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
              activeTab === "reflex"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800/70"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Team Reflex Duel</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Game Screen Viewport */}
            <div className="lg:col-span-2 flex flex-col items-center">
              {activeTab === "hide_seek" && <div className="w-full min-h-80 rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-950 via-slate-950 to-emerald-950 flex flex-col items-center justify-center text-center p-8 gap-4">
                <EyeOff className="w-12 h-12 text-violet-300" />
                <h4 className="text-2xl font-black text-white">Shadow Hunt</h4>
                <p className="text-sm text-slate-300 max-w-md">Paint your white character, blend into a matching color area in the 3D room, and avoid the seeker.</p>
                <button onClick={() => setHideSeekOpen(true)} className="rounded-xl bg-violet-500 hover:bg-violet-400 px-7 py-3 text-white font-bold cursor-pointer">Start full-screen game</button>
              </div>}
              {activeTab === "snake_duel" && (
                <TwoPlayerSnakeDuel
                  currentUser={currentUser}
                  teamMembers={teamMembers}
                  onSaveScore={(score) => handleSaveScore("snake_duel", score)}
                  onShareResult={handleShareResult}
                />
              )}

              {activeTab === "snake_solo" && (
                <ClassicSnakeGame
                  currentUser={currentUser}
                  onSaveScore={(score) => handleSaveScore("snake_solo", score)}
                  onShareResult={handleShareResult}
                />
              )}

              {activeTab === "tictactoe" && (
                <DuoTicTacToe
                  currentUser={currentUser}
                  teamMembers={teamMembers}
                  onShareResult={handleShareResult}
                  onSaveScore={(score) => handleSaveScore("tictactoe", score)}
                />
              )}

              {activeTab === "reflex" && (
                <ReflexDuel
                  currentUser={currentUser}
                  onSaveScore={(score) => handleSaveScore("reflex", score)}
                  onShareResult={handleShareResult}
                />
              )}
            </div>

            {/* Live Leaderboard Rail */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4 flex flex-col h-full">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80 mb-3">
                <div className="flex items-center space-x-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    {activeTab === "reflex" ? "Fastest Reflexes" : "Team High Scores"}
                  </h4>
                </div>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {activeTab.replace("_", " ").toUpperCase()}
                </span>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto max-h-80 custom-scrollbar pr-1">
                {leaderboard.length === 0 ? (
                  <div className="py-12 text-center text-neutral-500">
                    <p className="text-xs font-medium">No scores recorded yet.</p>
                    <p className="text-[11px] text-neutral-600 mt-1">Play a match to claim #1!</p>
                  </div>
                ) : (
                  leaderboard.map((item, index) => {
                    const isTop1 = index === 0;
                    const isTop2 = index === 1;
                    const isTop3 = index === 2;

                    return (
                      <div
                        key={item.id || index}
                        className={`flex items-center justify-between p-2 rounded-xl transition border ${
                          isTop1
                            ? "bg-amber-950/30 border-amber-800/50 text-amber-200"
                            : isTop2
                            ? "bg-slate-800/40 border-slate-700/50 text-slate-200"
                            : isTop3
                            ? "bg-orange-950/30 border-orange-800/50 text-orange-200"
                            : "bg-neutral-900/60 border-neutral-800/60 text-neutral-300"
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <span
                            className={`w-5 text-center font-mono text-xs font-black ${
                              isTop1
                                ? "text-amber-400"
                                : isTop2
                                ? "text-slate-300"
                                : isTop3
                                ? "text-orange-400"
                                : "text-neutral-500"
                            }`}
                          >
                            #{index + 1}
                          </span>
                          <img
                            src={
                              item.user_avatar ||
                              `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                                item.user_name
                              )}`
                            }
                            alt={item.user_name}
                            className="w-6 h-6 rounded-lg object-cover bg-neutral-800"
                          />
                          <div className="truncate">
                            <p className="text-xs font-semibold truncate max-w-[110px]">
                              {item.user_name}
                            </p>
                            {item.department && (
                              <p className="text-[9px] text-neutral-400 uppercase tracking-wider">
                                {item.department}
                              </p>
                            )}
                          </div>
                        </div>

                        <span className="font-mono text-xs font-bold text-white bg-black/40 px-2 py-0.5 rounded-lg border border-neutral-800">
                          {activeTab === "reflex" ? `${item.score} ms` : `${item.score} pts`}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// 1. 2-PLAYER SIMULTANEOUS SNAKE DUEL (MATCH WITH TAIL BITING & BATTLES)
// =============================================================================

interface Point {
  x: number;
  y: number;
}

function TwoPlayerSnakeDuel({
  currentUser,
  teamMembers,
  onSaveScore,
  onShareResult,
}: {
  currentUser: WorkspaceMember;
  teamMembers: WorkspaceMember[];
  onSaveScore: (score: number) => void;
  onShareResult: (text: string) => void;
}) {
  const GRID_SIZE = 20;

  const INITIAL_P1: Point[] = [
    { x: 4, y: 10 },
    { x: 3, y: 10 },
    { x: 2, y: 10 },
    { x: 1, y: 10 },
  ];

  const INITIAL_P2: Point[] = [
    { x: 15, y: 10 },
    { x: 16, y: 10 },
    { x: 17, y: 10 },
    { x: 18, y: 10 },
  ];

  const [snake1, setSnake1] = useState<Point[]>(INITIAL_P1);
  const [snake2, setSnake2] = useState<Point[]>(INITIAL_P2);
  const [dir1, setDir1] = useState<"UP" | "DOWN" | "LEFT" | "RIGHT">("RIGHT");
  const [dir2, setDir2] = useState<"UP" | "DOWN" | "LEFT" | "RIGHT">("LEFT");
  const [food, setFood] = useState<Point>({ x: 10, y: 5 });
  const [goldenStar, setGoldenStar] = useState<Point | null>({ x: 10, y: 14 });

  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [roundsWon, setRoundsWon] = useState({ p1: 0, p2: 0 });
  const [roundNumber, setRoundNumber] = useState(1);

  const [opponentType, setOpponentType] = useState<"local" | "ai">("ai");
  const [selectedOpponentName, setSelectedOpponentName] = useState<string>("Smart Colleague AI");
  const [matchState, setMatchState] = useState<"IDLE" | "PLAYING" | "ROUND_END" | "MATCH_OVER">("IDLE");
  const [roundEndText, setRoundEndText] = useState<string>("");
  const [matchWinner, setMatchWinner] = useState<string | null>(null);
  const [biteAlert, setBiteAlert] = useState<string | null>(null);

  // References to keep game loop synchronized
  const s1Ref = useRef<Point[]>(INITIAL_P1);
  const s2Ref = useRef<Point[]>(INITIAL_P2);
  const dir1Ref = useRef(dir1);
  const dir2Ref = useRef(dir2);
  const scoresRef = useRef(scores);
  const roundsWonRef = useRef(roundsWon);

  useEffect(() => {
    s1Ref.current = snake1;
    s2Ref.current = snake2;
    dir1Ref.current = dir1;
    dir2Ref.current = dir2;
    scoresRef.current = scores;
    roundsWonRef.current = roundsWon;
  }, [snake1, snake2, dir1, dir2, scores, roundsWon]);

  const generateFood = useCallback(
    (s1: Point[], s2: Point[]): Point => {
      let candidate: Point = { x: 0, y: 0 };
      let collision = true;
      let attempts = 0;
      while (collision && attempts < 100) {
        attempts++;
        candidate = {
          x: Math.floor(Math.random() * (GRID_SIZE - 2)) + 1,
          y: Math.floor(Math.random() * (GRID_SIZE - 2)) + 1,
        };
        const inS1 = s1.some((p) => p.x === candidate.x && p.y === candidate.y);
        const inS2 = s2.some((p) => p.x === candidate.x && p.y === candidate.y);
        collision = inS1 || inS2;
      }
      return candidate;
    },
    [GRID_SIZE]
  );

  const startNextRound = useCallback(() => {
    setSnake1(INITIAL_P1);
    setSnake2(INITIAL_P2);
    s1Ref.current = INITIAL_P1;
    s2Ref.current = INITIAL_P2;
    setDir1("RIGHT");
    setDir2("LEFT");
    dir1Ref.current = "RIGHT";
    dir2Ref.current = "LEFT";
    setFood(generateFood(INITIAL_P1, INITIAL_P2));
    setGoldenStar(Math.random() > 0.4 ? { x: 10, y: Math.floor(Math.random() * 16) + 2 } : null);
    setRoundEndText("");
    setBiteAlert(null);
    setMatchState("PLAYING");
  }, [generateFood]);

  const startNewMatch = () => {
    setScores({ p1: 0, p2: 0 });
    setRoundsWon({ p1: 0, p2: 0 });
    scoresRef.current = { p1: 0, p2: 0 };
    roundsWonRef.current = { p1: 0, p2: 0 };
    setRoundNumber(1);
    setMatchWinner(null);
    startNextRound();
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (matchState !== "PLAYING") return;

      // Player 1 (Arrow keys)
      const c1 = dir1Ref.current;
      if (e.key === "ArrowUp" && c1 !== "DOWN") {
        e.preventDefault();
        setDir1("UP");
        dir1Ref.current = "UP";
      } else if (e.key === "ArrowDown" && c1 !== "UP") {
        e.preventDefault();
        setDir1("DOWN");
        dir1Ref.current = "DOWN";
      } else if (e.key === "ArrowLeft" && c1 !== "RIGHT") {
        e.preventDefault();
        setDir1("LEFT");
        dir1Ref.current = "LEFT";
      } else if (e.key === "ArrowRight" && c1 !== "LEFT") {
        e.preventDefault();
        setDir1("RIGHT");
        dir1Ref.current = "RIGHT";
      }

      // Player 2 (W, A, S, D in local mode)
      if (opponentType === "local") {
        const c2 = dir2Ref.current;
        const key = e.key.toLowerCase();
        if ((key === "w" || e.code === "KeyW") && c2 !== "DOWN") {
          e.preventDefault();
          setDir2("UP");
          dir2Ref.current = "UP";
        } else if ((key === "s" || e.code === "KeyS") && c2 !== "UP") {
          e.preventDefault();
          setDir2("DOWN");
          dir2Ref.current = "DOWN";
        } else if ((key === "a" || e.code === "KeyA") && c2 !== "RIGHT") {
          e.preventDefault();
          setDir2("LEFT");
          dir2Ref.current = "LEFT";
        } else if ((key === "d" || e.code === "KeyD") && c2 !== "LEFT") {
          e.preventDefault();
          setDir2("RIGHT");
          dir2Ref.current = "RIGHT";
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [matchState, opponentType]);

  // Smart AI Snake Logic for Player 2 (Pathfinding, Food Hunting & Tail Biting)
  const computeAiMove = useCallback(
    (head: Point, target: Point, curDir: string, s1: Point[], s2: Point[]) => {
      const moves: { dir: "UP" | "DOWN" | "LEFT" | "RIGHT"; pos: Point }[] = [
        { dir: "UP", pos: { x: head.x, y: head.y - 1 } },
        { dir: "DOWN", pos: { x: head.x, y: head.y + 1 } },
        { dir: "LEFT", pos: { x: head.x - 1, y: head.y } },
        { dir: "RIGHT", pos: { x: head.x + 1, y: head.y } },
      ];

      // Exclude reverse
      const valid = moves.filter((m) => {
        if (curDir === "UP" && m.dir === "DOWN") return false;
        if (curDir === "DOWN" && m.dir === "UP") return false;
        if (curDir === "LEFT" && m.dir === "RIGHT") return false;
        if (curDir === "RIGHT" && m.dir === "LEFT") return false;

        // Wall check
        if (m.pos.x < 0 || m.pos.x >= GRID_SIZE || m.pos.y < 0 || m.pos.y >= GRID_SIZE)
          return false;

        // Collision check with snake2 body
        if (s2.some((seg) => seg.x === m.pos.x && seg.y === m.pos.y)) return false;

        // If s1 is larger and heading to same square, avoid head-to-head
        if (m.pos.x === s1[0].x && m.pos.y === s1[0].y && s1.length >= s2.length) return false;

        return true;
      });

      if (valid.length === 0) return curDir as "UP" | "DOWN" | "LEFT" | "RIGHT";

      // If AI is longer than P1 or sees P1's tail within reach, target P1's tail to bite!
      let preferredTarget = target;
      if (s1.length > 2 && Math.random() > 0.4) {
        preferredTarget = s1[s1.length - 1]; // target P1's tail to bite!
      }

      valid.sort((a, b) => {
        const distA = Math.abs(a.pos.x - preferredTarget.x) + Math.abs(a.pos.y - preferredTarget.y);
        const distB = Math.abs(b.pos.x - preferredTarget.x) + Math.abs(b.pos.y - preferredTarget.y);
        return distA - distB;
      });

      return valid[0].dir;
    },
    [GRID_SIZE]
  );

  // Main Dual-Snake Simultaneous Game Loop with Tail Biting Mechanics
  useEffect(() => {
    if (matchState !== "PLAYING") return;

    const interval = setInterval(() => {
      const curS1 = [...s1Ref.current];
      const curS2 = [...s2Ref.current];
      const p1Name = currentUser.name.split(" ")[0];
      const p2Name = selectedOpponentName;

      // 1. AI Decision
      let nextDir2 = dir2Ref.current;
      if (opponentType === "ai") {
        const target = goldenStar || food;
        nextDir2 = computeAiMove(curS2[0], target, dir2Ref.current, curS1, curS2);
        setDir2(nextDir2);
        dir2Ref.current = nextDir2;
      }

      // 2. Advance Next Heads
      const head1: Point = { ...curS1[0] };
      const d1 = dir1Ref.current;
      if (d1 === "UP") head1.y -= 1;
      if (d1 === "DOWN") head1.y += 1;
      if (d1 === "LEFT") head1.x -= 1;
      if (d1 === "RIGHT") head1.x += 1;

      const head2: Point = { ...curS2[0] };
      const d2 = dir2Ref.current;
      if (d2 === "UP") head2.y -= 1;
      if (d2 === "DOWN") head2.y += 1;
      if (d2 === "LEFT") head2.x -= 1;
      if (d2 === "RIGHT") head2.x += 1;

      let p1Died = false;
      let p2Died = false;
      let roundReason = "";

      // 3. Wall Collisions
      if (head1.x < 0 || head1.x >= GRID_SIZE || head1.y < 0 || head1.y >= GRID_SIZE) {
        p1Died = true;
        roundReason = `${p1Name} crashed into the perimeter barrier!`;
      }
      if (head2.x < 0 || head2.x >= GRID_SIZE || head2.y < 0 || head2.y >= GRID_SIZE) {
        p2Died = true;
        roundReason = `${p2Name} crashed into the perimeter barrier!`;
      }

      // 4. Self Collision
      if (curS1.slice(1).some((s) => s.x === head1.x && s.y === head1.y)) {
        p1Died = true;
        roundReason = `${p1Name} self-collided!`;
      }
      if (curS2.slice(1).some((s) => s.x === head2.x && s.y === head2.y)) {
        p2Died = true;
        roundReason = `${p2Name} self-collided!`;
      }

      // 5. Head-on Clash
      if (head1.x === head2.x && head1.y === head2.y) {
        if (curS1.length > curS2.length) {
          p2Died = true;
          roundReason = `💥 HEAD CLASH! ${p1Name} (${curS1.length}) overpowered ${p2Name} (${curS2.length})!`;
        } else if (curS2.length > curS1.length) {
          p1Died = true;
          roundReason = `💥 HEAD CLASH! ${p2Name} (${curS2.length}) overpowered ${p1Name} (${curS1.length})!`;
        } else {
          p1Died = true;
          p2Died = true;
          roundReason = "💥 Mutual Head Clash! Draw!";
        }
      }

      // Check if Round is already over due to walls or head clash
      if (p1Died || p2Died) {
        clearInterval(interval);
        setRoundEndText(roundReason);
        if (p1Died && !p2Died) {
          // P2 wins round
          const newRounds = roundsWonRef.current.p2 + 1;
          setScores((sc) => ({ ...sc, p2: sc.p2 + 50 }));
          setRoundsWon((rw) => ({ ...rw, p2: newRounds }));
          if (newRounds >= 3) {
            setMatchWinner(p2Name);
            setMatchState("MATCH_OVER");
          } else {
            setMatchState("ROUND_END");
          }
        } else if (p2Died && !p1Died) {
          // P1 wins round
          const newRounds = roundsWonRef.current.p1 + 1;
          const finalScore = scoresRef.current.p1 + 50;
          setScores((sc) => ({ ...sc, p1: finalScore }));
          setRoundsWon((rw) => ({ ...rw, p1: newRounds }));
          if (newRounds >= 3) {
            setMatchWinner(currentUser.name);
            onSaveScore(finalScore + 100);
            setMatchState("MATCH_OVER");
          } else {
            setMatchState("ROUND_END");
          }
        } else {
          setMatchState("ROUND_END");
        }
        return;
      }

      // 6. TAIL BITING MECHANICS (Snake bites other's tail -> Biter GROWS & steals score, Bitten snake LOSES segments!)
      let nextS1 = [head1, ...curS1];
      let nextS2 = [head2, ...curS2];
      let s1GrewByTail = 0;
      let s2GrewByTail = 0;

      // Check if P1's head bit any body/tail segment of P2 (from index 1 onwards)
      const p2BittenIdx = curS2.findIndex((seg, idx) => idx > 0 && seg.x === head1.x && seg.y === head1.y);
      if (p2BittenIdx !== -1) {
        // P1 bit P2's tail!
        const choppedCount = Math.max(1, curS2.length - p2BittenIdx);
        // P2 shrinks
        nextS2 = nextS2.slice(0, Math.max(1, nextS2.length - choppedCount));
        // P1 grows and scores points!
        s1GrewByTail = choppedCount;
        setScores((sc) => ({ ...sc, p1: sc.p1 + choppedCount * 25 }));
        setBiteAlert(`⚔️ CHOMP! ${p1Name} bit ${p2Name}'s tail! (+${choppedCount * 25} pts & +${choppedCount} length)`);

        // If P2's body is decimated below 2 segments, P1 KOs P2!
        if (nextS2.length < 2) {
          clearInterval(interval);
          setRoundEndText(`🏆 ${p1Name} bit off all of ${p2Name}'s tail and devoured them!`);
          const newRounds = roundsWonRef.current.p1 + 1;
          setRoundsWon((rw) => ({ ...rw, p1: newRounds }));
          if (newRounds >= 3) {
            setMatchWinner(currentUser.name);
            onSaveScore(scoresRef.current.p1 + 100);
            setMatchState("MATCH_OVER");
          } else {
            setMatchState("ROUND_END");
          }
          return;
        }
      }

      // Check if P2's head bit any body/tail segment of P1 (from index 1 onwards)
      const p1BittenIdx = curS1.findIndex((seg, idx) => idx > 0 && seg.x === head2.x && seg.y === head2.y);
      if (p1BittenIdx !== -1) {
        // P2 bit P1's tail!
        const choppedCount = Math.max(1, curS1.length - p1BittenIdx);
        // P1 shrinks
        nextS1 = nextS1.slice(0, Math.max(1, nextS1.length - choppedCount));
        // P2 grows and scores points!
        s2GrewByTail = choppedCount;
        setScores((sc) => ({ ...sc, p2: sc.p2 + choppedCount * 25 }));
        setBiteAlert(`⚔️ CHOMP! ${p2Name} bit ${p1Name}'s tail! (+${choppedCount * 25} pts & +${choppedCount} length)`);

        // If P1's body is decimated below 2 segments, P2 KOs P1!
        if (nextS1.length < 2) {
          clearInterval(interval);
          setRoundEndText(`🏆 ${p2Name} bit off all of ${p1Name}'s tail and devoured them!`);
          const newRounds = roundsWonRef.current.p2 + 1;
          setRoundsWon((rw) => ({ ...rw, p2: newRounds }));
          if (newRounds >= 3) {
            setMatchWinner(p2Name);
            setMatchState("MATCH_OVER");
          } else {
            setMatchState("ROUND_END");
          }
          return;
        }
      }

      // 7. Food & Golden Star Ingestion
      let p1AteFood = false;
      let p2AteFood = false;

      if (head1.x === food.x && head1.y === food.y) {
        p1AteFood = true;
        setScores((sc) => ({ ...sc, p1: sc.p1 + 10 }));
      }
      if (head2.x === food.x && head2.y === food.y) {
        p2AteFood = true;
        setScores((sc) => ({ ...sc, p2: sc.p2 + 10 }));
      }

      if (goldenStar && head1.x === goldenStar.x && head1.y === goldenStar.y) {
        setScores((sc) => ({ ...sc, p1: sc.p1 + 25 }));
        setGoldenStar(null);
        s1GrewByTail += 1;
      }
      if (goldenStar && head2.x === goldenStar.x && head2.y === goldenStar.y) {
        setScores((sc) => ({ ...sc, p2: sc.p2 + 25 }));
        setGoldenStar(null);
        s2GrewByTail += 1;
      }

      // If didn't eat food and didn't grow by tail bite, pop end to keep length
      if (!p1AteFood && s1GrewByTail === 0) {
        nextS1.pop();
      }
      if (!p2AteFood && s2GrewByTail === 0) {
        nextS2.pop();
      }

      if (p1AteFood || p2AteFood) {
        setFood(generateFood(nextS1, nextS2));
      }

      // Commit synchronized positions
      setSnake1(nextS1);
      setSnake2(nextS2);
      s1Ref.current = nextS1;
      s2Ref.current = nextS2;
    }, 115);

    return () => clearInterval(interval);
  }, [
    matchState,
    food,
    goldenStar,
    opponentType,
    selectedOpponentName,
    currentUser.name,
    computeAiMove,
    generateFood,
    onSaveScore,
    GRID_SIZE,
  ]);

  // Auto clear bite notification after 1.8 seconds
  useEffect(() => {
    if (biteAlert) {
      const timer = setTimeout(() => setBiteAlert(null), 1800);
      return () => clearTimeout(timer);
    }
  }, [biteAlert]);

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* Top Match Scoreboard */}
      <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl p-3 mb-3 shadow-lg">
        <div className="flex items-center justify-between">
          {/* Player 1 (Emerald) */}
          <div className="flex items-center space-x-2">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-emerald-500/40" />
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-xs text-white">
                  {currentUser.name.split(" ")[0]}
                </span>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 font-mono font-bold px-1.5 py-0.2 rounded border border-emerald-800">
                  {roundsWon.p1} WINS
                </span>
              </div>
              <div className="flex items-center space-x-2 font-mono text-[11px]">
                <span className="text-emerald-300 font-bold">{scores.p1} pts</span>
                <span className="text-neutral-500">•</span>
                <span className="text-emerald-400/90 text-[10px]">Len: {snake1.length}</span>
              </div>
            </div>
          </div>

          <div className="text-center px-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              ROUND {roundNumber}
            </span>
            <div className="text-xs font-mono font-black text-amber-400">FIRST TO 3</div>
          </div>

          {/* Player 2 (Rose/Purple) */}
          <div className="flex items-center space-x-2 text-right">
            <div>
              <div className="flex items-center space-x-1.5 justify-end">
                <span className="text-[10px] bg-rose-950 text-rose-400 font-mono font-bold px-1.5 py-0.2 rounded border border-rose-800">
                  {roundsWon.p2} WINS
                </span>
                <span className="font-bold text-xs text-white truncate max-w-[90px]">
                  {selectedOpponentName}
                </span>
              </div>
              <div className="flex items-center justify-end space-x-2 font-mono text-[11px]">
                <span className="text-rose-400/90 text-[10px]">Len: {snake2.length}</span>
                <span className="text-neutral-500">•</span>
                <span className="text-rose-300 font-bold">{scores.p2} pts</span>
              </div>
            </div>
            <div className="w-3.5 h-3.5 rounded-full bg-rose-500 ring-2 ring-rose-500/40" />
          </div>
        </div>
      </div>

      {/* Opponent Selection Bar */}
      {matchState === "IDLE" && (
        <div className="w-full max-w-md flex items-center justify-between gap-2 p-2 bg-neutral-950/80 border border-neutral-800 rounded-xl mb-3 text-xs">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => {
                setOpponentType("ai");
                setSelectedOpponentName("Smart Colleague AI");
              }}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                opponentType === "ai"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Vs AI Bot</span>
            </button>
            <button
              onClick={() => {
                setOpponentType("local");
                setSelectedOpponentName("Colleague (P2)");
              }}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                opponentType === "local"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Pass & Play (Local Duo)</span>
            </button>
          </div>

          <div className="text-[10px] text-neutral-400 hidden sm:block">
            {opponentType === "local" ? "P1: Arrows | P2: WASD" : "P1: Arrow Keys"}
          </div>
        </div>
      )}

      {/* 20x20 Neon Grid Arena Canvas */}
      <div className="relative w-[310px] h-[310px] sm:w-[360px] sm:h-[360px] bg-neutral-950 border-2 border-neutral-800 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center">
        {/* Floating Tail-Bite Notification */}
        {biteAlert && matchState === "PLAYING" && (
          <div className="absolute top-3 z-30 px-3 py-1 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-lg animate-bounce ring-1 ring-white/40">
            {biteAlert}
          </div>
        )}

        {matchState === "IDLE" && (
          <div className="text-center p-6 space-y-3 z-20">
            <div className="flex items-center justify-center space-x-2 text-3xl">
              <span className="text-emerald-400">🐍</span>
              <span className="text-amber-400 text-lg font-black">VS</span>
              <span className="text-rose-500">🐍</span>
            </div>
            <h4 className="text-sm font-extrabold text-white">2-Player Snake Tail-Duel</h4>
            <p className="text-xs text-neutral-400 max-w-[250px] leading-relaxed">
              Two snakes slither simultaneously! Hunt and bite the other snake&apos;s tail to steal length and points while growing longer! First to 3 round wins takes the championship!
            </p>
            <button
              onClick={startNewMatch}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition transform hover:scale-105 cursor-pointer flex items-center space-x-2 mx-auto"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Match</span>
            </button>
          </div>
        )}

        {/* Round Over Modal Banner */}
        {matchState === "ROUND_END" && (
          <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-3 z-30 animate-in fade-in">
            <span className="text-2xl font-bold text-amber-400">ROUND OVER</span>
            <p className="text-xs text-white font-semibold max-w-[220px]">{roundEndText}</p>
            <div className="text-xs text-neutral-300 font-mono">
              Score: {currentUser.name.split(" ")[0]} ({roundsWon.p1}) — {selectedOpponentName} (
              {roundsWon.p2})
            </div>
            <button
              onClick={() => {
                setRoundNumber((r) => r + 1);
                startNextRound();
              }}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer flex items-center space-x-1.5 shadow-md shadow-emerald-600/30"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Next Round ({roundNumber + 1})</span>
            </button>
          </div>
        )}

        {/* Match Championship Over */}
        {matchState === "MATCH_OVER" && (
          <div className="absolute inset-0 bg-neutral-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-3.5 z-30 animate-in fade-in">
            <span className="text-4xl animate-bounce">🏆</span>
            <h4 className="text-base font-black text-amber-400 uppercase tracking-wider">
              {matchWinner} WINS THE DUEL!
            </h4>
            <p className="text-xs text-neutral-300">
              Championship Winner:{" "}
              <span className="text-white font-bold">
                {roundsWon.p1} vs {roundsWon.p2}
              </span>
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={startNewMatch}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rematch</span>
              </button>
              <button
                onClick={() =>
                  onShareResult(
                    `⚔️ 2-Player Snake Tail Duel: ${matchWinner} won the championship (${roundsWon.p1} vs ${roundsWon.p2})! 🐍 Tail bites and epic clashes in the Team Arcade!`
                  )
                }
                className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs border border-neutral-700 transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Share in Channel</span>
              </button>
            </div>
          </div>
        )}

        {/* Dual Snakes & Items Rendering */}
        {matchState !== "IDLE" && (
          <div
            className="w-full h-full grid"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
              const x = idx % GRID_SIZE;
              const y = Math.floor(idx / GRID_SIZE);

              const isHead1 = snake1[0]?.x === x && snake1[0]?.y === y;
              const isBody1 = snake1.slice(1).some((s) => s.x === x && s.y === y);

              const isHead2 = snake2[0]?.x === x && snake2[0]?.y === y;
              const isBody2 = snake2.slice(1).some((s) => s.x === x && s.y === y);

              const isFood = food.x === x && food.y === y;
              const isStar = goldenStar && goldenStar.x === x && goldenStar.y === y;

              // Player 1 (Emerald)
              if (isHead1) {
                return (
                  <div
                    key={idx}
                    className="bg-emerald-400 rounded-sm m-[1px] shadow-sm shadow-emerald-400/80 ring-1 ring-white/60"
                  />
                );
              }
              if (isBody1) {
                return (
                  <div
                    key={idx}
                    className="bg-emerald-600 rounded-xs m-[1px] opacity-90"
                  />
                );
              }

              // Player 2 (Rose/Purple)
              if (isHead2) {
                return (
                  <div
                    key={idx}
                    className="bg-rose-400 rounded-sm m-[1px] shadow-sm shadow-rose-400/80 ring-1 ring-white/60"
                  />
                );
              }
              if (isBody2) {
                return (
                  <div
                    key={idx}
                    className="bg-rose-600 rounded-xs m-[1px] opacity-90"
                  />
                );
              }

              // Food & Powerups
              if (isFood) {
                return (
                  <div
                    key={idx}
                    className="bg-amber-400 rounded-full m-[2px] animate-pulse shadow-sm shadow-amber-400/80"
                  />
                );
              }
              if (isStar) {
                return (
                  <div
                    key={idx}
                    className="bg-yellow-300 rounded-full m-[1px] animate-bounce shadow-md shadow-yellow-300"
                  />
                );
              }

              return (
                <div
                  key={idx}
                  className="border border-neutral-900/40"
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Cross-Platform On-Screen Touch Controls */}
      <div className="w-full max-w-md mt-4 flex items-center justify-between px-2">
        {/* Left Side: Player 2 (WASD) Controls in Local Mode */}
        {opponentType === "local" ? (
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-rose-400 mb-1">P2 (W,A,S,D)</span>
            <button
              onClick={() => {
                if (dir2Ref.current !== "DOWN") {
                  setDir2("UP");
                  dir2Ref.current = "UP";
                }
              }}
              className="w-8 h-8 bg-neutral-800 hover:bg-neutral-700 active:bg-rose-600 rounded-lg flex items-center justify-center text-white text-xs font-bold mb-1"
            >
              W
            </button>
            <div className="flex space-x-1">
              <button
                onClick={() => {
                  if (dir2Ref.current !== "RIGHT") {
                    setDir2("LEFT");
                    dir2Ref.current = "LEFT";
                  }
                }}
                className="w-8 h-8 bg-neutral-800 hover:bg-neutral-700 active:bg-rose-600 rounded-lg flex items-center justify-center text-white text-xs font-bold"
              >
                A
              </button>
              <button
                onClick={() => {
                  if (dir2Ref.current !== "UP") {
                    setDir2("DOWN");
                    dir2Ref.current = "DOWN";
                  }
                }}
                className="w-8 h-8 bg-neutral-800 hover:bg-neutral-700 active:bg-rose-600 rounded-lg flex items-center justify-center text-white text-xs font-bold"
              >
                S
              </button>
              <button
                onClick={() => {
                  if (dir2Ref.current !== "LEFT") {
                    setDir2("RIGHT");
                    dir2Ref.current = "RIGHT";
                  }
                }}
                className="w-8 h-8 bg-neutral-800 hover:bg-neutral-700 active:bg-rose-600 rounded-lg flex items-center justify-center text-white text-xs font-bold"
              >
                D
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-neutral-500 font-mono flex items-center space-x-1.5">
            <Bot className="w-4 h-4 text-purple-400" />
            <span>AI Bot hunting & fighting</span>
          </div>
        )}

        {/* Right Side: Player 1 (Arrow Keys) Touch D-Pad */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold text-emerald-400 mb-1">P1 (Arrows)</span>
          <button
            onClick={() => {
              if (dir1Ref.current !== "DOWN") {
                setDir1("UP");
                dir1Ref.current = "UP";
              }
            }}
            className="w-8 h-8 bg-neutral-800 hover:bg-neutral-700 active:bg-emerald-600 rounded-lg flex items-center justify-center text-white mb-1"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <div className="flex space-x-1">
            <button
              onClick={() => {
                if (dir1Ref.current !== "RIGHT") {
                  setDir1("LEFT");
                  dir1Ref.current = "LEFT";
                }
              }}
              className="w-8 h-8 bg-neutral-800 hover:bg-neutral-700 active:bg-emerald-600 rounded-lg flex items-center justify-center text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (dir1Ref.current !== "UP") {
                  setDir1("DOWN");
                  dir1Ref.current = "DOWN";
                }
              }}
              className="w-8 h-8 bg-neutral-800 hover:bg-neutral-700 active:bg-emerald-600 rounded-lg flex items-center justify-center text-white"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (dir1Ref.current !== "LEFT") {
                  setDir1("RIGHT");
                  dir1Ref.current = "RIGHT";
                }
              }}
              className="w-8 h-8 bg-neutral-800 hover:bg-neutral-700 active:bg-emerald-600 rounded-lg flex items-center justify-center text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// 2. CLASSIC RETRO SOLO SNAKE
// =============================================================================

function ClassicSnakeGame({
  currentUser,
  onSaveScore,
  onShareResult,
}: {
  currentUser: WorkspaceMember;
  onSaveScore: (score: number) => void;
  onShareResult: (text: string) => void;
}) {
  const GRID_SIZE = 18;
  const INITIAL_SNAKE = [
    { x: 9, y: 9 },
    { x: 8, y: 9 },
    { x: 7, y: 9 },
  ];

  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [food, setFood] = useState({ x: 13, y: 9 });
  const [direction, setDirection] = useState<"UP" | "DOWN" | "LEFT" | "RIGHT">("RIGHT");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState<"IDLE" | "PLAYING" | "GAMEOVER">("IDLE");

  const directionRef = useRef(direction);
  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  const generateFood = useCallback((currentSnake: { x: number; y: number }[]) => {
    let newFood = { x: 0, y: 0 };
    let collision = true;
    while (collision) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      collision = currentSnake.some((seg) => seg.x === newFood.x && seg.y === newFood.y);
    }
    return newFood;
  }, []);

  const startGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection("RIGHT");
    setScore(0);
    setFood(generateFood(INITIAL_SNAKE));
    setGameState("PLAYING");
  };

  const handleGameOver = useCallback(() => {
    setGameState("GAMEOVER");
    setHighScore((prev) => Math.max(prev, score));
    if (score > 0) {
      onSaveScore(score);
    }
  }, [score, onSaveScore]);

  // Keyboard arrow controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== "PLAYING") return;
      const cur = directionRef.current;

      if ((e.key === "ArrowUp" || e.key === "w") && cur !== "DOWN") {
        e.preventDefault();
        setDirection("UP");
      } else if ((e.key === "ArrowDown" || e.key === "s") && cur !== "UP") {
        e.preventDefault();
        setDirection("DOWN");
      } else if ((e.key === "ArrowLeft" || e.key === "a") && cur !== "RIGHT") {
        e.preventDefault();
        setDirection("LEFT");
      } else if ((e.key === "ArrowRight" || e.key === "d") && cur !== "LEFT") {
        e.preventDefault();
        setDirection("RIGHT");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState]);

  // Game tick interval
  useEffect(() => {
    if (gameState !== "PLAYING") return;

    const speed = Math.max(90, 150 - Math.floor(score / 30) * 8);
    const interval = setInterval(() => {
      setSnake((prev) => {
        const head = { ...prev[0] };
        const dir = directionRef.current;

        if (dir === "UP") head.y -= 1;
        if (dir === "DOWN") head.y += 1;
        if (dir === "LEFT") head.x -= 1;
        if (dir === "RIGHT") head.x += 1;

        // Wall collision
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          handleGameOver();
          return prev;
        }

        // Self collision
        if (prev.some((seg) => seg.x === head.x && seg.y === head.y)) {
          handleGameOver();
          return prev;
        }

        const newSnake = [head, ...prev];

        // Food eaten
        if (head.x === food.x && head.y === food.y) {
          setScore((s) => s + 10);
          setFood(generateFood(newSnake));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [gameState, food, score, generateFood, handleGameOver]);

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top Score Bar */}
      <div className="w-full max-w-sm flex items-center justify-between px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl mb-3 text-xs">
        <div className="flex items-center space-x-1 text-emerald-400 font-bold font-mono">
          <span>Score:</span>
          <span className="text-white text-sm">{score}</span>
        </div>
        <div className="flex items-center space-x-1 text-neutral-400 font-mono">
          <span>Best:</span>
          <span className="text-amber-400 font-bold">{highScore}</span>
        </div>
      </div>

      {/* Grid Canvas */}
      <div className="relative w-[300px] h-[300px] sm:w-[340px] sm:h-[340px] bg-neutral-950 border-2 border-neutral-800 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
        {gameState === "IDLE" && (
          <div className="text-center p-6 space-y-3">
            <span className="text-4xl animate-bounce inline-block">🐍</span>
            <h4 className="text-sm font-bold text-white">Classic Solo Snake</h4>
            <p className="text-xs text-neutral-400 max-w-[200px]">
              Use Arrow keys or On-screen controls to eat food and grow!
            </p>
            <button
              onClick={startGame}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition transform hover:scale-105 cursor-pointer flex items-center space-x-1.5 mx-auto"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Game</span>
            </button>
          </div>
        )}

        {gameState === "GAMEOVER" && (
          <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-3 z-10 animate-in fade-in">
            <span className="text-3xl">💀</span>
            <h4 className="text-base font-extrabold text-rose-500">Game Over!</h4>
            <p className="text-xs text-neutral-300">
              You scored <span className="font-bold text-white text-sm">{score}</span> points!
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={startGame}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Play Again</span>
              </button>
              <button
                onClick={() =>
                  onShareResult(
                    `🐍 I just scored ${score} points in Classic Snake Arena! Beat my score in the Team Arcade!`
                  )
                }
                className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs border border-neutral-700 transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Share in Chat</span>
              </button>
            </div>
          </div>
        )}

        {/* Snake & Food rendering */}
        {gameState !== "IDLE" && (
          <div
            className="w-full h-full grid"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
              const x = idx % GRID_SIZE;
              const y = Math.floor(idx / GRID_SIZE);

              const isHead = snake[0].x === x && snake[0].y === y;
              const isBody = snake.slice(1).some((seg) => seg.x === x && seg.y === y);
              const isFood = food.x === x && food.y === y;

              if (isHead) {
                return (
                  <div
                    key={idx}
                    className="bg-emerald-400 rounded-sm m-[1px] shadow-sm shadow-emerald-400/50"
                  />
                );
              }
              if (isBody) {
                return <div key={idx} className="bg-emerald-600 rounded-xs m-[1px]" />;
              }
              if (isFood) {
                return (
                  <div
                    key={idx}
                    className="bg-rose-500 rounded-full m-[2px] animate-pulse shadow-sm shadow-rose-500/80"
                  />
                );
              }
              return (
                <div
                  key={idx}
                  className="border border-neutral-900/40"
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Touch D-Pad for Mobile */}
      <div className="mt-4 flex flex-col items-center">
        <button
          onClick={() => directionRef.current !== "DOWN" && setDirection("UP")}
          className="w-10 h-10 bg-neutral-800 hover:bg-neutral-700 active:bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow transition mb-1"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
        <div className="flex space-x-2">
          <button
            onClick={() => directionRef.current !== "RIGHT" && setDirection("LEFT")}
            className="w-10 h-10 bg-neutral-800 hover:bg-neutral-700 active:bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => directionRef.current !== "UP" && setDirection("DOWN")}
            className="w-10 h-10 bg-neutral-800 hover:bg-neutral-700 active:bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow transition"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
          <button
            onClick={() => directionRef.current !== "LEFT" && setDirection("RIGHT")}
            className="w-10 h-10 bg-neutral-800 hover:bg-neutral-700 active:bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// 3. DUO TIC-TAC-TOE (PASS & PLAY OR REALTIME ONLINE DUO)
// =============================================================================

function DuoTicTacToe({
  currentUser,
  teamMembers,
  onShareResult,
  onSaveScore,
}: {
  currentUser: WorkspaceMember;
  teamMembers: WorkspaceMember[];
  onShareResult: (text: string) => void;
  onSaveScore: (score: number) => void;
}) {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [selectedOpponent, setSelectedOpponent] = useState<string>("Local Colleague");
  const [scores, setScores] = useState({ X: 0, O: 0 });

  const calculateWinner = (squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: lines[i] };
      }
    }
    return null;
  };

  const winInfo = calculateWinner(board);
  const isDraw = !winInfo && board.every((cell) => cell !== null);

  const handleClick = (idx: number) => {
    if (board[idx] || winInfo) return;

    const newBoard = [...board];
    const player = isXNext ? "X" : "O";
    newBoard[idx] = player;
    setBoard(newBoard);
    setIsXNext(!isXNext);

    const result = calculateWinner(newBoard);
    if (result) {
      setScores((prev) => ({
        ...prev,
        [result.winner]: prev[result.winner as "X" | "O"] + 1,
      }));
      onSaveScore(100);
    }
  };

  const resetMatch = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Opponent Selection & Score Tracker */}
      <div className="w-full max-w-sm flex items-center justify-between px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-2xl mb-4 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-indigo-500" />
          <span className="font-bold text-white">
            {currentUser.name.split(" ")[0]} (X): {scores.X}
          </span>
        </div>
        <span className="text-neutral-500 font-bold">vs</span>
        <div className="flex items-center space-x-2">
          <span className="font-bold text-rose-400">
            {selectedOpponent} (O): {scores.O}
          </span>
          <div className="w-3 h-3 rounded-full bg-rose-500" />
        </div>
      </div>

      {/* Opponent Colleague Dropdown */}
      <div className="w-full max-w-sm mb-4">
        <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1 block">
          Select Duo Partner
        </label>
        <select
          value={selectedOpponent}
          onChange={(e) => setSelectedOpponent(e.target.value)}
          className="w-full bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs rounded-xl p-2 focus:outline-none"
        >
          <option value="Local Colleague">Pass & Play (Local Duo)</option>
          {teamMembers
            .filter((m) => m.id !== currentUser.id)
            .map((m) => (
              <option key={m.id} value={m.name}>
                {m.name} ({m.department || "Dev"})
              </option>
            ))}
        </select>
      </div>

      {/* Status Banner */}
      <div className="mb-3 text-center">
        {winInfo ? (
          <div className="text-sm font-bold text-emerald-400 animate-bounce">
            🎉 {winInfo.winner === "X" ? currentUser.name.split(" ")[0] : selectedOpponent} won
            the match!
          </div>
        ) : isDraw ? (
          <div className="text-sm font-bold text-amber-400">🤝 It&apos;s a draw! Well played!</div>
        ) : (
          <div className="text-xs font-semibold text-neutral-300">
            Turn:{" "}
            <span
              className={`font-mono font-bold ${
                isXNext ? "text-indigo-400" : "text-rose-400"
              }`}
            >
              {isXNext ? `${currentUser.name.split(" ")[0]} (X)` : `${selectedOpponent} (O)`}
            </span>
          </div>
        )}
      </div>

      {/* 3x3 Board */}
      <div className="grid grid-cols-3 gap-2.5 w-[260px] h-[260px] sm:w-[280px] sm:h-[280px] bg-neutral-950 p-2.5 rounded-2xl border-2 border-neutral-800 shadow-xl">
        {board.map((cell, idx) => {
          const isWinningCell = winInfo?.line.includes(idx);
          return (
            <button
              key={idx}
              onClick={() => handleClick(idx)}
              className={`w-full h-full rounded-xl flex items-center justify-center font-mono text-3xl font-extrabold transition transform active:scale-95 cursor-pointer ${
                cell
                  ? cell === "X"
                    ? "text-indigo-400 bg-indigo-950/40 border border-indigo-800/60"
                    : "text-rose-400 bg-rose-950/40 border border-rose-800/60"
                  : "bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800"
              } ${isWinningCell ? "ring-2 ring-emerald-400 bg-emerald-950/50" : ""}`}
            >
              {cell}
            </button>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-5">
        <button
          onClick={resetMatch}
          className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs border border-neutral-700 transition cursor-pointer flex items-center space-x-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>New Round</span>
        </button>

        {winInfo && (
          <button
            onClick={() =>
              onShareResult(
                `⚔️ Duo Tic-Tac-Toe: ${
                  winInfo.winner === "X" ? currentUser.name : selectedOpponent
                } defeated their opponent! Current score: ${scores.X} - ${scores.O}`
              )
            }
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition cursor-pointer flex items-center space-x-1.5 shadow-md shadow-indigo-600/30"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Result</span>
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// 4. TEAM REFLEX DUEL
// =============================================================================

function ReflexDuel({
  currentUser,
  onSaveScore,
  onShareResult,
}: {
  currentUser: WorkspaceMember;
  onSaveScore: (score: number) => void;
  onShareResult: (text: string) => void;
}) {
  const [state, setState] = useState<"WAITING" | "READY" | "CLICK_NOW" | "EARLY" | "RESULT">(
    "WAITING"
  );
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startTest = () => {
    setState("READY");
    const delay = Math.floor(Math.random() * 3000) + 1500; // 1.5 - 4.5 seconds
    timeoutRef.current = setTimeout(() => {
      startTimeRef.current = Date.now();
      setState("CLICK_NOW");
    }, delay);
  };

  const handleClick = () => {
    if (state === "WAITING" || state === "RESULT") {
      startTest();
    } else if (state === "READY") {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setState("EARLY");
    } else if (state === "CLICK_NOW") {
      const elapsed = Date.now() - startTimeRef.current;
      setReactionTime(elapsed);
      setState("RESULT");
      onSaveScore(elapsed);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div
        onClick={handleClick}
        className={`w-full max-w-md h-72 rounded-3xl flex flex-col items-center justify-center p-6 text-center cursor-pointer select-none transition-all duration-150 shadow-2xl ${
          state === "WAITING"
            ? "bg-indigo-950/40 border-2 border-indigo-800/80 hover:bg-indigo-900/40 text-indigo-200"
            : state === "READY"
            ? "bg-rose-950/80 border-2 border-rose-800 text-rose-200"
            : state === "CLICK_NOW"
            ? "bg-emerald-600 border-2 border-emerald-400 text-white animate-pulse"
            : state === "EARLY"
            ? "bg-amber-950/80 border-2 border-amber-800 text-amber-200"
            : "bg-neutral-900 border-2 border-neutral-700 text-white"
        }`}
      >
        {state === "WAITING" && (
          <div className="space-y-2">
            <Zap className="w-10 h-10 text-amber-400 mx-auto" />
            <h4 className="text-base font-bold text-white">Team Reflex Duel</h4>
            <p className="text-xs text-neutral-300">Tap anywhere when ready. Click as fast as you can when it turns green!</p>
          </div>
        )}

        {state === "READY" && (
          <div className="space-y-2">
            <span className="w-6 h-6 rounded-full bg-rose-500 animate-ping inline-block mb-1" />
            <h4 className="text-xl font-black text-rose-400">WAIT FOR GREEN...</h4>
            <p className="text-xs text-rose-300">Do not click yet!</p>
          </div>
        )}

        {state === "CLICK_NOW" && (
          <div className="space-y-2">
            <h4 className="text-3xl font-black text-white tracking-widest">TAP NOW!</h4>
          </div>
        )}

        {state === "EARLY" && (
          <div className="space-y-2">
            <span className="text-3xl">⚠️</span>
            <h4 className="text-base font-bold text-amber-400">Too Early!</h4>
            <p className="text-xs text-neutral-300">You clicked before it turned green. Tap to try again.</p>
          </div>
        )}

        {state === "RESULT" && reactionTime !== null && (
          <div className="space-y-3">
            <Trophy className="w-8 h-8 text-amber-400 mx-auto" />
            <div className="text-4xl font-extrabold text-white font-mono">
              {reactionTime} <span className="text-sm text-neutral-400 font-sans">ms</span>
            </div>
            <p className="text-xs text-emerald-400 font-semibold">
              {reactionTime < 220
                ? "⚡ Lightning Godlike Reflexes!"
                : reactionTime < 300
                ? "🔥 Super Fast Reaction!"
                : "👍 Solid Reaction Time!"}
            </p>
            <p className="text-[11px] text-neutral-400">Tap anywhere to test again</p>
          </div>
        )}
      </div>

      {state === "RESULT" && reactionTime !== null && (
        <button
          onClick={() =>
            onShareResult(
              `⚡ Team Reflex Duel: I scored a ${reactionTime} ms reaction time! Can anyone beat it?`
            )
          }
          className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition cursor-pointer flex items-center space-x-1.5 shadow-md shadow-indigo-600/30"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Share to #{currentUser.department || "Dev"}</span>
        </button>
      )}
    </div>
  );
}
