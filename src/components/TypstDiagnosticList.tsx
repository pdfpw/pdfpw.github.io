import { AlertCircleIcon, AlertTriangleIcon } from "lucide-react";
import type { TypstDiagnostic } from "#src/lib/typst";
import { cn } from "#src/lib/utils";
import * as m from "#src/paraglide/messages.js";

interface Props {
  items: TypstDiagnostic[];
  max?: number;
}

export function TypstDiagnosticList({ items, max = 20 }: Props) {
  const errors = items.filter((d) => d.severity === "error").length;
  const shown = items.slice(0, max);
  const remaining = items.length - shown.length;
  return (
    <div className="mt-4 flex flex-col gap-1 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[12px]">
      <div className="font-medium text-destructive">
        {m.typst_error_compile_failed({ count: String(errors) })}
      </div>
      <ul className="flex flex-col gap-1 font-mono text-fg/80">
        {shown.map((d, i) => (
          <li key={i} className="flex items-start gap-2">
            {d.severity === "error" ? (
              <AlertCircleIcon className="mt-[2px] size-3.5 shrink-0 text-destructive" />
            ) : (
              <AlertTriangleIcon className="mt-[2px] size-3.5 shrink-0 text-amber-500" />
            )}
            <span className="shrink-0 text-muted">
              {d.path}:{d.line}:{d.column}
            </span>
            <span className={cn(d.severity === "error" ? "text-fg" : "text-muted")}>
              {d.message}
            </span>
          </li>
        ))}
      </ul>
      {remaining > 0 && (
        <div className="text-[11px] text-muted">+ {remaining} more</div>
      )}
    </div>
  );
}
