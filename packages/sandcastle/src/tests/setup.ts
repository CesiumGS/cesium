/**
 * Global test setup file for Vitest.
 *
 * This file runs before all test files and sets up:
 * - Custom matchers from @testing-library/jest-dom
 * - Global test utilities and helpers
 * - Mock configurations
 */

import "@testing-library/jest-dom";

/**
 * Extend Vitest's expect with custom matchers from @testing-library/jest-dom
 * This provides useful DOM-specific matchers like:
 * - toBeInTheDocument()
 * - toHaveTextContent()
 * - toBeVisible()
 * - toBeDisabled()
 * - etc.
 */

// Ensure performance.now() is available for performance tests
if (typeof performance === "undefined") {
  (globalThis as unknown as { performance: Performance }).performance = {
    now: () => Date.now(),
  } as Performance;
}

/**
 * Global test utilities and browser API mocks.
 * These are not available in happy-dom or jsdom by default.
 */

// Mock window.matchMedia if needed
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver if needed
(
  globalThis as unknown as { IntersectionObserver: typeof IntersectionObserver }
).IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as unknown as typeof IntersectionObserver;

// Mock ResizeObserver if needed
(
  globalThis as unknown as { ResizeObserver: typeof ResizeObserver }
).ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as unknown as typeof ResizeObserver;

/**
 * Clean up after each test automatically.
 * This helps prevent test pollution and memory leaks.
 */
afterEach(() => {
  // Cleanup is handled by @testing-library/react automatically
  // when using render() from @testing-library/react
});
