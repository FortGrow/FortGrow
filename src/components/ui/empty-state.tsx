import { Inbox } from "lucide-react";

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 p-10 text-center">
      <Inbox className="text-slate-600" size={28} />
      <p className="text-sm font-medium text-slate-400">{title}</p>
      {hint && <p className="text-xs text-slate-600">{hint}</p>}
    </div>
  );
}
