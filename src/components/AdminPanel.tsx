"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface GameInfo {
  id: number;
  name: string;
  status: string;
  takenSquares: number;
  price_per_square: number;
  users?: Array<{
    name: string;
    squares_to_buy: number;
    selectedCount: number;
    picksSubmitted?: boolean;
  }>;
}

interface AdminPanelProps {
  gameCode: string;
  gameInfo: GameInfo;
  adminId: number;
  onGameStarted: () => void;
}

export default function AdminPanel({
  gameCode,
  gameInfo,
  adminId,
  onGameStarted,
}: AdminPanelProps) {
  const [showStartModal, setShowStartModal] = useState(false);
  const [starting, setStarting] = useState(false);

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${gameCode}`
      : "";

  const copyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
  };

  const handleStartGame = async () => {
    setStarting(true);
    try {
      const res = await fetch(`/api/games/${gameCode}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start");
      setShowStartModal(false);
      onGameStarted();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to start game");
    } finally {
      setStarting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border-2 border-slate-200 p-4 mb-4 shadow-lg"
    >
      <h2 className="font-bold mb-3 text-slate-800">Admin</h2>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-slate-500 mb-1 font-medium">Invite Link</p>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="flex-1 px-3 py-2 text-sm rounded-xl border-2 border-slate-200 bg-slate-50 truncate"
            />
            <motion.button
              onClick={copyLink}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 bg-[#013369] hover:bg-[#002244] text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Copy
            </motion.button>
          </div>
        </div>

        {gameInfo.users && gameInfo.users.length > 1 && (
          <div>
            <p className="text-xs text-slate-500 mb-1 font-medium">Players</p>
            <ul className="text-sm space-y-1">
              {gameInfo.users
                .filter((u) => u.selectedCount > 0)
                .map((u) => (
                  <li key={u.name} className="text-slate-700 flex items-center justify-between gap-2">
                    <span>
                      {u.name}: {u.selectedCount} square{u.selectedCount !== 1 ? "s" : ""}
                      {u.picksSubmitted ? " ✓" : ""}
                    </span>
                    <span className="font-semibold text-slate-900 shrink-0">
                      ${(u.selectedCount * gameInfo.price_per_square).toFixed(2)}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        )}

        {gameInfo.status === "pending" && (
          <motion.button
            onClick={() => setShowStartModal(true)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full py-3 bg-[#ffb81c] hover:bg-[#e5a618] text-slate-900 font-bold rounded-xl transition-colors shadow-md"
          >
            Start Game & Assign Numbers
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {showStartModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowStartModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-2 border-slate-200"
            >
              <h3 className="font-bold text-lg mb-2 text-slate-800">Start Game?</h3>
              <p className="text-slate-600 text-sm mb-4">
                This will randomly assign row and column numbers (0-9) and lock
                the grid. Players can no longer change their selections.
              </p>
              <div className="flex gap-2">
                <motion.button
                  onClick={() => setShowStartModal(false)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-2 border-2 border-slate-300 rounded-xl font-semibold text-slate-700"
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleStartGame}
                  disabled={starting}
                  whileHover={!starting ? { scale: 1.02 } : undefined}
                  whileTap={!starting ? { scale: 0.98 } : undefined}
                  className="flex-1 py-2 bg-[#ffb81c] hover:bg-[#e5a618] text-slate-900 font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {starting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-slate-700/30 border-t-slate-900 rounded-full animate-spin" />
                      Starting...
                    </span>
                  ) : (
                    "Start Game"
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
