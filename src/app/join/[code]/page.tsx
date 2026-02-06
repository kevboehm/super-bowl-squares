"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import QuantitySelector from "@/components/QuantitySelector";
import Link from "next/link";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"name" | "quantity">("name");
  const [name, setName] = useState("");

  useEffect(() => {
    if (!code) return;
    fetch(`/api/games/${code}/info`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setGame(null);
        } else {
          setGame(data);
          if (data.status !== "pending") {
            setError("This game has already started");
          }
        }
      })
      .catch(() => setError("Failed to load game"))
      .finally(() => setLoading(false));
  }, [code]);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) setStep("quantity");
  };

  const doJoin = async (squaresToBuy: number) => {
    const res = await fetch(`/api/games/${code}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        squaresToBuy,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to join");

    localStorage.setItem(
      `game-${code}`,
      JSON.stringify({
        userId: data.userId,
        gameId: data.gameId,
        isAdmin: false,
        name: name.trim(),
        squaresToBuy,
      })
    );
    router.push(`/game/${code}`);
  };

  const handleJoinComplete = async (squaresToBuy: number) => {
    try {
      setError("");
      await doJoin(squaresToBuy);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-[#013369] p-4 pb-8">
      <div className="max-w-md mx-auto">
        <h1
          className="text-2xl font-bold text-center mb-2 text-white"
          style={{ fontFamily: "var(--font-bebas), system-ui, sans-serif" }}
        >
          {game.name}
        </h1>
        <p className="text-center text-slate-300 mb-6">
          ${game.price_per_square.toFixed(2)} per square • {game.availableSquares}{" "}
          squares available
        </p>

        {step === "name" ? (
          <form onSubmit={handleNameSubmit} className="space-y-4">
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
                required
              />
            </div>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 bg-[#69BE28] text-white font-bold rounded-xl hover:bg-[#5aa823] transition-colors shadow-lg"
            >
              Continue
            </motion.button>
          </form>
        ) : (
          <>
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-2 rounded-xl text-sm mb-4">
                {error}
              </div>
            )}
            <QuantitySelector
              pricePerSquare={game.price_per_square}
              maxSquares={Math.min(100, game.availableSquares)}
              onContinue={handleJoinComplete}
            />
          </>
        )}
      </div>
    </main>
  );
}
