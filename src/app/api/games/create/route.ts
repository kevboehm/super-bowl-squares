import { NextRequest, NextResponse } from "next/server";
import { getDb, createGameSquares } from "@/lib/db";
import { generateGameCode } from "@/lib/game";
import { normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      pricePerSquare,
      payoutQ1,
      payoutQ2,
      payoutQ3,
      payoutFinal,
      adminName,
      adminPhone,
    } = body;

    if (!adminPhone || typeof adminPhone !== "string" || !adminPhone.trim().replace(/\D/g, "")) {
      return NextResponse.json(
        { error: "Valid admin phone number is required" },
        { status: 400 }
      );
    }

    const normalizedAdminPhone = normalizePhone(adminPhone.trim());

    if (
      !name ||
      pricePerSquare == null ||
      payoutQ1 == null ||
      payoutQ2 == null ||
      payoutQ3 == null ||
      payoutFinal == null ||
      !adminName
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const price = parseFloat(pricePerSquare);
    const p1 = parseFloat(payoutQ1);
    const p2 = parseFloat(payoutQ2);
    const p3 = parseFloat(payoutQ3);
    const pf = parseFloat(payoutFinal);

    if (price < 0 || p1 < 0 || p2 < 0 || p3 < 0 || pf < 0) {
      return NextResponse.json(
        { error: "Values must be non-negative" },
        { status: 400 }
      );
    }

    const db = getDb();
    const code = generateGameCode();

    const insertGame = db.prepare(`
      INSERT INTO games (code, name, price_per_square, payout_q1, payout_q2, payout_q3, payout_final)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertGame.run(
      code,
      String(name),
      price,
      p1,
      p2,
      p3,
      pf
    );
    const gameId = (result as { lastInsertRowid: number }).lastInsertRowid;

    const insertUser = db.prepare(`
      INSERT INTO users (name, game_id, is_admin, squares_to_buy, phone)
      VALUES (?, ?, 1, 0, ?)
    `);
    const userResult = insertUser.run(String(adminName), gameId, normalizedAdminPhone);
    const adminId = (userResult as { lastInsertRowid: number }).lastInsertRowid;

    db.prepare("UPDATE games SET admin_id = ? WHERE id = ?").run(adminId, gameId);

    createGameSquares(gameId);

    return NextResponse.json({
      gameId,
      code,
      adminId,
      message: "Game created successfully",
    });
  } catch (error) {
    console.error("Create game error:", error);
    return NextResponse.json(
      { error: "Failed to create game" },
      { status: 500 }
    );
  }
}
