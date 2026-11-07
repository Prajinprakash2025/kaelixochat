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
} from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"snake" | "tictactoe" | "reflex">("snake");
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
      // Fallback local memory leaderboard if offline
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">Kaelixo Team Arcade</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Live
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Play retro Snake, challenge colleagues to Duo battles, and climb the company board
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
        <div className="flex items-center space-x-2 px-5 py-2.5 bg-neutral-950/60 border-b border-neutral-800/80 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("snake")}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === "snake"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800/70"
            }`}
          >
            <span>🐍</span>
            <span>Snake Arena</span>
          </button>

          <button
            onClick={() => setActiveTab("tictactoe")}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === "tictactoe"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800/70"
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Duo Tic-Tac-Toe</span>
          </button>

          <button
            onClick={() => setActiveTab("reflex")}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
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
              {activeTab === "snake" && (
                <SnakeGame
                  currentUser={currentUser}
                  onSaveScore={(score) => handleSaveScore("snake", score)}
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
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80 mb-3">
                <div className="flex items-center space-x-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    {activeTab === "reflex" ? "Fastest Reflexes" : "Team High Scores"}
                  </h4>
                </div>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {activeTab.toUpperCase()}
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
// 1. CLASSIC RETRO SNAKE GAME
// =============================================================================

function SnakeGame({
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
  directionRef.current = direction;

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
    setHighScore((prev) => {
      const best = Math.max(prev, score);
      return best;
    });
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
            <h4 className="text-sm font-bold text-white">Classic Snake Arena</h4>
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
                    `🐍 I just scored ${score} points in Snake Arena! Beat my score in the Team Arcade!`
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

      {/* Touch D-Pad for Mobile & Quick Controls */}
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
// 2. DUO TIC-TAC-TOE (PASS & PLAY OR REALTIME ONLINE DUO)
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
          <div className="text-sm font-bold text-amber-400">🤝 It's a draw! Well played!</div>
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
// 3. TEAM REFLEX DUEL (SPEED REACTION CHALLENGE)
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
