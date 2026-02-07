import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

const VALID_QUARTERS = ["Q1", "Q2", "Q3", "Final"] as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { adminId, row, col, quarters } = body;

    if (!adminId || row == null || col == null) {
      return NextResponse.json(
        { error: "adminId, row, and col are required" },
        { status: 400 }
      );
    }

    if (row < 0 || row > 9 || col < 0 || col > 9) {
      return NextResponse.json(
        { error: "Invalid row or column" },
        { status: 400 }
      );
    }

    const quartersArray = Array.isArray(quarters) ? quarters : [];
    const validQuarters = quartersArray.filter((q: string) =>
      VALID_QUARTERS.includes(q as (typeof VALID_QUARTERS)[number])
    );

    const db = getDb();
    const game = db
      .prepare("SELECT id, status, admin_id FROM games WHERE code = ?")
      .get(code.toUpperCase()) as {
      id: number;
      status: string;
      admin_id: number | null;
    } | undefined;

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    if (game.admin_id !== adminId) {
      return NextResponse.json(
        { error: "Only admin can set winners" },
        { status: 403 }
      );
    }

    if (game.status !== "started" && game.status !== "completed") {
      return NextResponse.json(
        { error: "Game must be started to mark winners" },
        { status: 400 }
      );
    }

    const winnersJson = JSON.stringify(validQuarters);
    db.prepare(
      "UPDATE squares SET winners = ? WHERE game_id = ? AND row_index = ? AND col_index = ?"
    ).run(winnersJson, game.id, row, col);

    try {
      const { getSocketServer } = await import("@/lib/socket-server-node");
      const io = getSocketServer();
      if (io) {
        io.to(code.toUpperCase()).emit("winner-updated", {
          row,
          col,
          winners: validQuarters,
        });
      }
    } catch {
      // Socket server may not be available
    }

    return NextResponse.json({ success: true, winners: validQuarters });
  } catch (error) {
    console.error("Admin set winner error:", error);
    return NextResponse.json(
      { error: "Failed to set winner" },
      { status: 500 }
    );
  }
}
