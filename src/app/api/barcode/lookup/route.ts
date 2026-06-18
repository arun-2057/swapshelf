import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/serialize";

// GET /api/barcode/lookup?code=&type=
// type=BOOK   -> query Open Library
// type=BOARD_GAME -> no easy public API; return found:false
// ALWAYS returns JSON, never throws.
export const GET = withErrorHandler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const code = (searchParams.get("code") || "").trim();
  const type = (searchParams.get("type") || "BOOK").toUpperCase();

  if (!code) {
    return NextResponse.json({
      found: false,
      title: "",
      creator: "",
      imageUrl: "",
    });
  }

  if (type === "BOARD_GAME") {
    return NextResponse.json({
      found: false,
      title: "",
      creator: "",
      imageUrl: "",
    });
  }

  try {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(
      code
    )}&format=json&jscmd=data`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    let res: Response;
    try {
      res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      return NextResponse.json({
        found: false,
        title: "",
        creator: "",
        imageUrl: "",
      });
    }

    const json = (await res.json()) as Record<
      string,
      {
        title?: string;
        authors?: { name: string }[];
        cover?: { medium?: string; large?: string; small?: string };
      }
    >;

    const key = Object.keys(json)[0];
    if (!key) {
      return NextResponse.json({
        found: false,
        title: "",
        creator: "",
        imageUrl: "",
      });
    }

    const entry = json[key];
    const title = entry.title || "";
    const creator =
      entry.authors && entry.authors.length > 0
        ? entry.authors.map((a) => a.name).join(", ")
        : "";
    const imageUrl =
      entry.cover?.large || entry.cover?.medium || entry.cover?.small || "";

    if (!title) {
      return NextResponse.json({
        found: false,
        title: "",
        creator: "",
        imageUrl: "",
      });
    }

    return NextResponse.json({ found: true, title, creator, imageUrl });
  } catch {
    // Network / parse error — never throw out of this route.
    return NextResponse.json({
      found: false,
      title: "",
      creator: "",
      imageUrl: "",
    });
  }
});
