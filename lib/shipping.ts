// Flat Nova Poshta rate, in UAH.
//
// Lives here rather than in the checkout components because the server has to
// charge the same number the customer was shown: the order total is recomputed
// server-side (lib/orders.ts) and the client's arithmetic is never trusted.
// TODO: replace with the real Nova Poshta rate API.
export const SHIPPING_COST = 120;
