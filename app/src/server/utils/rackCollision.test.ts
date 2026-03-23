import { describe, it, expect } from "vitest";
import {
  checkCollision,
  ExistingItem,
  PlacementRequest,
} from "./rackCollision";

function makeItem(overrides: Partial<ExistingItem> = {}): ExistingItem {
  return {
    id: "item-1",
    name: "Server",
    startUnit: 1,
    unitHeight: 2,
    side: "FRONT",
    itemType: "MOUNTED",
    fullDepth: false,
    halfWidth: false,
    halfWidthPosition: null,
    ...overrides,
  };
}

function makePlacement(overrides: Partial<PlacementRequest> = {}): PlacementRequest {
  return {
    startUnit: 1,
    unitHeight: 1,
    side: "FRONT",
    fullDepth: false,
    halfWidth: false,
    halfWidthPosition: null,
    ...overrides,
  };
}

describe("checkCollision", () => {
  it("returns no conflict for empty rack", () => {
    const result = checkCollision([], makePlacement());
    expect(result.conflict).toBe(false);
  });

  it("detects same-side overlap", () => {
    const items = [makeItem({ startUnit: 1, unitHeight: 2, side: "FRONT" })];
    const result = checkCollision(items, makePlacement({ startUnit: 2, unitHeight: 1, side: "FRONT" }));
    expect(result.conflict).toBe(true);
  });

  it("allows non-overlapping units on same side", () => {
    const items = [makeItem({ startUnit: 1, unitHeight: 2 })];
    const result = checkCollision(items, makePlacement({ startUnit: 3, unitHeight: 1 }));
    expect(result.conflict).toBe(false);
  });

  it("allows opposite side when neither is full-depth", () => {
    const items = [makeItem({ startUnit: 1, unitHeight: 2, side: "FRONT" })];
    const result = checkCollision(items, makePlacement({ startUnit: 1, unitHeight: 1, side: "BACK" }));
    expect(result.conflict).toBe(false);
  });

  it("detects full-depth conflict from front blocking back", () => {
    const items = [makeItem({ startUnit: 1, unitHeight: 2, side: "FRONT", fullDepth: true })];
    const result = checkCollision(items, makePlacement({ startUnit: 1, unitHeight: 1, side: "BACK" }));
    expect(result.conflict).toBe(true);
  });

  it("detects full-depth placement conflicting with existing back item", () => {
    const items = [makeItem({ startUnit: 1, unitHeight: 1, side: "BACK" })];
    const result = checkCollision(items, makePlacement({ startUnit: 1, unitHeight: 1, side: "FRONT", fullDepth: true }));
    expect(result.conflict).toBe(true);
  });

  it("allows two half-width items on different halves", () => {
    const items = [makeItem({ halfWidth: true, halfWidthPosition: "LEFT" })];
    const result = checkCollision(
      items,
      makePlacement({ startUnit: 1, halfWidth: true, halfWidthPosition: "RIGHT" })
    );
    expect(result.conflict).toBe(false);
  });

  it("detects two half-width items on same half", () => {
    const items = [makeItem({ halfWidth: true, halfWidthPosition: "LEFT" })];
    const result = checkCollision(
      items,
      makePlacement({ startUnit: 1, halfWidth: true, halfWidthPosition: "LEFT" })
    );
    expect(result.conflict).toBe(true);
  });

  it("detects half-width conflicting with full-width on same side", () => {
    const items = [makeItem()];
    const result = checkCollision(
      items,
      makePlacement({ startUnit: 1, halfWidth: true, halfWidthPosition: "LEFT" })
    );
    expect(result.conflict).toBe(true);
  });

  it("skips ZERO_U items", () => {
    const items = [makeItem({ itemType: "ZERO_U" })];
    const result = checkCollision(items, makePlacement());
    expect(result.conflict).toBe(false);
  });

  it("skips SHELF_ITEM items", () => {
    const items = [makeItem({ itemType: "SHELF_ITEM" })];
    const result = checkCollision(items, makePlacement());
    expect(result.conflict).toBe(false);
  });

  it("excludes item being moved", () => {
    const items = [makeItem({ id: "item-1" })];
    const result = checkCollision(
      items,
      makePlacement({ startUnit: 1, excludeItemId: "item-1" })
    );
    expect(result.conflict).toBe(false);
  });

  it("skips items with null position", () => {
    const items = [makeItem({ startUnit: null, unitHeight: null, side: null })];
    const result = checkCollision(items, makePlacement());
    expect(result.conflict).toBe(false);
  });
});
