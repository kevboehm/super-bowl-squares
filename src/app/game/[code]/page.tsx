"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Grid from "@/components/Grid";
import PayoutDisplay from "@/components/PayoutDisplay";
import AdminPanel from "@/components/AdminPanel";
import AdminAssignModal from "@/components/AdminAssignModal";
import AdminWinnerModal from "@/components/AdminWinnerModal";
import { useGameSocket } from "@/hooks/useGameSocket";
import Link from "next/link";

type GameInfo = {
  id: number;
  code: string;
  name: string;
  price_per_square: number;
  payout_q1: number;
  payout_q2: number;
  payout_q3: number;
  payout_final: number;
  status: string;
  takenSquares: number;
  numbers_assigned: number;
  row_numbers: string | null;
  col_numbers: string | null;
  users?: Array<{
    id: number;
    name: string;
    squares_to_buy: number;
    selectedCount: number;
    picksSubmitted?: boolean;
    is_admin?: number;
  }>;
};

type Session = {
  userId: number;
  gameId: number;
  isAdmin: boolean;
  name: string;
  squaresToBuy?: number;
};

export default function GamePage() {
  const params = useParams();
  const code = (params.code as string)?.toUpperCase();
  const [session, setSession] = useState<Session | null>(null);
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [grid, setGrid] = useState<
    Record<string, { userId: number | null; userName: string | null; winners?: string[] }>
  >({});
  const [rowNumbers, setRowNumbers] = useState<number[] | null>(null);
  const [colNumbers, setColNumbers] = useState<number[] | null>(null);
  const [numbersAssigned, setNumbersAssigned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loginPhone, setLoginPhone] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [selectedCellForAdmin, setSelectedCellForAdmin] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [selectedCellForWinner, setSelectedCellForWinner] = useState<{
    row: number;
    col: number;
  } | null>(null);

  const fetchSquares = useCallback(async () => {
    if (!code) return;
    const res = await fetch(`/api/games/${code}/squares`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setGrid(data.grid);
    setRowNumbers(data.rowNumbers);
    setColNumbers(data.colNumbers);
    setNumbersAssigned(data.numbersAssigned);
  }, [code]);

  const fetchGameInfo = useCallback(async () => {
    if (!code) return;
    const res = await fetch(`/api/games/${code}/info`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setGameInfo(data);
  }, [code]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchGameInfo(), fetchSquares()]);
  }, [fetchGameInfo, fetchSquares]);

  useEffect(() => {
    if (!code) return;
    const stored = localStorage.getItem(`game-${code}`);
    if (!stored) {
      setLoading(false);
      return;
    }
    try {
      setSession(JSON.parse(stored));
    } catch {
      setError("Invalid session");
      setLoading(false);
      return;
    }
    refresh().catch(() => setError("Failed to load game")).finally(() => setLoading(false));
  }, [code, refresh]);

  useGameSocket(code, refresh);

  useEffect(() => {
    if (!code || loading) return;
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [code, loading, refresh]);

  const handleSelectSquare = async (row: number, col: number) => {
    if (!session || !code) return;
    const sq = grid[`${row}-${col}`];
    const action = sq?.userId === session.userId ? "deselect" : "select";
    const res = await fetch(`/api/games/${code}/squares`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: session.userId, action, row, col }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to update square");
      return;
    }
    setError("");
    await fetchSquares();
    await fetchGameInfo();
  };

  const handleGameStarted = () => {
    fetchSquares();
    fetchGameInfo();
  };

  const handleAdminCellClick = useCallback((row: number, col: number) => {
    setSelectedCellForAdmin({ row, col });
  }, []);

  const handleAdminWinnerCellClick = useCallback((row: number, col: number) => {
    setSelectedCellForWinner({ row, col });
  }, []);

  const handleAdminAssign = useCallback(
    async (assignToUserId: number | null) => {
      if (!selectedCellForAdmin || !session || !code) return;
      const res = await fetch(`/api/games/${code}/admin/assign-square`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: session.userId,
          row: selectedCellForAdmin.row,
          col: selectedCellForAdmin.col,
          assignToUserId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign");
      setError("");
      await fetchSquares();
      await fetchGameInfo();
    },
    [selectedCellForAdmin, session, code, fetchSquares, fetchGameInfo]
  );

  const handleAdminSetWinners = useCallback(
    async (quarters: string[]) => {
      if (!selectedCellForWinner || !session || !code) return;
      const res = await fetch(`/api/games/${code}/admin/set-winner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: session.userId,
          row: selectedCellForWinner.row,
          col: selectedCellForWinner.col,
          quarters,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to set winners");
      setError("");
      await fetchSquares();
    },
    [selectedCellForWinner, session, code, fetchSquares]
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPhone.trim() || !code) return;
    setLoginLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/games/${code}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: loginPhone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      const newSession: Session = {
        userId: data.userId,
        gameId: data.gameId,
        isAdmin: data.isAdmin,
        name: data.name,
        squaresToBuy: data.squaresToBuy,
      };
      localStorage.setItem(`game-${code}`, JSON.stringify(newSession));
      setSession(newSession);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoginLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-[#013369] p-4 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#69BE28]/30 border-t-[#69BE28] rounded-full animate-spin" />
        <p className="text-slate-300 mt-4">Loading game...</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-[#013369] p-4 flex flex-col items-center justify-center">
        <div className="max-w-sm w-full space-y-4">
          <h2 className="text-xl font-bold text-white text-center" style={{ fontFamily: "var(--font-bebas), system-ui, sans-serif" }}>
            Log back in
          </h2>
          <p className="text-slate-300 text-sm text-center">
            Enter the phone number you used when joining or creating the game.
          </p>
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-2 rounded-xl text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="tel"
              value={loginPhone}
              onChange={(e) => setLoginPhone(e.target.value)}
              placeholder="555-123-4567"
              className="w-full px-4 py-3 rounded-xl border-2 border-white/20 bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-[#69BE28] focus:border-transparent"
            />
            <button
              type="submit"
              disabled={loginLoading || !loginPhone.trim()}
              className="w-full py-4 bg-[#69BE28] text-white font-bold rounded-xl hover:bg-[#5aa823] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loginLoading ? "Logging in..." : "Log in"}
            </button>
          </form>
          <Link
            href={`/join/${code}`}
            className="block text-center text-[#69BE28] font-semibold underline underline-offset-2 text-sm"
          >
            Join as new player
          </Link>
        </div>
      </main>
    );
  }

  if (!session || !gameInfo) return null;

  const selectedCount =
    Object.values(grid).filter((s) => s.userId === session.userId).length;
  const currentUser = gameInfo.users?.find((u) => u.id === session.userId);
  const squaresToBuy = currentUser?.squares_to_buy ?? session.squaresToBuy ?? 0;
  const picksSubmitted = currentUser?.picksSubmitted ?? false;
  const canSelect =
    gameInfo.status === "pending" &&
    !session.isAdmin &&
    selectedCount < Math.max(squaresToBuy, selectedCount + 1);

  const handleSubmitPicks = async () => {
    if (!session || !code || selectedCount !== squaresToBuy) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/games/${code}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit picks");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-2 sm:px-4 pb-8 max-w-2xl mx-auto">
      <header className="mb-4">
        <h1
          className="text-2xl font-bold text-slate-900"
          style={{ fontFamily: "var(--font-bebas), system-ui, sans-serif" }}
        >
          {gameInfo.name}
        </h1>
        <p className="text-sm text-slate-600">
          {gameInfo.takenSquares}/100 squares • ${gameInfo.price_per_square.toFixed(2)}/square
        </p>
      </header>

      <PayoutDisplay
        payoutQ1={gameInfo.payout_q1}
        payoutQ2={gameInfo.payout_q2}
        payoutQ3={gameInfo.payout_q3}
        payoutFinal={gameInfo.payout_final}
      />

      {gameInfo.status === "pending" && !numbersAssigned && (
        <p className="text-sm text-slate-600 text-center py-2 px-4 bg-slate-100 rounded-lg my-3">
          Row and column numbers will be assigned once all players submit their picks.
        </p>
      )}

      {session.isAdmin && (
        <AdminPanel
          gameCode={code}
          gameInfo={gameInfo}
          adminId={session.userId}
          onGameStarted={handleGameStarted}
        />
      )}

      {!session.isAdmin && gameInfo.status === "pending" && (
        <div className="my-2 space-y-2">
          {picksSubmitted ? (
            <p className="text-sm text-center font-medium text-slate-600">
              Picks submitted ✓ — tap a square to change your picks
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between py-2 px-4 bg-slate-100 rounded-xl">
                <span className="text-sm font-medium text-slate-700">
                  {selectedCount} square{selectedCount !== 1 ? "s" : ""} × $
                  {gameInfo.price_per_square.toFixed(2)}
                </span>
                <span className="text-lg font-bold text-[#69BE28]">
                  ${(selectedCount * gameInfo.price_per_square).toFixed(2)}
                </span>
              </div>
              {selectedCount === squaresToBuy && (
                <button
                  type="button"
                  onClick={handleSubmitPicks}
                  disabled={submitting}
                  className="w-full py-3 bg-[#69BE28] hover:bg-[#5aa823] text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    "Submit picks"
                  )}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-700 px-4 py-2 rounded-xl text-sm my-2">
          {error}
        </div>
      )}

      <div className="mt-6">
        {session.isAdmin && gameInfo.status === "pending" && (
          <p className="text-sm text-slate-500 mb-2">
            Tap a square to assign or reassign it to a player.
          </p>
        )}
        {session.isAdmin &&
          (gameInfo.status === "started" || gameInfo.status === "completed") && (
          <p className="text-sm text-slate-500 mb-2">
            Tap a square to mark it as winner for Q1, Q2, Q3, or Final.
          </p>
        )}
        <Grid
          grid={grid}
          rowNumbers={rowNumbers}
          colNumbers={colNumbers}
          numbersAssigned={numbersAssigned}
          currentUserId={session.userId}
          squaresToBuy={Math.min(100, Math.max(squaresToBuy, selectedCount + 1))}
          selectedCount={selectedCount}
          canSelect={canSelect}
          onSelectSquare={handleSelectSquare}
          isAdminEditMode={session.isAdmin && gameInfo.status === "pending"}
          onAdminCellClick={
            session.isAdmin && gameInfo.status === "pending"
              ? handleAdminCellClick
              : undefined
          }
          isAdminWinnerMode={
            session.isAdmin &&
            (gameInfo.status === "started" || gameInfo.status === "completed")
          }
          onAdminWinnerCellClick={
            session.isAdmin &&
            (gameInfo.status === "started" || gameInfo.status === "completed")
              ? handleAdminWinnerCellClick
              : undefined
          }
          gameStarted={
            gameInfo.status === "started" || gameInfo.status === "completed"
          }
        />
      </div>

      {selectedCellForAdmin && (
        <AdminAssignModal
          row={selectedCellForAdmin.row}
          col={selectedCellForAdmin.col}
          currentOwner={
            grid[`${selectedCellForAdmin.row}-${selectedCellForAdmin.col}`]?.userName ?? null
          }
          players={gameInfo.users ?? []}
          onAssign={handleAdminAssign}
          onClose={() => setSelectedCellForAdmin(null)}
        />
      )}

      {selectedCellForWinner && (
        <AdminWinnerModal
          row={selectedCellForWinner.row}
          col={selectedCellForWinner.col}
          currentWinners={
            grid[`${selectedCellForWinner.row}-${selectedCellForWinner.col}`]?.winners ?? []
          }
          onSetWinners={handleAdminSetWinners}
          onClose={() => setSelectedCellForWinner(null)}
        />
      )}
    </main>
  );
}
