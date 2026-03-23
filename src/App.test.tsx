import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import App from "./App";

test("renders Command Center heading", () => {
  render(<App />);
  expect(
    screen.getByRole("heading", { name: /command center/i }),
  ).toBeInTheDocument();
});
