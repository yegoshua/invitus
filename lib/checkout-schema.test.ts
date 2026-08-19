import { test } from "node:test";
import assert from "node:assert/strict";
import { checkoutSchema, checkoutDefaults } from "./checkout-schema.ts";

const valid = {
  ...checkoutDefaults,
  fullName: "Арнольд Шварценеггер",
  phone: "+380671234567",
  email: "lifter@example.com",
  cityRef: "city-ref",
  cityName: "Київ",
  branchRef: "branch-ref",
  branchName: "Відділення №1",
  paymentMethod: "online" as const,
};

function emailIssue(input: unknown): string | undefined {
  const result = checkoutSchema.safeParse(input);
  if (result.success) return undefined;
  return result.error.issues.find((i) => i.path[0] === "email")?.message;
}

test("a complete form with an email passes", () => {
  assert.equal(checkoutSchema.safeParse(valid).success, true);
});

test("a missing email is rejected", () => {
  const withoutEmail: Record<string, unknown> = { ...valid };
  delete withoutEmail.email;
  assert.equal(emailIssue(withoutEmail), "Вкажи email");
});

test("an empty email is rejected", () => {
  assert.equal(emailIssue({ ...valid, email: "" }), "Вкажи email");
});

test("whitespace is not an email", () => {
  assert.equal(emailIssue({ ...valid, email: "   " }), "Вкажи email");
});

test("cash on delivery needs an email too", () => {
  // The address is how the order is confirmed and how the customer is reached
  // about it, so it is not a property of how they chose to pay.
  assert.equal(
    emailIssue({ ...valid, email: "", paymentMethod: "cod" }),
    "Вкажи email"
  );
});

test("a malformed address says so, rather than that the field is empty", () => {
  assert.equal(emailIssue({ ...valid, email: "lifter@" }), "Невірний email");
});

test("an address longer than the endpoint accepts is refused in the field", () => {
  // Same bound as app/api/orders/route.ts, so the customer is told which field
  // is wrong instead of meeting a generic 400.
  const tooLong = `${"a".repeat(310)}@example.com`;
  assert.equal(emailIssue({ ...valid, email: tooLong }), "Занадто довгий email");
});

test("an address is trimmed before it travels", () => {
  const result = checkoutSchema.safeParse({
    ...valid,
    email: "  lifter@example.com  ",
  });
  assert.equal(result.success, true);
  assert.equal(
    result.success ? result.data.email : null,
    "lifter@example.com"
  );
});
