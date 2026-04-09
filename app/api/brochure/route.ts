import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";

const BROCHURE_MAP: Record<string, string> = {
  HR: "TrueQuest HR.pdf",
  DIGITAL_MARKETING: "TrueQuest DM.pdf",
};

export async function GET(request: NextRequest) {
  const offer = request.nextUrl.searchParams.get("offer");
  const brochureName = offer ? BROCHURE_MAP[offer] : null;

  if (!brochureName) {
    return NextResponse.json({ error: "Invalid brochure offer." }, { status: 400 });
  }

  try {
    const brochurePath = join(process.cwd(), "public", "broshures", brochureName);
    const fileBuffer = await readFile(brochurePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${brochureName}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Brochure not found." }, { status: 404 });
  }
}
