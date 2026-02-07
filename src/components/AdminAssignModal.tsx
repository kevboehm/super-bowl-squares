"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Player {
  id: number;
  name: string;
  squares_to_buy: number;
  selectedCount: number;
  is_admin?: number;
}

interface AdminAssignModalProps {
  row: number;
  col: number;
  currentOwner: string | null;
  players: Player[];
  onAssign: (assignToUserId: number | null) => Promise<void>;
  onClose: () => void;
}

export default function AdminAssignModal({
  row,
  col,
  currentOwner,
  players,
  onAssign,
  onClose,
}: AdminAssignModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const playersWithSquares = players.filter((p) => p.squares_to_buy > 0 && p.is_admin !== 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const assignTo = selectedUserId === "clear" ? null : Number(selectedUserId);
      await onAssign(assignTo);
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-sm w-full overflow-hidden"
        >
          <div className="px-6 pt-6 pb-2">
            <h3 className="text-lg font-semibold text-slate-900">
              Assign square
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Row {row}, Column {col}
              {currentOwner && (
                <span className="text-slate-600"> · Currently: {currentOwner}</span>
              )}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 pb-6">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Assign to
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-800 focus:border-[#013369] focus:ring-2 focus:ring-[#013369]/20 outline-none transition-all"
              >
                <option value="">Select player...</option>
                <option value="clear">Clear (make available)</option>
                {playersWithSquares.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.selectedCount}/{p.squares_to_buy})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedUserId}
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-[#013369] hover:bg-[#002244] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Saving..." : "Assign"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
