import { Bike, CheckCircle2, ChefHat, FileText } from "lucide-react";

const stages = [
  { key: "placed", label: "Placed", description: "We have your order", Icon: FileText },
  { key: "kitchen", label: "Kitchen", description: "Being prepared", Icon: ChefHat },
  { key: "dispatched", label: "Dispatched", description: "Handed to the rider", Icon: Bike },
  { key: "enroute", label: "Enroute", description: "On the way to you", Icon: Bike },
  { key: "delivered", label: "Delivered", description: "Order complete", Icon: CheckCircle2 },
] as const;

export function OrderStatusTracker({ status }: { status: string }) {
  const currentIndex = stages.findIndex((stage) => stage.key === (status === "ready" ? "kitchen" : status));
  const progress = currentIndex <= 0 ? 0 : (currentIndex / (stages.length - 1)) * 100;

  return (
    <section aria-label="Order progress" className="rounded-2xl border border-purple-950/10 bg-white/80 p-5 shadow-sm backdrop-blur-xl sm:p-6">
      <div className="relative hidden md:block">
        <div className="absolute left-[10%] right-[10%] top-5 h-1 rounded-full bg-slate-100" />
        <div className="absolute left-[10%] top-5 h-1 rounded-full bg-purple-950 transition-all duration-500" style={{ width: `${progress * 0.8}%` }} />
        <ol className="relative z-10 grid grid-cols-5">
          {stages.map((stage, index) => {
          const complete = currentIndex >= 0 && index < currentIndex;
          const current = index === currentIndex;
          const Icon = complete ? CheckCircle2 : stage.Icon;
          return (
            <li key={stage.key} className="relative z-10 flex flex-col items-center text-center">
              <span className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${complete ? "border-purple-950 bg-purple-950 text-white" : current ? "border-yellow-400 bg-yellow-400 text-purple-950 shadow-[0_0_0_6px_rgba(255,199,0,.18)]" : "border-slate-200 bg-white text-slate-400"}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className={`mt-3 text-xs font-extrabold ${complete || current ? "text-purple-950" : "text-slate-400"}`}>{stage.label}</span>
              <span className="mt-1 text-[10px] text-slate-500">{stage.description}</span>
            </li>
          );
          })}
        </ol>
      </div>

      <ol className="relative space-y-0 md:hidden">
        {stages.map((stage, index) => {
          const complete = currentIndex >= 0 && index < currentIndex;
          const current = index === currentIndex;
          const Icon = complete ? CheckCircle2 : stage.Icon;
          return (
            <li key={stage.key} className="relative flex min-h-[68px] gap-4 last:min-h-0">
              {index < stages.length - 1 && <span className={`absolute bottom-0 left-5 top-10 w-0.5 ${complete ? "bg-purple-950" : "bg-slate-200"}`} />}
              <span className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${complete ? "border-purple-950 bg-purple-950 text-white" : current ? "border-yellow-400 bg-yellow-400 text-purple-950 shadow-[0_0_0_5px_rgba(255,199,0,.18)]" : "border-slate-200 bg-white text-slate-400"}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="pt-1">
                <p className={`text-sm font-extrabold ${complete || current ? "text-purple-950" : "text-slate-400"}`}>{stage.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{stage.description}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
