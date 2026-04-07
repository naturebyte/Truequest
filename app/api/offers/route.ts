import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

type OfferType = "HR" | "DIGITAL_MARKETING";

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseOfferType(value: unknown): OfferType | null {
  const normalized = normalizeString(value).toUpperCase();

  if (normalized === "HR" || normalized === "DIGITAL_MARKETING") {
    return normalized;
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const name = normalizeString(body.name);
    const phoneNumber = normalizeString(body.phoneNumber);
    const offerType = parseOfferType(body.offerType);

    if (!name || !phoneNumber || !offerType) {
      return NextResponse.json(
        { error: "Name, phone number, and offer type are required." },
        { status: 400 },
      );
    }

    await sql`
      CREATE TABLE IF NOT EXISTS offer_enquiries (
        id serial PRIMARY KEY,
        name text NOT NULL,
        phone_number text NOT NULL,
        offer_type text NOT NULL,
        created_at timestamptz DEFAULT now()
      )
    `;

    await sql`
      INSERT INTO offer_enquiries (name, phone_number, offer_type)
      VALUES (${name}, ${phoneNumber}, ${offerType})
    `;

    return NextResponse.json({ status: "saved" }, { status: 200 });
  } catch (error) {
    console.error("Error handling offers POST:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 },
    );
  }
}
