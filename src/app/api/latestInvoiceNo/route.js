import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");

  if (!user_id) {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }

  try {
    // Call the procedure
    const [rows] = await db.query("CALL GetLatestInvoiceNo(?)", [user_id]);

    // The result is in rows[0]
    console.log("Latest invoice rows:", rows);
    const latestInvoice = rows[0][0]?.latest_invoice ?? 1;
    console.log("Latest invoice number:", latestInvoice);
    return NextResponse.json({ latestInvoice });
  } catch (err) {
    console.warn(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
