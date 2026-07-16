import { cn } from "@/lib/utils";

export function DataTable({ headers, children, className }: { headers: string[]; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("card overflow-x-auto", className)}>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-wider text-slate-500">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle text-slate-300", className)}>{children}</td>;
}
