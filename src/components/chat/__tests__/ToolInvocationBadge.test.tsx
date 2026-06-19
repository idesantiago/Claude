import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge, getToolLabel } from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

// --- getToolLabel unit tests ---

test("getToolLabel: str_replace_editor create with path", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "/App.jsx" })).toBe("Creating App.jsx");
});

test("getToolLabel: str_replace_editor create with nested path", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "/src/components/Card.tsx" })).toBe("Creating Card.tsx");
});

test("getToolLabel: str_replace_editor create without path", () => {
  expect(getToolLabel("str_replace_editor", { command: "create" })).toBe("Creating file");
});

test("getToolLabel: str_replace_editor str_replace", () => {
  expect(getToolLabel("str_replace_editor", { command: "str_replace", path: "/App.jsx" })).toBe("Editing App.jsx");
});

test("getToolLabel: str_replace_editor insert", () => {
  expect(getToolLabel("str_replace_editor", { command: "insert", path: "/styles.css" })).toBe("Editing styles.css");
});

test("getToolLabel: str_replace_editor view", () => {
  expect(getToolLabel("str_replace_editor", { command: "view", path: "/App.jsx" })).toBe("Viewing App.jsx");
});

test("getToolLabel: str_replace_editor undo_edit", () => {
  expect(getToolLabel("str_replace_editor", { command: "undo_edit", path: "/App.jsx" })).toBe("Undoing edit in App.jsx");
});

test("getToolLabel: str_replace_editor undo_edit without path", () => {
  expect(getToolLabel("str_replace_editor", { command: "undo_edit" })).toBe("Undoing edit");
});

test("getToolLabel: str_replace_editor unknown command with path", () => {
  expect(getToolLabel("str_replace_editor", { command: "unknown", path: "/App.jsx" })).toBe("Working on App.jsx");
});

test("getToolLabel: str_replace_editor no command, no path", () => {
  expect(getToolLabel("str_replace_editor", {})).toBe("Working on file");
});

test("getToolLabel: file_manager rename", () => {
  expect(getToolLabel("file_manager", { command: "rename", path: "/Button.jsx" })).toBe("Renaming Button.jsx");
});

test("getToolLabel: file_manager delete", () => {
  expect(getToolLabel("file_manager", { command: "delete", path: "/Button.jsx" })).toBe("Deleting Button.jsx");
});

test("getToolLabel: file_manager rename without path", () => {
  expect(getToolLabel("file_manager", { command: "rename" })).toBe("Renaming file");
});

test("getToolLabel: file_manager delete without path", () => {
  expect(getToolLabel("file_manager", { command: "delete" })).toBe("Deleting file");
});

test("getToolLabel: file_manager unknown command with path", () => {
  expect(getToolLabel("file_manager", { command: "other", path: "/foo.js" })).toBe("Managing foo.js");
});

test("getToolLabel: file_manager no args", () => {
  expect(getToolLabel("file_manager", {})).toBe("Managing file");
});

test("getToolLabel: unknown tool name falls back to tool name", () => {
  expect(getToolLabel("some_other_tool", { command: "create", path: "/foo.js" })).toBe("some_other_tool");
});

// --- ToolInvocationBadge render tests ---

test("shows label and green dot when state is result", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="result"
    />
  );

  expect(screen.getByText("Creating App.jsx")).toBeDefined();
  // Spinner should not be present - green dot is a plain div, no aria role
  const spinners = document.querySelectorAll(".animate-spin");
  expect(spinners).toHaveLength(0);
});

test("shows spinner when state is not result", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="call"
    />
  );

  expect(screen.getByText("Creating App.jsx")).toBeDefined();
  const spinners = document.querySelectorAll(".animate-spin");
  expect(spinners.length).toBeGreaterThan(0);
});

test("renders Editing label for str_replace command", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "str_replace", path: "/src/components/Button.tsx" }}
      state="result"
    />
  );

  expect(screen.getByText("Editing Button.tsx")).toBeDefined();
});

test("renders Deleting label for file_manager delete", () => {
  render(
    <ToolInvocationBadge
      toolName="file_manager"
      args={{ command: "delete", path: "/old-file.jsx" }}
      state="result"
    />
  );

  expect(screen.getByText("Deleting old-file.jsx")).toBeDefined();
});

test("renders Viewing label for view command", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "view", path: "/App.jsx" }}
      state="partial-call"
    />
  );

  expect(screen.getByText("Viewing App.jsx")).toBeDefined();
});

test("falls back gracefully when args are empty", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{}}
      state="result"
    />
  );

  expect(screen.getByText("Working on file")).toBeDefined();
});
