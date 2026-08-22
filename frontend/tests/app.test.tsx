import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "../src/app/App";

describe("application skeleton", () => {
  it("renders the Dayflow shell", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /hr operations/i })).toBeInTheDocument();
  });
});
