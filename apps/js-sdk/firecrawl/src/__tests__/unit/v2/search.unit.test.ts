/**
 * Unit tests for v2 search: country and enterprise fields (#3437)
 */
import { describe, test, expect } from "@jest/globals";
import { prepareSearchPayload } from "../../../v2/methods/search";
import type { SearchRequest } from "../../../v2/types";

describe("v2 prepareSearchPayload", () => {
  test("forwards country when provided", () => {
    const req: SearchRequest = { query: "test", country: "US" };
    const payload = prepareSearchPayload(req);
    expect(payload.country).toBe("US");
  });

  test("does not include country when not provided", () => {
    const req: SearchRequest = { query: "test" };
    const payload = prepareSearchPayload(req);
    expect(payload).not.toHaveProperty("country");
  });

  test("forwards enterprise when provided", () => {
    const req: SearchRequest = {
      query: "test",
      enterprise: ["default", "anon"],
    };
    const payload = prepareSearchPayload(req);
    expect(payload.enterprise).toEqual(["default", "anon"]);
  });

  test("does not include enterprise when not provided", () => {
    const req: SearchRequest = { query: "test" };
    const payload = prepareSearchPayload(req);
    expect(payload).not.toHaveProperty("enterprise");
  });

  test("forwards both country and enterprise together", () => {
    const req: SearchRequest = {
      query: "test",
      country: "GB",
      enterprise: ["zdr"],
    };
    const payload = prepareSearchPayload(req);
    expect(payload.country).toBe("GB");
    expect(payload.enterprise).toEqual(["zdr"]);
  });
});
