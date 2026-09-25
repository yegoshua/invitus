import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatCustomRequest } from "./custom-request-notification.ts";
import type { CustomRequest } from "./custom-request.ts";

const request: CustomRequest = {
  name: "Олена Коваль",
  phone: "+380671234567",
  size: "M",
  sizeLabel: "72.5-90 см",
  comment: "Хочу напис знизу",
  artwork: {
    pathname: "custom-belt/gym-Xy12ab.png",
    fileName: "gym.png",
    width: 1536,
    height: 1024,
  },
  placement: { centerX: 50, centerY: 5, width: 15, background: "#111111" },
};

describe("formatCustomRequest", () => {
  it("names the customer and how to reach them", () => {
    const text = formatCustomRequest(request);
    assert.ok(text.includes("Олена Коваль"));
    assert.ok(text.includes("+380671234567"));
  });

  it("prints the size as the letter and the centimetres together", () => {
    assert.ok(formatCustomRequest(request).includes("M · 72.5-90 см"));
  });

  it("says plainly when the customer does not know their size", () => {
    const text = formatCustomRequest({ ...request, size: "unknown", sizeLabel: undefined });
    assert.ok(text.includes("не знає — підкажіть"));
    assert.ok(!text.includes("unknown"));
  });

  it("describes where the Artwork sits, so the layout can be rebuilt at print size", () => {
    const text = formatCustomRequest(request);
    assert.ok(text.includes("15 см завширшки"));
    assert.ok(text.includes("центр — 50 см"));
    assert.ok(text.includes("#111111"));
    assert.ok(text.includes("1536×1024"));
  });

  it("gives the print quality, and flags it when it is low", () => {
    assert.ok(formatCustomRequest(request).includes("260 DPI"));
    const stretched = formatCustomRequest({ ...request, placement: { ...request.placement, width: 100 } });
    assert.ok(stretched.includes("39 DPI"));
    assert.ok(stretched.includes("⚠️"));
  });

  it("does not let a customer put markup or a link in their own name or comment", () => {
    const text = formatCustomRequest({
      ...request,
      name: '<a href="https://evil.example">Олена</a>',
      comment: "<b>терміново</b> & дешево",
    });
    assert.ok(!text.includes("<a "));
    assert.ok(!text.includes("<b>терміново"));
    assert.ok(text.includes("&lt;a href"));
    assert.ok(text.includes("&amp; дешево"));
  });

  it("leaves the comment out when there is none", () => {
    assert.ok(!formatCustomRequest({ ...request, comment: "" }).includes("Коментар"));
  });
});
