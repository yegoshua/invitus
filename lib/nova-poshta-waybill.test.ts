import test from "node:test";
import assert from "node:assert/strict";

import {
  buildWaybillRequest,
  npDate,
  npPhone,
  splitName,
  WaybillError,
} from "./nova-poshta-waybill.ts";

const sender = {
  counterpartyRef: "S",
  contactRef: "SC",
  phone: "380684054069",
  cityRef: "SCITY",
  warehouseRef: "SWH",
};
const recipient = { counterpartyRef: "R", contactRef: "RC" };
const order = {
  orderId: 1063,
  fullName: "Назар Ольшевський",
  phone: "+380 (68) 136 38 24",
  cityRef: "RCITY",
  warehouseRef: "RWH",
  total: 4100,
  cashOnDelivery: false,
};

test("the recipient pays delivery, branch to branch, for the goods' value", () => {
  const req = buildWaybillRequest({ order, sender, recipient, weightKg: 1, description: "x" });
  assert.equal(req.PayerType, "Recipient");
  assert.equal(req.ServiceType, "WarehouseWarehouse");
  assert.equal(req.Cost, "4100");
  assert.equal(req.RecipientsPhone, "380681363824");
  assert.equal(req.RecipientAddress, "RWH");
  assert.equal(req.SenderAddress, "SWH");
  assert.equal("BackwardDeliveryData" in req, false, "a paid order carries no COD");
});

test("cash on delivery sends the goods' money back", () => {
  const req = buildWaybillRequest({
    order: { ...order, cashOnDelivery: true },
    sender,
    recipient,
    weightKg: 1,
    description: "x",
  });
  assert.deepEqual(req.BackwardDeliveryData, [
    { PayerType: "Recipient", CargoType: "Money", RedeliveryString: "4100" },
  ]);
});

test("the name splits first-name-first, the way the checkout asks for it", () => {
  assert.deepEqual(splitName(" Назар  Ольшевський "), { firstName: "Назар", lastName: "Ольшевський" });
  assert.deepEqual(splitName("Марія Анна Коваль"), { firstName: "Марія", lastName: "Анна Коваль" });
  assert.throws(() => splitName("Назар"), WaybillError);
});

test("phones reach Nova Poshta as 380XXXXXXXXX", () => {
  assert.equal(npPhone("+380 (68) 136 38 24"), "380681363824");
  assert.equal(npPhone("068 136 38 24"), "380681363824");
});

test("the date is Kyiv's, not the server's", () => {
  // 22:30 UTC on the 29th is already the 30th in Kyiv (UTC+3 in summer).
  assert.equal(npDate(new Date("2026-09-29T22:30:00Z")), "30.09.2026");
});
