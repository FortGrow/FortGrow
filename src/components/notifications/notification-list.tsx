"use client";

import { useRouter } from "next/navigation";
import { cn, fullDate } from "@/lib/utils";
import { BellRing, CheckCheck } from "lucide-react";

export type NotificationDTO = {
  id: string;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
};

export function NotificationList({ notifications }: { notifications: NotificationDTO[] }) {
  const router = useRouter();

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={markAllRead} className="btn-ghost">
          <CheckCheck size={15} /> Marcar todas como lidas
        </button>
      </div>
      <div className="space-y-2">
        {notifications.length === 0 && (
          <div className="card p-10 text-center text-sm text-slate-500">Nenhuma notificação.</div>
        )}
        {notifications.map((n) => (
          <div
            key={n.id}
            className={cn("card flex items-start gap-3 p-4", !n.read && "border-brand-500/30 bg-brand-500/5")}
          >
            <span className={cn("mt-0.5 rounded-lg p-2", n.read ? "bg-ink-700 text-slate-500" : "bg-brand-500/15 text-brand-400")}>
              <BellRing size={14} />
            </span>
            <div className="flex-1">
              <p className={cn("text-sm font-semibold", n.read ? "text-slate-400" : "text-slate-200")}>{n.title}</p>
              {n.body && <p className="mt-0.5 text-sm text-slate-500">{n.body}</p>}
            </div>
            <span className="text-xs text-slate-600">{fullDate(n.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
