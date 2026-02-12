/**
 * SettingsProvider Test Suite
 *
 * Tests for settings management, persistence, and custom prompt addendum feature
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { SettingsProvider } from "./SettingsProvider";
import { useContext } from "react";
import { SettingsContext } from "./SettingsContext";

// Test component that consumes SettingsContext
const TestConsumer = () => {
  const { settings, updateSettings } = useContext(SettingsContext);
  return (
    <div>
      <div data-testid="custom-addendum">{settings.customPromptAddendum}</div>
      <button
        onClick={() => {
          updateSettings({
            customPromptAddendum: "Test addendum for AI prompts",
          });
        }}
        data-testid="update-button"
      >
        Update Addendum
      </button>
    </div>
  );
};

describe("SettingsProvider", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("customPromptAddendum persistence", () => {
    it("should load customPromptAddendum from localStorage", () => {
      const testAddendum = "Always use const instead of let";
      localStorage.setItem(
        "sandcastle/settings",
        JSON.stringify({
          customPromptAddendum: testAddendum,
        }),
      );

      render(
        <SettingsProvider>
          <TestConsumer />
        </SettingsProvider>,
      );

      expect(screen.getByTestId("custom-addendum")).toHaveTextContent(
        testAddendum,
      );
    });

    it("should save customPromptAddendum to localStorage when updated", async () => {
      const user = userEvent.setup();

      render(
        <SettingsProvider>
          <TestConsumer />
        </SettingsProvider>,
      );

      await user.click(screen.getByTestId("update-button"));

      await waitFor(() => {
        const stored = localStorage.getItem("sandcastle/settings");
        expect(stored).toBeTruthy();

        const parsed = JSON.parse(stored!);
        expect(parsed.customPromptAddendum).toBe(
          "Test addendum for AI prompts",
        );
      });
    });

    it("should persist customPromptAddendum across provider re-mounts", async () => {
      const { unmount } = render(
        <SettingsProvider>
          <TestConsumer />
        </SettingsProvider>,
      );

      const button = screen.getByTestId("update-button");
      const user = userEvent.setup();
      await user.click(button);

      // Store the original localStorage value
      const stored1 = localStorage.getItem("sandcastle/settings");

      // Unmount the provider
      unmount();

      // Re-mount the provider with same localStorage
      render(
        <SettingsProvider>
          <TestConsumer />
        </SettingsProvider>,
      );

      // The value should be loaded from localStorage
      await waitFor(() => {
        const stored2 = localStorage.getItem("sandcastle/settings");
        expect(stored2).toBe(stored1);

        const parsed = JSON.parse(stored2!);
        expect(parsed.customPromptAddendum).toBe(
          "Test addendum for AI prompts",
        );
      });
    });

    it("should handle empty customPromptAddendum", () => {
      render(
        <SettingsProvider>
          <TestConsumer />
        </SettingsProvider>,
      );

      expect(screen.getByTestId("custom-addendum")).toHaveTextContent("");
    });

    it("should handle customPromptAddendum with special characters", async () => {
      const specialAddendum =
        "Use CesiumJS camera.flyTo() with easing: new Cesium.EasingFunction.QUADRATIC_OUT()";
      localStorage.setItem(
        "sandcastle/settings",
        JSON.stringify({
          customPromptAddendum: specialAddendum,
        }),
      );

      render(
        <SettingsProvider>
          <TestConsumer />
        </SettingsProvider>,
      );

      expect(screen.getByTestId("custom-addendum")).toHaveTextContent(
        specialAddendum,
      );
    });

    it("should handle customPromptAddendum with very long content", async () => {
      const longAddendum =
        "Use const for all variables. Prefer arrow functions. Use TypeScript strict mode. Follow the CesiumJS naming conventions. Add proper error handling. Include TypeScript types for all function parameters. Use destructuring where possible. Prefer const over let over var.".repeat(
          5,
        );

      localStorage.setItem(
        "sandcastle/settings",
        JSON.stringify({
          customPromptAddendum: longAddendum,
        }),
      );

      render(
        <SettingsProvider>
          <TestConsumer />
        </SettingsProvider>,
      );

      expect(screen.getByTestId("custom-addendum")).toHaveTextContent(
        longAddendum,
      );
    });

    it("should merge customPromptAddendum with other settings", async () => {
      const savedSettings = {
        theme: "dark",
        fontSize: 14,
        customPromptAddendum: "Always use const",
      };

      localStorage.setItem(
        "sandcastle/settings",
        JSON.stringify(savedSettings),
      );

      render(
        <SettingsProvider>
          <TestConsumer />
        </SettingsProvider>,
      );

      // Verify the addendum was loaded
      expect(screen.getByTestId("custom-addendum")).toHaveTextContent(
        "Always use const",
      );

      // Verify other settings are also present by checking localStorage after update
      const user = userEvent.setup();
      await user.click(screen.getByTestId("update-button"));

      await waitFor(() => {
        const stored = JSON.parse(localStorage.getItem("sandcastle/settings")!);
        expect(stored.customPromptAddendum).toBe(
          "Test addendum for AI prompts",
        );
        // Other settings should still be preserved or use defaults
        expect(stored.theme).toBeDefined();
      });
    });
  });

  describe("settings initialization", () => {
    it("should use default customPromptAddendum when localStorage is empty", () => {
      render(
        <SettingsProvider>
          <TestConsumer />
        </SettingsProvider>,
      );

      expect(screen.getByTestId("custom-addendum")).toHaveTextContent("");
    });

    it("should not break when customPromptAddendum is missing from localStorage", () => {
      localStorage.setItem(
        "sandcastle/settings",
        JSON.stringify({
          theme: "dark",
          // customPromptAddendum is intentionally omitted
        }),
      );

      render(
        <SettingsProvider>
          <TestConsumer />
        </SettingsProvider>,
      );

      // Should render without error and use default value
      expect(screen.getByTestId("custom-addendum")).toBeInTheDocument();
    });
  });
});
