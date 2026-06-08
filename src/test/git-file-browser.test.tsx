import type React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { I18nProvider } from "../i18n";
import {
  GitFileBrowser,
  GitFileViewToggle,
  type GitFileEntry,
} from "../components/git-view/GitFileBrowser";

function renderWithI18n(ui: React.ReactNode) {
  localStorage.setItem("nezha:language", "en");
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe("GitFileViewToggle", () => {
  test("exposes the active view mode to assistive technology", () => {
    renderWithI18n(<GitFileViewToggle mode="tree" onChange={() => {}} />);

    expect(screen.getByRole("button", { name: "View as tree" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "View as list" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});

describe("GitFileBrowser", () => {
  test("exposes directory expanded state", async () => {
    const user = userEvent.setup();

    renderWithI18n(<GitFileBrowser entries={[{ path: "src/App.tsx", status: "M" }]} mode="tree" />);

    const directory = screen.getByRole("button", { name: /src/ });
    expect(directory).toHaveAttribute("aria-expanded", "true");

    await user.click(directory);
    expect(directory).toHaveAttribute("aria-expanded", "false");
  });

  test("keeps row action clicks from bubbling to file selection", () => {
    const onFileClick = vi.fn();
    const onDiscard = vi.fn();

    renderWithI18n(
      <GitFileBrowser
        entries={[{ path: "src/App.tsx", status: "M" }]}
        mode="list"
        onFileClick={onFileClick}
        onDiscard={onDiscard}
      />,
    );

    const row = screen.getByText("App.tsx").closest('[role="button"]');
    expect(row).not.toBeNull();

    fireEvent.mouseEnter(row!);
    fireEvent.click(screen.getByTitle("Discard Changes"));

    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onFileClick).not.toHaveBeenCalled();
  });

  test("uses the flat list path for very large tree-mode inputs", () => {
    const entries: GitFileEntry[] = Array.from({ length: 1001 }, (_, index) => ({
      path: `src/file-${index}.ts`,
      status: "M",
    }));

    renderWithI18n(<GitFileBrowser entries={entries} mode="tree" />);

    expect(screen.queryByRole("button", { name: /src/ })).not.toBeInTheDocument();
    expect(screen.getByText("file-0.ts")).toBeInTheDocument();
  });
});
