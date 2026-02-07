import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { phone } = body;

    if (!phone || typeof phone !== "string" || !phone.trim().replace(/\D/g, "")) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(phone.trim());

    const db = getDb();
    const game = db
      .prepare("SELECT id FROM games WHERE code = ?")
      .get(code.toUpperCase()) as { id: number } | undefined;

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const user = db
      .prepare(
        "SELECT id, name, is_admin, squares_to_buy FROM users WHERE game_id = ? AND phone = ?"
      )
      .get(game.id, normalizedPhone) as
      | { id: number; name: string; is_admin: number; squares_to_buy: number }
      | undefined;

    if (!user) {
      return NextResponse.json(
        { error: "No account found for this phone number in this game" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      userId: user.id,
      gameId: game.id,
      isAdmin: user.is_admin === 1,
      name: user.name,
      squaresToBuy: user.squares_to_buy,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
