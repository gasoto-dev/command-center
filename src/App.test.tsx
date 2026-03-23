import { render, screen } from "@testing-library/react";
import { expect, test, vi, beforeAll } from "vitest";
import App from "./App";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// Mock gateway so tests don't open real WebSockets
vi.mock("./hooks/useGateway", () => ({
  useGateway: () => ({
    state: "disconnected" as const,
    client: {
      getState: () => "disconnected" as const,
      onStateChange: () => () => {},
      subscribe: () => () => {},
      request: () => Promise.resolve({}),
    },
    connect: () => Promise.resolve(),
    disconnect: () => {},
  }),
}));

test("renders Command Center heading", () => {
  render(<App />);
  expect(
    screen.getByRole("heading", { name: /command center/i }),
  ).toBeInTheDocument();
});
