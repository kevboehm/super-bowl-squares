"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const QUARTERS = ["Q1", "Q2", "Q3", "Final"] as const;

interface AdminWinnerModalProps {
  row: number;
  col: number;
  currentWinners: string[];
  onSetWinners: (quarters: string[]) => Promise<void>;
  onClose: () => void;
}

export default function AdminWinnerModal({
  row,
  col,
  currentWinners,
  onSetWinners,
  onClose,
}: AdminWinnerModalProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(currentWinners)
  );
  const [loading, setLoading] = useState(false);

  const toggle = (q: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(q)) next.delete(q);
      else next.add(q);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSetWinners(Array.from(selected));
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
              Mark winners
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Row {row}, Column {col}
              {currentWinners.length > 0 && (
                <span className="text-slate-600">
                  {" "}
                  · Current: {currentWinners.join(", ")}
                </span>
              )}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 pb-6">
            <p className="text-sm font-medium text-slate-700 mb-3">
              Select quarters this square wins:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {QUARTERS.map((q) => (
                <label
                  key={q}
                  className={`
                    flex items-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all
                    ${
                      selected.has(q)
                        ? "border-[#69BE28] bg-[#69BE28]/10 text-[#002244]"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(q)}
                    onChange={() => toggle(q)}
                    className="sr-only"
                  />
                  <span className="flex-1 font-semibold">{q}</span>
                  {selected.has(q) && (
                    <span className="text-[#69BE28] text-lg">✓</span>
                  )}
                </label>
              ))}
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
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-[#013369] hover:bg-[#002244] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
