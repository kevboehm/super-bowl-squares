"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface QuantitySelectorProps {
  pricePerSquare: number;
  maxSquares: number;
  onContinue?: (quantity: number) => Promise<void>;
  /** Embedded mode: controlled quantity, no continue button */
  value?: number;
  onChange?: (quantity: number) => void;
  embedded?: boolean;
}

export default function QuantitySelector({
  pricePerSquare,
  maxSquares,
  onContinue,
  value: controlledValue,
  onChange,
  embedded = false,
}: QuantitySelectorProps) {
  const [internalQuantity, setInternalQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const quantity = embedded && controlledValue != null ? controlledValue : internalQuantity;
  const setQuantity = (v: number | ((q: number) => number)) => {
    const next = typeof v === "function" ? v(quantity) : v;
    const clamped = Math.max(1, Math.min(maxSquares, next));
    if (embedded && onChange) {
      onChange(clamped);
    } else {
      setInternalQuantity(clamped);
    }
  };

  const total = quantity * pricePerSquare;

  const handleContinue = async () => {
    if (!onContinue) return;
    setLoading(true);
    try {
      await onContinue(quantity);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div
        className={`rounded-2xl border-2 p-6 shadow-lg ${
          embedded
            ? "bg-white/10 border-white/20"
            : "bg-white border-slate-200"
        }`}
      >
        <p
          className={`text-sm mb-4 font-medium ${
            embedded ? "text-slate-200" : "text-slate-600"
          }`}
        >
          How many squares do you want to buy?
        </p>
        <div className="flex items-center justify-center gap-4 mb-4">
          <motion.button
            type="button"
            onClick={() => setQuantity((q) => q - 1)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-14 h-14 rounded-full bg-[#013369] hover:bg-[#002244] text-white font-bold text-2xl flex items-center justify-center transition-colors shadow-md"
            aria-label="Decrease"
          >
            −
          </motion.button>
          <motion.span
            key={quantity}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className={`text-5xl font-bold w-20 text-center ${
              embedded ? "text-white" : "text-slate-800"
            }`}
            style={{ fontFamily: "var(--font-bebas), system-ui, sans-serif" }}
          >
            {quantity}
          </motion.span>
          <motion.button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-14 h-14 rounded-full bg-[#013369] hover:bg-[#002244] text-white font-bold text-2xl flex items-center justify-center transition-colors shadow-md"
            aria-label="Increase"
          >
            +
          </motion.button>
        </div>
        <input
          type="range"
          min={1}
          max={maxSquares}
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
          className="w-full accent-[#69BE28] h-3"
        />
        <p className={`text-center text-sm mt-2 ${embedded ? "text-slate-400" : "text-slate-500"}`}>
          Max: {maxSquares} squares
        </p>
      </div>

      <div
        className={`rounded-xl p-4 text-center border-2 ${
          embedded
            ? "bg-[#69BE28]/20 border-[#69BE28]/30"
            : "bg-[#69BE28]/20 border-[#69BE28]/30"
        }`}
      >
        <p className={`text-lg font-medium ${embedded ? "text-slate-200" : "text-slate-800"}`}>
          {quantity} squares × ${pricePerSquare.toFixed(2)} ={" "}
          <span className="text-[#69BE28] font-bold text-xl">${total.toFixed(2)}</span>
        </p>
      </div>

      {!embedded && onContinue && (
        <motion.button
          onClick={handleContinue}
          disabled={loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-4 bg-[#69BE28] text-white font-bold rounded-xl hover:bg-[#5aa823] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-[#69BE28]/30"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Joining...
            </span>
          ) : (
            "Continue to Select Squares"
          )}
        </motion.button>
      )}
    </motion.div>
  );
}
