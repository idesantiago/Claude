"use client";

import { Loader2 } from "lucide-react";

interface ToolInvocationBadgeProps {
  toolName: string;
  args: Record<string, unknown>;
  state: string;
}

function getBasename(path: string): string {
  return path.split("/").filter(Boolean).pop() || path;
}

export function getToolLabel(toolName: string, args: Record<string, unknown>): string {
  const path = typeof args.path === "string" ? args.path : "";
  const filename = path ? getBasename(path) : "";
  const command = args.command as string | undefined;

  if (toolName === "str_replace_editor") {
    switch (command) {
      case "create":
        return filename ? `Creating ${filename}` : "Creating file";
      case "str_replace":
      case "insert":
        return filename ? `Editing ${filename}` : "Editing file";
      case "view":
        return filename ? `Viewing ${filename}` : "Viewing file";
      case "undo_edit":
        return filename ? `Undoing edit in ${filename}` : "Undoing edit";
      default:
        return filename ? `Working on ${filename}` : "Working on file";
    }
  }

  if (toolName === "file_manager") {
    switch (command) {
      case "rename":
        return filename ? `Renaming ${filename}` : "Renaming file";
      case "delete":
        return filename ? `Deleting ${filename}` : "Deleting file";
      default:
        return filename ? `Managing ${filename}` : "Managing file";
    }
  }

  return toolName;
}

export function ToolInvocationBadge({ toolName, args, state }: ToolInvocationBadgeProps) {
  const label = getToolLabel(toolName, args);
  const isDone = state === "result";

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
