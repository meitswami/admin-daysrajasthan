"use client";

import { Bold, Italic, List, Heading2, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function RichTextToolbar({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  function wrap(tag: string, close: string) {
    onChange(value + tag + close);
  }

  function insertParagraph() {
    onChange(value + "<p>New paragraph</p>");
  }

  return (
    <div className="flex flex-wrap gap-1 rounded-t-lg border border-b-0 border-stone-200 bg-stone-50 p-1.5">
      {[
        { icon: Bold, label: "Bold", action: () => wrap("<strong>", "</strong>") },
        { icon: Italic, label: "Italic", action: () => wrap("<em>", "</em>") },
        { icon: Heading2, label: "Heading", action: () => wrap("<h2>", "</h2>") },
        { icon: List, label: "List", action: () => wrap("<ul><li>", "</li></ul>") },
        { icon: Link2, label: "Paragraph", action: insertParagraph },
      ].map(({ icon: Icon, label, action }) => (
        <button
          key={label}
          type="button"
          title={label}
          onClick={action}
          className={cn(
            "rounded-md p-2 text-stone-600 transition-colors hover:bg-white hover:text-stone-900"
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
