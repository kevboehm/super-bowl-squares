import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { adminId, row, col, assignToUserId } = body;

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
        { error: "Only admin can assign squares" },
        { status: 403 }
      );
    }

    if (game.status !== "pending") {
      return NextResponse.json(
        { error: "Game has started - no more changes" },
        { status: 400 }
      );
    }

    const targetUserId = assignToUserId == null || assignToUserId === "" ? null : Number(assignToUserId);
    if (targetUserId !== null) {
      const user = db
        .prepare("SELECT id FROM users WHERE id = ? AND game_id = ?")
        .get(targetUserId, game.id);
      if (!user) {
        return NextResponse.json(
          { error: "Invalid user to assign" },
          { status: 400 }
        );
      }
    }

    db.prepare(
      "UPDATE squares SET user_id = ? WHERE game_id = ? AND row_index = ? AND col_index = ?"
    ).run(targetUserId, game.id, row, col);

    try {
      const { getSocketServer } = await import("@/lib/socket-server-node");
      const io = getSocketServer();
      if (io) {
        io.to(code.toUpperCase()).emit("square-updated", {
          row,
          col,
          userId: targetUserId,
        });
      }
    } catch {
      // Socket server may not be available
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin assign square error:", error);
    return NextResponse.json(
      { error: "Failed to assign square" },
      { status: 500 }
    );
  }
}
