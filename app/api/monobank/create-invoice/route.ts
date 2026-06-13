import { NextResponse } from "next/server";
import { createInvoice, type BasketItem } from "@/lib/monobank";

interface CreateInvoiceRequest {
  /** Total amount in copecks. */
  amount: number;
  reference: string;
  destination: string;
  email?: string;
  basketOrder?: BasketItem[];
}

function origin(req: Request): string {
  return (
    req.headers.get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  );
}

export async function POST(req: Request) {
  let body: CreateInvoiceRequest;
  try {
    body = (await req.json()) as CreateInvoiceRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.amount !== "number" || body.amount <= 0) {
    return NextResponse.json(
      { error: "amount must be a positive integer (copecks)" },
      { status: 400 }
    );
  }

  try {
    const invoice = await createInvoice({
      amount: body.amount,
      reference: body.reference,
      destination: body.destination,
      basketOrder: body.basketOrder,
      customerEmails: body.email ? [body.email] : undefined,
      redirectUrl: `${origin(req)}/payment-result`,
      // webHookUrl: `${origin(req)}/api/monobank/webhook`, // add when we have one
      validity: 60 * 60, // 1 hour
    });

    // Monobank's redirectUrl is hit without any query params — stash the
    // invoiceId in a cookie so /payment-result can recover it server-side.
    const res = NextResponse.json(invoice);
    res.cookies.set("invitus_last_invoice_id", invoice.invoiceId, {
      maxAge: 60 * 60, // 1 hour, matches `validity` above
      path: "/",
      sameSite: "lax",
    });
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Monobank] createInvoice failed:", msg);
    return NextResponse.json(
      { error: msg || "Failed to create invoice" },
      { status: 500 }
    );
  }
}
