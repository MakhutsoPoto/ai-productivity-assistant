import type { LucideIcon } from "lucide-react";

export function PageHeader({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

export function Disclaimer() {
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      AI-generated content may require human review.
    </p>
  );
}
