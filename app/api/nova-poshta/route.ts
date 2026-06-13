import { NextResponse } from "next/server";

// Server-side proxy to the Nova Poshta API.
// Browser → /api/nova-poshta → api.novaposhta.ua
//
// Why a proxy:
// 1. NP blocks direct browser fetches (CORS / Cloudflare anti-bot returns 401).
// 2. Keeps the API key on the server — never leaves the bundle.

const NP_URL = "https://api.novaposhta.ua/v2.0/json/";

export async function POST(req: Request) {
  const apiKey =
    process.env.NOVA_POSHTA_API_KEY ||
    process.env.NEXT_PUBLIC_NOVA_POSHTA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        errors: ["NOVA_POSHTA_API_KEY is not configured on the server"],
        data: [],
        warnings: [],
        info: [],
      },
      { status: 200 }
    );
  }

  let body: { modelName?: string; calledMethod?: string; methodProperties?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { modelName, calledMethod, methodProperties } = body;
  if (!modelName || !calledMethod) {
    return NextResponse.json(
      { error: "modelName and calledMethod are required" },
      { status: 400 }
    );
  }

  try {
    const npRes = await fetch(NP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey,
        modelName,
        calledMethod,
        methodProperties: methodProperties ?? {},
      }),
    });

    const text = await npRes.text();
    if (!npRes.ok) {
      console.error(
        `[Nova Poshta proxy] upstream ${npRes.status}: ${text.slice(0, 200)}`
      );
      return NextResponse.json(
        {
          success: false,
          errors: [`Nova Poshta upstream returned ${npRes.status}`],
          data: [],
          warnings: [],
          info: [],
        },
        { status: 200 }
      );
    }

    return new NextResponse(text, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Nova Poshta proxy] fetch failed:", err);
    return NextResponse.json(
      {
        success: false,
        errors: ["Failed to reach Nova Poshta"],
        data: [],
        warnings: [],
        info: [],
      },
      { status: 200 }
    );
  }
}
