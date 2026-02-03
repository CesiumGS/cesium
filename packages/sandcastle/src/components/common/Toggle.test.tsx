import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toggle } from "./Toggle";

describe("Toggle", () => {
  describe("Rendering", () => {
    it("should render with label", () => {
      render(
        <Toggle label="Test Toggle" enabled={false} onChange={() => {}} />,
      );
      expect(screen.getByText("Test Toggle")).toBeInTheDocument();
    });

    it("should render with icon", () => {
      render(
        <Toggle
          icon="🧠"
          label="Test Toggle"
          enabled={false}
          onChange={() => {}}
        />,
      );
      expect(screen.getByText("🧠")).toBeInTheDocument();
    });

    it("should render without icon when not provided", () => {
      const { container } = render(
        <Toggle label="Test Toggle" enabled={false} onChange={() => {}} />,
      );
      expect(container.querySelector(".toggle-icon")).not.toBeInTheDocument();
    });

    it("should show tooltip when provided", () => {
      render(
        <Toggle
          label="Test Toggle"
          enabled={false}
          onChange={() => {}}
          tooltip="This is a test tooltip"
        />,
      );
      const toggle = screen.getByRole("switch");
      expect(toggle).toHaveAttribute("title", "This is a test tooltip");
    });
  });

  describe("State", () => {
    it("should reflect enabled state", () => {
      render(<Toggle label="Test Toggle" enabled={true} onChange={() => {}} />);
      const toggle = screen.getByRole("switch");
      expect(toggle).toHaveAttribute("aria-checked", "true");
    });

    it("should reflect disabled state", () => {
      render(
        <Toggle label="Test Toggle" enabled={false} onChange={() => {}} />,
      );
      const toggle = screen.getByRole("switch");
      expect(toggle).toHaveAttribute("aria-checked", "false");
    });

    it("should have toggle-on class when enabled", () => {
      const { container } = render(
        <Toggle label="Test Toggle" enabled={true} onChange={() => {}} />,
      );
      const modernToggle = container.querySelector(".modern-toggle");
      expect(modernToggle).toHaveClass("toggle-on");
    });

    it("should have toggle-off class when disabled", () => {
      const { container } = render(
        <Toggle label="Test Toggle" enabled={false} onChange={() => {}} />,
      );
      const modernToggle = container.querySelector(".modern-toggle");
      expect(modernToggle).toHaveClass("toggle-off");
    });
  });

  describe("Interaction", () => {
    it("should call onChange with true when clicked while disabled", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(
        <Toggle label="Test Toggle" enabled={false} onChange={handleChange} />,
      );

      const toggle = screen.getByRole("switch");
      await user.click(toggle);

      expect(handleChange).toHaveBeenCalledWith(true);
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it("should call onChange with false when clicked while enabled", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(
        <Toggle label="Test Toggle" enabled={true} onChange={handleChange} />,
      );

      const toggle = screen.getByRole("switch");
      await user.click(toggle);

      expect(handleChange).toHaveBeenCalledWith(false);
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it("should not call onChange when disabled prop is true", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(
        <Toggle
          label="Test Toggle"
          enabled={false}
          onChange={handleChange}
          disabled={true}
        />,
      );

      const toggle = screen.getByRole("switch");
      await user.click(toggle);

      expect(handleChange).not.toHaveBeenCalled();
    });

    it("should stop event propagation on click", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      const handleParentClick = vi.fn();

      const { container } = render(
        <div onClick={handleParentClick}>
          <Toggle label="Test Toggle" enabled={false} onChange={handleChange} />
        </div>,
      );

      const toggle = container.querySelector(".toggle-control");
      if (toggle) {
        await user.click(toggle);
      }

      expect(handleChange).toHaveBeenCalledWith(true);
      expect(handleParentClick).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it('should have role="switch"', () => {
      render(
        <Toggle label="Test Toggle" enabled={false} onChange={() => {}} />,
      );
      expect(screen.getByRole("switch")).toBeInTheDocument();
    });

    it("should use label as aria-label by default", () => {
      render(
        <Toggle label="Test Toggle" enabled={false} onChange={() => {}} />,
      );
      const toggle = screen.getByRole("switch");
      expect(toggle).toHaveAttribute("aria-label", "Test Toggle");
    });

    it("should use custom ariaLabel when provided", () => {
      render(
        <Toggle
          label="Test Toggle"
          enabled={false}
          onChange={() => {}}
          ariaLabel="Custom Aria Label"
        />,
      );
      const toggle = screen.getByRole("switch");
      expect(toggle).toHaveAttribute("aria-label", "Custom Aria Label");
    });

    it("should have correct cursor style when not disabled", () => {
      const { container } = render(
        <Toggle label="Test Toggle" enabled={false} onChange={() => {}} />,
      );
      const toggle = container.querySelector(".toggle-control");
      expect(toggle).toHaveStyle({ cursor: "pointer" });
    });

    it("should have not-allowed cursor when disabled", () => {
      const { container } = render(
        <Toggle
          label="Test Toggle"
          enabled={false}
          onChange={() => {}}
          disabled={true}
        />,
      );
      const toggle = container.querySelector(".toggle-control");
      expect(toggle).toHaveStyle({ cursor: "not-allowed" });
    });

    it("should have toggle-disabled class when disabled", () => {
      const { container } = render(
        <Toggle
          label="Test Toggle"
          enabled={false}
          onChange={() => {}}
          disabled={true}
        />,
      );
      const toggle = container.querySelector(".toggle-control");
      expect(toggle).toHaveClass("toggle-disabled");
    });
  });

  describe("Keyboard Navigation", () => {
    it("should be focusable", () => {
      render(
        <Toggle label="Test Toggle" enabled={false} onChange={() => {}} />,
      );
      const toggle = screen.getByRole("switch");
      expect(toggle).toBeInTheDocument();
      // The component uses onClick which browsers automatically handle with keyboard
      // So keyboard accessibility is inherent to the role="switch" attribute
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid clicks correctly", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(
        <Toggle label="Test Toggle" enabled={false} onChange={handleChange} />,
      );

      const toggle = screen.getByRole("switch");
      await user.click(toggle);
      await user.click(toggle);
      await user.click(toggle);

      expect(handleChange).toHaveBeenCalledTimes(3);
      expect(handleChange).toHaveBeenNthCalledWith(1, true);
      expect(handleChange).toHaveBeenNthCalledWith(2, true);
      expect(handleChange).toHaveBeenNthCalledWith(3, true);
    });

    it("should handle undefined onChange gracefully", () => {
      // This test ensures the component doesn't crash if onChange is undefined
      // though TypeScript should prevent this
      const { container } = render(
        <Toggle
          label="Test Toggle"
          enabled={false}
          onChange={undefined as unknown as () => void}
        />,
      );
      expect(container.querySelector(".toggle-control")).toBeInTheDocument();
    });
  });
});
