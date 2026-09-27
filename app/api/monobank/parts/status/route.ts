// What the result page polls while the customer is in the mono app.
//
// Returns the outcome the page needs and, once approved, the figures the
// purchase event wants — read from Monobank's own record rather than trusted
// from the browser. The uuid is the only input; knowing it lets someone read
// the state of one order and nothing else, which is the same exposure the
// acquiring status endpoint already has with an invoice id.

import { NextResponse } from "next/server";
import { getPartsOrderData, getPartsOrderState } from "@/lib/monobank-parts";
import { partsFailureMessage, partsOutcome } from "@/lib/installments";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("order");
  if (!orderId) {
    return NextResponse.json(
      { error: "order query param is required" },
      { status: 400 }
    );
  }

  try {
    const state = await getPartsOrderState(orderId);
    const outcome = partsOutcome(state.state, state.order_sub_state);

    if (outcome === "approved") {
      // A second call, only on the terminal state, so polling stays one call.
      const data = await getPartsOrderData(orderId).catch(() => null);
      return NextResponse.json({
        outcome,
        subState: state.order_sub_state,
        total: data?.total_sum ?? null,
        storeOrderId: data?.store_order_id ?? null,
      });
    }

    return NextResponse.json({
      outcome,
      subState: state.order_sub_state,
      ...(outcome === "failed"
        ? { reason: partsFailureMessage(state.order_sub_state) }
        : {}),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[parts status] failed:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
