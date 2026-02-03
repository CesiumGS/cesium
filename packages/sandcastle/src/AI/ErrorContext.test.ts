import { describe, it, expect } from "vitest";
import { detectCompletionSignal } from "./ErrorContext";

describe("ErrorContext", () => {
  describe("detectCompletionSignal", () => {
    it("should detect 'task complete' signal", () => {
      expect(
        detectCompletionSignal("Task complete! All changes applied."),
      ).toBe(true);
      expect(detectCompletionSignal("The task is complete.")).toBe(true);
      expect(detectCompletionSignal("Task completed successfully.")).toBe(true);
    });

    it("should detect 'finished' signal", () => {
      expect(detectCompletionSignal("All done! Everything is working.")).toBe(
        true,
      );
      expect(
        detectCompletionSignal("I'm finished with the implementation."),
      ).toBe(true);
      expect(detectCompletionSignal("Done! The code is ready.")).toBe(true);
    });

    it("should detect 'no errors' signal", () => {
      expect(detectCompletionSignal("No errors detected.")).toBe(true);
      expect(detectCompletionSignal("Everything works correctly now.")).toBe(
        true,
      );
      expect(detectCompletionSignal("Working properly as expected.")).toBe(
        true,
      );
    });

    it("should detect 'implementation complete' signal", () => {
      expect(detectCompletionSignal("Implementation complete.")).toBe(true);
      expect(detectCompletionSignal("The implementation is complete.")).toBe(
        true,
      );
    });

    it("should NOT trigger on negative phrases", () => {
      expect(detectCompletionSignal("Task not complete yet.")).toBe(false);
      expect(detectCompletionSignal("The task is incomplete.")).toBe(false);
      expect(detectCompletionSignal("Not finished with the changes.")).toBe(
        false,
      );
      expect(detectCompletionSignal("It doesn't work yet.")).toBe(false);
      expect(detectCompletionSignal("Still has errors.")).toBe(false);
    });

    it("should be case-insensitive", () => {
      expect(detectCompletionSignal("TASK COMPLETE")).toBe(true);
      expect(detectCompletionSignal("Task Complete")).toBe(true);
      expect(detectCompletionSignal("task complete")).toBe(true);
    });

    it("should work with mixed content", () => {
      const message = `
        I've updated the code to fix the issue.

        The task is complete. Everything is working correctly now.
        Let me know if you need anything else!
      `;
      expect(detectCompletionSignal(message)).toBe(true);
    });

    it("should not trigger on partial matches in negative context", () => {
      expect(detectCompletionSignal("The work is not done yet.")).toBe(false);
      expect(detectCompletionSignal("This is unfinished business.")).toBe(
        false,
      );
    });

    it("should detect various completion patterns", () => {
      expect(detectCompletionSignal("Fixed successfully!")).toBe(true);
      expect(detectCompletionSignal("Everything is working")).toBe(true);
      expect(detectCompletionSignal("All working now")).toBe(true);
      expect(detectCompletionSignal("Ready to go!")).toBe(true);
      expect(detectCompletionSignal("Good to go now")).toBe(true);
      expect(detectCompletionSignal("Should be working now")).toBe(true);
    });

    it("should NOT trigger on normal chat messages", () => {
      expect(detectCompletionSignal("Let me fix this issue.")).toBe(false);
      expect(detectCompletionSignal("I'm making changes to the code.")).toBe(
        false,
      );
      expect(detectCompletionSignal("Here's what I'm updating:")).toBe(false);
    });
  });
});
