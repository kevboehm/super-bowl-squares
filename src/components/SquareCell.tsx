"use client";

import { motion } from "framer-motion";

interface SquareCellProps {
  row: number;
  col: number;
  userId: number | null;
  userName: string | null;
  isCurrentUser: boolean;
  canSelect: boolean;
  onSelect: () => void;
  index?: number;
}

function getInitials(name: string | null): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function SquareCell({
  userId,
  userName,
  isCurrentUser,
  canSelect,
  onSelect,
  index = 0,
}: SquareCellProps) {
  const isAvailable = !userId;
  const isTakenByOther = userId && !isCurrentUser;

  let cellStyle = "bg-slate-50 border-slate-200";
  if (isCurrentUser) {
    cellStyle = "bg-[#69BE28] text-white border-[#5aa823]";
  } else if (isTakenByOther) {
    cellStyle = "bg-slate-100 text-slate-500 border-slate-200";
  } else if (canSelect) {
    cellStyle =
      "bg-white border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 active:bg-emerald-100";
  }

  const canInteract = (canSelect && isAvailable) || isCurrentUser;

  return (
    <div className="relative group">
      <motion.button
        type="button"
        onClick={canInteract ? onSelect : undefined}
        disabled={!canInteract}
        title={isTakenByOther && userName ? userName : undefined}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.005, duration: 0.15 }}
        whileTap={canInteract ? { scale: 0.94 } : undefined}
        className={`
          w-full aspect-square
          rounded-lg border
          flex flex-col items-center justify-center
          text-[9px] sm:text-[11px] font-semibold leading-tight
          touch-manipulation select-none
          transition-colors duration-100
          ${cellStyle}
          ${canInteract ? "cursor-pointer active:shadow-inner" : "cursor-default"}
          ${isTakenByOther ? "cursor-help" : ""}
        `}
      >
        {userName ? (
          <span className="truncate max-w-full px-px leading-none mt-px">
            {getInitials(userName)}
          </span>
        ) : null}
      </motion.button>

      {/* Tooltip on hover (desktop) */}
      {isTakenByOther && userName && (
        <div className="absolute z-20 px-2 py-1 text-[11px] font-medium text-white bg-slate-800 rounded-md shadow-lg whitespace-nowrap -top-8 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          {userName}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
        </div>
      )}
    </div>
  );
}
