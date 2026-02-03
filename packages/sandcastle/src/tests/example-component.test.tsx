/**
 * Example React component test to verify React Testing Library setup.
 *
 * This file demonstrates:
 * - Rendering React components in tests
 * - Using @testing-library/react utilities
 * - Testing user interactions with @testing-library/user-event
 * - Using custom matchers from @testing-library/jest-dom
 *
 * Run tests with:
 * - npm test (watch mode)
 * - npm run test:ui (UI mode)
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useState } from "react";

// Example component to test
function Button({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} type="button">
      {children}
    </button>
  );
}

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <Button onClick={() => setCount(count + 1)}>Increment</Button>
      <Button onClick={() => setCount(count - 1)}>Decrement</Button>
      <Button onClick={() => setCount(0)}>Reset</Button>
    </div>
  );
}

describe("Button Component", () => {
  it("should render with children", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it("should call onClick when clicked", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole("button", { name: /click me/i });
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe("Counter Component", () => {
  it("should render with initial count of 0", () => {
    render(<Counter />);

    expect(screen.getByText(/count: 0/i)).toBeInTheDocument();
  });

  it("should increment count when increment button is clicked", async () => {
    const user = userEvent.setup();
    render(<Counter />);

    const incrementButton = screen.getByRole("button", { name: /increment/i });
    await user.click(incrementButton);

    expect(screen.getByText(/count: 1/i)).toBeInTheDocument();
  });

  it("should decrement count when decrement button is clicked", async () => {
    const user = userEvent.setup();
    render(<Counter />);

    const decrementButton = screen.getByRole("button", { name: /decrement/i });
    await user.click(decrementButton);

    expect(screen.getByText(/count: -1/i)).toBeInTheDocument();
  });

  it("should reset count when reset button is clicked", async () => {
    const user = userEvent.setup();
    render(<Counter />);

    // First increment to make sure we're not at 0
    const incrementButton = screen.getByRole("button", { name: /increment/i });
    await user.click(incrementButton);
    expect(screen.getByText(/count: 1/i)).toBeInTheDocument();

    // Then reset
    const resetButton = screen.getByRole("button", { name: /reset/i });
    await user.click(resetButton);
    expect(screen.getByText(/count: 0/i)).toBeInTheDocument();
  });
});
