"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Grid from "@/components/Grid";
import Link from "next/link";

const PENDING_USER_ID = -1;

export default function JoinGamePage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string)?.toUpperCase();
  const [game, setGame] = useState<{
    name: string;
    price_per_square: number;
    availableSquares: number;
    status: string;
  } | null>(null);
  const [grid, setGrid] = useState<
    Record<string, { userId: number | null; userName: string | null; winners?: string[] }>
  >({});
  const [rowNumbers, setRowNumbers] = useState<number[] | null>(null);
  const [colNumbers, setColNumbers] = useState<number[] | null>(null);
  const [numbersAssigned, setNumbersAssigned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joinLoading, setJoinLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedSquares, setSelectedSquares] = useState<Array<[number, number]>>([]);

  const fetchGame = useCallback(async () => {
    if (!code) return;
    const r = await fetch(`/api/games/${code}/info`);
    const data = await r.json();
    if (data.error) {
      setError(data.error);
      setGame(null);
    } else {
      setGame(data);
      if (data.status !== "pending") setError("This game has already started");
    }
  }, [code]);

  const fetchSquares = useCallback(async () => {
    if (!code) return;
    const r = await fetch(`/api/games/${code}/squares`);
    const data = await r.json();
    if (!data.error) {
      setGrid(data.grid);
      setRowNumbers(data.rowNumbers);
      setColNumbers(data.colNumbers);
      setNumbersAssigned(data.numbersAssigned);
    }
  }, [code]);

  useEffect(() => {
    if (!code) return;
    Promise.all([fetchGame(), fetchSquares()]).finally(() => setLoading(false));
  }, [code, fetchGame, fetchSquares]);

  // Merge our pending selections into the grid for display
  const displayGrid = useCallback(() => {
    const merged = { ...grid };
    for (const [row, col] of selectedSquares) {
      merged[`${row}-${col}`] = {
        userId: PENDING_USER_ID,
        userName: name.trim() || "You",
        winners: [],
      };
    }
    return merged;
  }, [grid, selectedSquares, name]);

  const maxSquares = game ? Math.min(100, game.availableSquares) : 0;

  const handleSelectSquare = useCallback(
    (row: number, col: number) => {
      const key = `${row}-${col}`;
      const existing = grid[key];
      const isOurs = selectedSquares.some(([r, c]) => r === row && c === col);
      const isTaken = existing?.userId != null && existing.userId !== PENDING_USER_ID;

      if (isOurs) {
        setSelectedSquares((prev) => prev.filter(([r, c]) => !(r === row && c === col)));
      } else if (!isTaken && selectedSquares.length < maxSquares) {
        setSelectedSquares((prev) => [...prev, [row, col]]);
      }
    },
    [grid, maxSquares, selectedSquares]
  );

  const hasNameAndPhone = Boolean(name.trim() && phone.trim());
  const canJoin =
    hasNameAndPhone &&
    selectedSquares.length >= 1;

  const handleJoin = async () => {
    if (!canJoin || !game || !code) return;
    setJoinLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/games/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          squaresToBuy: selectedSquares.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join");

      const { userId } = data;

      // Select each square via the API
      for (const [row, col] of selectedSquares) {
        const sqRes = await fetch(`/api/games/${code}/squares`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, action: "select", row, col }),
        });
        const sqData = await sqRes.json();
        if (!sqRes.ok) throw new Error(sqData.error || "Failed to select square");
      }

      // Lock in picks (same as clicking Submit Picks on game page)
      const submitRes = await fetch(`/api/games/${code}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const submitData = await submitRes.json();
      if (!submitRes.ok) throw new Error(submitData.error || "Failed to submit picks");

      localStorage.setItem(
        `game-${code}`,
        JSON.stringify({
          userId: data.userId,
          gameId: data.gameId,
          isAdmin: false,
          name: name.trim(),
          squaresToBuy: selectedSquares.length,
        })
      );
      router.push(`/game/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setJoinLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-[#013369] p-4 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#69BE28]/30 border-t-[#69BE28] rounded-full animate-spin" />
        <p className="text-slate-300 mt-4">Loading...</p>
      </main>
    );
  }

  if (error && !game) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-[#013369] p-4 flex flex-col items-center justify-center">
        <p className="text-red-400 mb-4">{error}</p>
        <Link href="/join" className="text-[#69BE28] font-semibold underline underline-offset-2">
          Try another code
        </Link>
      </main>
    );
  }

  if (!game) return null;

  const quantity = selectedSquares.length;
  const total = quantity * game.price_per_square;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-[#013369] p-4 pb-8">
      <div className="max-w-2xl mx-auto">
        <h1
          className="text-2xl font-bold text-center mb-2 text-white"
          style={{ fontFamily: "var(--font-bebas), system-ui, sans-serif" }}
        >
          {game.name}
        </h1>
        <p className="text-center text-slate-300 mb-6">
          ${game.price_per_square.toFixed(2)} per square • {game.availableSquares} squares
          available
        </p>

        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-2 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-200">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-xl border-2 border-white/20 bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-[#69BE28] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-200">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="555-123-4567"
                className="w-full px-4 py-3 rounded-xl border-2 border-white/20 bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-[#69BE28] focus:border-transparent"
              />
              <p className="text-xs text-slate-400 mt-1">Used to log back in later</p>
            </div>
          </div>

          <div>
            {!hasNameAndPhone && (
              <p className="text-sm text-amber-400/90 mb-2">
                Enter your name and phone number above to select squares.
              </p>
            )}
            <div className="flex items-center justify-between text-slate-200 mb-2">
              <span className="text-sm font-medium">
                {quantity} square{quantity !== 1 ? "s" : ""} × ${game.price_per_square.toFixed(2)}
              </span>
              <span className="text-xl font-bold text-[#69BE28]">
                ${total.toFixed(2)}
              </span>
            </div>
            <p className="text-sm text-slate-400 mb-2">
              Tap squares to select — tap again to deselect
            </p>
            <div className={`rounded-2xl shadow-lg ring-1 ring-slate-200/80 p-2 sm:p-3 ${!hasNameAndPhone ? "bg-white/50 opacity-75 pointer-events-none" : "bg-white"}`}>
              <Grid
                grid={displayGrid()}
                rowNumbers={rowNumbers}
                colNumbers={colNumbers}
                numbersAssigned={numbersAssigned}
                currentUserId={PENDING_USER_ID}
                squaresToBuy={maxSquares}
                selectedCount={selectedSquares.length}
                canSelect={hasNameAndPhone && game.status === "pending"}
                onSelectSquare={handleSelectSquare}
              />
            </div>
          </div>

          <div className="h-28" />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-slate-900 via-slate-900/98 to-transparent pt-8">
        <div className="max-w-2xl mx-auto">
          <motion.button
            onClick={handleJoin}
            disabled={!canJoin || joinLoading}
            whileHover={canJoin ? { scale: 1.01 } : undefined}
            whileTap={canJoin ? { scale: 0.99 } : undefined}
            className="w-full py-4 bg-[#69BE28] text-white font-bold rounded-xl hover:bg-[#5aa823] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-[#69BE28]/30"
          >
            {joinLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </span>
            ) : (
              "Submit picks"
            )}
          </motion.button>
        </div>
      </div>
    </main>
  );
}
