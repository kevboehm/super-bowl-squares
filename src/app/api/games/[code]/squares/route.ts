import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getTakenSquaresCount } from "@/lib/game";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const db = getDb();

    const game = db
      .prepare("SELECT id, numbers_assigned, row_numbers, col_numbers FROM games WHERE code = ?")
      .get(code.toUpperCase()) as {
      id: number;
      numbers_assigned: number;
      row_numbers: string | null;
      col_numbers: string | null;
    } | undefined;

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const squares = db
      .prepare(
        `SELECT s.row_index, s.col_index, s.user_id, s.winners, u.name as user_name 
         FROM squares s 
         LEFT JOIN users u ON s.user_id = u.id 
         WHERE s.game_id = ?
         ORDER BY s.row_index, s.col_index`
      )
      .all(game.id) as Array<{
      row_index: number;
      col_index: number;
      user_id: number | null;
      user_name: string | null;
      winners: string | null;
    }>;

    const grid: Record<
      string,
      { userId: number | null; userName: string | null; winners: string[] }
    > = {};
    squares.forEach((s) => {
      let winners: string[] = [];
      if (s.winners) {
        try {
          const parsed = JSON.parse(s.winners);
          winners = Array.isArray(parsed) ? parsed : [];
        } catch {
          winners = [];
        }
      }
      grid[`${s.row_index}-${s.col_index}`] = {
        userId: s.user_id,
        userName: s.user_name,
        winners,
      };
    });

    return NextResponse.json({
      grid,
      rowNumbers: game.row_numbers ? JSON.parse(game.row_numbers) : null,
      colNumbers: game.col_numbers ? JSON.parse(game.col_numbers) : null,
      numbersAssigned: game.numbers_assigned === 1,
    });
  } catch (error) {
    console.error("Get squares error:", error);
    return NextResponse.json(
      { error: "Failed to get squares" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { userId, action, row, col } = body;

    if (!userId || !action || row == null || col == null) {
      return NextResponse.json(
        { error: "userId, action, row, col are required" },
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
      .prepare("SELECT id, status FROM games WHERE code = ?")
      .get(code.toUpperCase()) as { id: number; status: string } | undefined;

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    if (game.status !== "pending") {
      return NextResponse.json(
        { error: "Game has started - no more selections" },
        { status: 400 }
      );
    }

    const user = db
      .prepare("SELECT squares_to_buy, picks_submitted FROM users WHERE id = ? AND game_id = ?")
      .get(userId, game.id) as { squares_to_buy: number; picks_submitted?: number } | undefined;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentSquare = db
      .prepare(
        "SELECT user_id FROM squares WHERE game_id = ? AND row_index = ? AND col_index = ?"
      )
      .get(game.id, row, col) as { user_id: number | null } | undefined;

    if (action === "select") {
      if (currentSquare?.user_id) {
        return NextResponse.json(
          { error: "Square already taken" },
          { status: 400 }
        );
      }

      const userSelectedCount = db
        .prepare(
          "SELECT COUNT(*) as count FROM squares WHERE game_id = ? AND user_id = ?"
        )
        .get(game.id, userId) as { count: number };

      const takenCount = getTakenSquaresCount(game.id);
      const available = 100 - takenCount;
      if (userSelectedCount.count >= available) {
        return NextResponse.json(
          { error: "No more squares available" },
          { status: 400 }
        );
      }

      db.prepare(
        "UPDATE squares SET user_id = ? WHERE game_id = ? AND row_index = ? AND col_index = ?"
      ).run(userId, game.id, row, col);

      // Update squares_to_buy when adding beyond initial amount (e.g. 10 → 11)
      const newCount = userSelectedCount.count + 1;
      if (newCount > user.squares_to_buy) {
        db.prepare("UPDATE users SET squares_to_buy = ? WHERE id = ? AND game_id = ?").run(
          newCount,
          userId,
          game.id
        );
      }
    } else if (action === "deselect") {
      if (currentSquare?.user_id !== userId) {
        return NextResponse.json(
          { error: "You can only deselect your own squares" },
          { status: 400 }
        );
      }

      const userSelectedCountForDeselect = db
        .prepare(
          "SELECT COUNT(*) as count FROM squares WHERE game_id = ? AND user_id = ?"
        )
        .get(game.id, userId) as { count: number };

      db.prepare(
        "UPDATE squares SET user_id = NULL WHERE game_id = ? AND row_index = ? AND col_index = ?"
      ).run(game.id, row, col);

      // Update squares_to_buy when removing (e.g. 10 → 9)
      const newCount = userSelectedCountForDeselect.count - 1;
      if (newCount >= 1 && newCount < user.squares_to_buy) {
        db.prepare("UPDATE users SET squares_to_buy = ? WHERE id = ? AND game_id = ?").run(
          newCount,
          userId,
          game.id
        );
      }
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Unlock picks so user must re-submit
    db.prepare("UPDATE users SET picks_submitted = 0 WHERE id = ? AND game_id = ?").run(
      userId,
      game.id
    );

    try {
      const { getSocketServer } = await import("@/lib/socket-server-node");
      const io = getSocketServer();
      if (io) {
        io.to(code.toUpperCase()).emit("square-updated", { row, col, userId: action === "select" ? userId : null });
      }
    } catch {
      // Socket server may not be available in dev without custom server
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Square action error:", error);
    return NextResponse.json(
      { error: "Failed to update square" },
      { status: 500 }
    );
  }
}
