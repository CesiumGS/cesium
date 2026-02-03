/**
 * Example test file to verify the Vitest setup is working correctly.
 *
 * This file demonstrates:
 * - Basic test structure with describe/it blocks
 * - Using Vitest's built-in assertions
 * - TypeScript type safety in tests
 *
 * Run tests with:
 * - npm test (watch mode)
 * - npm run test:ui (UI mode)
 * - npm run test:coverage (with coverage)
 */

import { describe, it, expect } from "vitest";

describe("Vitest Setup", () => {
  it("should run basic assertions", () => {
    expect(true).toBe(true);
    expect(1 + 1).toBe(2);
    expect("hello").toBeTruthy();
  });

  it("should support TypeScript", () => {
    const greeting = (name: string): string => {
      return `Hello, ${name}!`;
    };

    expect(greeting("World")).toBe("Hello, World!");
  });

  it("should handle arrays and objects", () => {
    const array = [1, 2, 3, 4, 5];
    expect(array).toHaveLength(5);
    expect(array).toContain(3);

    const obj = { name: "Test", value: 42 };
    expect(obj).toHaveProperty("name");
    expect(obj.value).toBe(42);
  });

  it("should support async/await", async () => {
    const fetchData = async (): Promise<string> => {
      return new Promise((resolve) => {
        setTimeout(() => resolve("data"), 10);
      });
    };

    const data = await fetchData();
    expect(data).toBe("data");
  });
});

describe("Math operations", () => {
  it("should add numbers correctly", () => {
    expect(2 + 2).toBe(4);
  });

  it("should subtract numbers correctly", () => {
    expect(5 - 3).toBe(2);
  });

  it("should multiply numbers correctly", () => {
    expect(3 * 4).toBe(12);
  });

  it("should divide numbers correctly", () => {
    expect(10 / 2).toBe(5);
  });
});
