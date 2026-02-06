"use client";

import { useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import SquareCell from "./SquareCell";
import TeamLogo from "./TeamLogo";

const ROW_TEAM = "Seahawks";
const COL_TEAM = "Patriots";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.01, delayChildren: 0.02 },
  },
};

interface GridProps {
  grid: Record<string, { userId: number | null; userName: string | null }>;
  rowNumbers: number[] | null;
  colNumbers: number[] | null;
  numbersAssigned: boolean;
  currentUserId: number | null;
  squaresToBuy: number;
  selectedCount: number;
  canSelect: boolean;
  onSelectSquare: (row: number, col: number) => void;
}

export default function Grid({
  grid,
  rowNumbers,
  colNumbers,
  numbersAssigned,
  currentUserId,
  squaresToBuy,
  selectedCount,
  canSelect,
  onSelectSquare,
}: GridProps) {
  const getSquare = useCallback(
    (row: number, col: number) => {
      return grid[`${row}-${col}`] ?? { userId: null, userName: null };
    },
    [grid]
  );

  const { displayRows, displayCols } = useMemo(() => {
    if (!rowNumbers || !colNumbers || !numbersAssigned) {
      return {
        displayRows: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        displayCols: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      };
    }
    const invertedRow: number[] = new Array(10);
    const invertedCol: number[] = new Array(10);
    for (let n = 0; n < 10; n++) {
      invertedRow[n] = rowNumbers.indexOf(n);
      invertedCol[n] = colNumbers.indexOf(n);
    }
    return { displayRows: invertedRow, displayCols: invertedCol };
  }, [rowNumbers, colNumbers, numbersAssigned]);

  const handleSquareClick = useCallback(
    (physicalRow: number, physicalCol: number) => {
      const sq = getSquare(physicalRow, physicalCol);
      if (sq.userId === currentUserId) {
        onSelectSquare(physicalRow, physicalCol);
        return;
      }
      if (!sq.userId && selectedCount < squaresToBuy && canSelect) {
        onSelectSquare(physicalRow, physicalCol);
      }
    },
    [getSquare, currentUserId, selectedCount, squaresToBuy, canSelect, onSelectSquare]
  );

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="w-full mx-auto"
    >
      <div className="bg-white rounded-2xl shadow-lg ring-1 ring-slate-200/80 p-2 sm:p-3">

        {/* Seahawks across the top — logo + name centered */}
        <div className="flex items-center justify-center gap-2.5 pb-2">
          <TeamLogo team="seahawks" size="md" animate={false} />
          <span
            className="text-xl sm:text-2xl font-extrabold text-[#002244] uppercase tracking-wide"
            style={{ fontFamily: "var(--font-bebas), system-ui, sans-serif" }}
          >
            {ROW_TEAM}
          </span>
        </div>

        {/* Main layout: Patriots label on left + column headers & grid */}
        <div className="flex">

          {/* Patriots vertical label + logo */}
          <div className="flex flex-col items-center justify-center w-7 sm:w-9 shrink-0 mr-0.5 gap-1.5">
            <TeamLogo team="patriots" size="sm" animate={false} />
            <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
              <span
                className="text-xl sm:text-2xl font-extrabold text-[#002244] uppercase tracking-wide"
                style={{ fontFamily: "var(--font-bebas), system-ui, sans-serif" }}
              >
                {COL_TEAM}
              </span>
            </div>
          </div>

          {/* Column headers + Row headers + Grid */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <div
              className="grid w-full min-w-0"
              style={{
                gridTemplateColumns: "minmax(0, auto) repeat(10, minmax(0, 1fr))",
                gap: "2px",
              }}
            >
              {/* Top-left corner: empty */}
              <div />

              {/* Column number headers — Seahawks themed */}
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={`col-${i}`}
                  className="flex items-center justify-center aspect-[1.4] rounded-md text-[11px] sm:text-xs font-bold tabular-nums"
                  style={{
                    backgroundColor: numbersAssigned ? "#002244" : "#e2e8f0",
                    color: numbersAssigned ? "#69BE28" : "#94a3b8",
                    border: numbersAssigned ? "2px solid #69BE28" : "1px solid #cbd5e1",
                  }}
                >
                  {numbersAssigned ? i : ""}
                </div>
              ))}

              {/* Data rows: row header + 10 cells each */}
              {Array.from({ length: 10 }, (_, displayRow) => (
                <div key={displayRow} className="contents">
                  {/* Row number header — Patriots themed */}
                  <div
                    className="flex items-center justify-center aspect-[0.7] rounded-md text-[11px] sm:text-xs font-bold tabular-nums"
                    style={{
                      backgroundColor: numbersAssigned ? "#C60C30" : "#e2e8f0",
                      color: numbersAssigned ? "#ffffff" : "#94a3b8",
                      border: numbersAssigned ? "2px solid #002244" : "1px solid #cbd5e1",
                    }}
                  >
                    {numbersAssigned ? displayRow : ""}
                  </div>

                  {/* Cells */}
                  {Array.from({ length: 10 }, (_, displayCol) => {
                    const physicalRow = displayRows[displayRow];
                    const physicalCol = displayCols[displayCol];
                    const sq = getSquare(physicalRow, physicalCol);
                    return (
                      <SquareCell
                        key={displayCol}
                        row={physicalRow}
                        col={physicalCol}
                        userId={sq.userId}
                        userName={sq.userName}
                        isCurrentUser={sq.userId === currentUserId}
                        canSelect={canSelect}
                        onSelect={() => handleSquareClick(physicalRow, physicalCol)}
                        index={displayRow * 10 + displayCol}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
