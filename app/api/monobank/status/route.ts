import { NextResponse } from "next/server";
import { getInvoiceStatus } from "@/lib/monobank";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const invoiceId = searchParams.get("invoiceId");
  if (!invoiceId) {
    return NextResponse.json(
      { error: "invoiceId query param is required" },
      { status: 400 }
    );
  }

  try {
    const status = await getInvoiceStatus(invoiceId);
    return NextResponse.json(status);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Monobank] getInvoiceStatus failed:", msg);
    return NextResponse.json(
      { error: msg || "Failed to fetch invoice status" },
      { status: 500 }
    );
  }
}
