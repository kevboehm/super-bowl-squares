"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const SQUARES = 100;
const DEFAULT_PCT = { q1: 20, q2: 20, q3: 20, final: 40 };

export default function CreateGameForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    adminName: "",
    pricePerSquare: "5",
    pctQ1: String(DEFAULT_PCT.q1),
    pctQ2: String(DEFAULT_PCT.q2),
    pctQ3: String(DEFAULT_PCT.q3),
    pctFinal: String(DEFAULT_PCT.final),
  });

  const totalPool = useMemo(() => {
    const price = parseFloat(form.pricePerSquare) || 0;
    return SQUARES * price;
  }, [form.pricePerSquare]);

  const pctQ1 = parseFloat(form.pctQ1) || 0;
  const pctQ2 = parseFloat(form.pctQ2) || 0;
  const pctQ3 = parseFloat(form.pctQ3) || 0;
  const pctFinal = parseFloat(form.pctFinal) || 0;

  const payouts = useMemo(() => {
    const sumPct = pctQ1 + pctQ2 + pctQ3 + pctFinal;
    const scale = sumPct > 0 ? Math.min(1, 100 / sumPct) : 1;
    const effectivePct = (p: number) => (p / 100) * scale;
    return {
      q1: Math.round(totalPool * effectivePct(pctQ1) * 100) / 100,
      q2: Math.round(totalPool * effectivePct(pctQ2) * 100) / 100,
      q3: Math.round(totalPool * effectivePct(pctQ3) * 100) / 100,
      final: Math.round(totalPool * effectivePct(pctFinal) * 100) / 100,
    };
  }, [totalPool, pctQ1, pctQ2, pctQ3, pctFinal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/games/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          adminName: form.adminName,
          pricePerSquare: parseFloat(form.pricePerSquare),
          payoutQ1: payouts.q1,
          payoutQ2: payouts.q2,
          payoutQ3: payouts.q3,
          payoutFinal: payouts.final,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create game");

      localStorage.setItem(
        `game-${data.code}`,
        JSON.stringify({
          userId: data.adminId,
          gameId: data.gameId,
          isAdmin: true,
          name: form.adminName,
        })
      );
      router.push(`/game/${data.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create game");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 max-w-md mx-auto"
    >
      {error && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg text-sm"
        >
          {error}
        </motion.div>
      )}

      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-200">Game Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Super Bowl 2026"
              className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-[#69BE28] focus:border-transparent transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-200">Your Name (Admin)</label>
            <input
              type="text"
              value={form.adminName}
              onChange={(e) => setForm((f) => ({ ...f, adminName: e.target.value }))}
              placeholder="Your name"
              className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-[#69BE28] focus:border-transparent transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-200">Price Per Square ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.pricePerSquare}
              onChange={(e) =>
                setForm((f) => ({ ...f, pricePerSquare: e.target.value }))
              }
              className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-[#69BE28] focus:border-transparent transition-all"
              required
            />
          </div>

          <div className="border-t border-white/20 pt-4">
            <h3 className="font-semibold mb-2 text-slate-200">Payout Schedule</h3>
            <p className="text-xs text-slate-400 mb-3">
              Total pool: {SQUARES} squares × ${form.pricePerSquare || "0"} = ${totalPool.toFixed(2)}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Q1 (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={form.pctQ1}
                  onChange={(e) => setForm((f) => ({ ...f, pctQ1: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-white"
                />
                <p className="text-xs text-[#69BE28] font-semibold mt-1">${payouts.q1.toFixed(2)}</p>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Halftime/Q2 (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={form.pctQ2}
                  onChange={(e) => setForm((f) => ({ ...f, pctQ2: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-white"
                />
                <p className="text-xs text-[#69BE28] font-semibold mt-1">${payouts.q2.toFixed(2)}</p>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Q3 (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={form.pctQ3}
                  onChange={(e) => setForm((f) => ({ ...f, pctQ3: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-white"
                />
                <p className="text-xs text-[#69BE28] font-semibold mt-1">${payouts.q3.toFixed(2)}</p>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Final (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={form.pctFinal}
                  onChange={(e) => setForm((f) => ({ ...f, pctFinal: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-white"
                />
                <p className="text-xs text-[#69BE28] font-semibold mt-1">${payouts.final.toFixed(2)}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Sum: ${(payouts.q1 + payouts.q2 + payouts.q3 + payouts.final).toFixed(2)} (max ${totalPool.toFixed(2)})
            </p>
          </div>
        </div>
      </div>

      <motion.button
        type="submit"
        disabled={loading}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-4 bg-[#69BE28] text-white font-bold rounded-xl hover:bg-[#5aa823] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-[#69BE28]/30"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Creating...
          </span>
        ) : (
          "Create Game"
        )}
      </motion.button>
    </motion.form>
  );
}
