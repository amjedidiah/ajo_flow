"use client";

import { useEffect, useState } from "react";
import { Wallet, CheckCircle2, CircleDot, Clock, Minus } from "lucide-react";
import { Pod } from "./PodHeroHeader";
import { ngn } from "@/lib/helpers";
import { podsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface PayoutCycle {
  cycle: number;
  recipientName: string;
  amount: number;
  isPartial?: boolean;
}

function PoolProgress({ pod }: Readonly<{ pod: Pod }>) {
  const [payouts, setPayouts] = useState<PayoutCycle[]>([]);

  useEffect(() => {
    podsApi
      .payoutHistory(pod._id)
      .then(({ data }) => setPayouts(data))
      .catch(() => {});
  }, [pod._id]);

  const totalCycles = pod.maxMembers;
  const cycleGoal = pod.contributionAmount * pod.maxMembers;
  const progress = Math.min((pod.currentCycleTotal / cycleGoal) * 100, 100);

  const cycles = Array.from({ length: totalCycles }, (_, i) => {
    const num = i + 1;
    const payout = payouts.find((p) => p.cycle === num);
    const isCurrent = num === pod.currentCycle;
    const isCompleted = payout != null;
    const isUpcoming = !isCompleted && !isCurrent;
    return { num, payout, isCurrent, isCompleted, isUpcoming };
  });

  return (
    <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
      <div className="flex items-center gap-1.5 mb-3">
        <Wallet size={14} className="text-brand-accent" />
        <span className="text-sm font-semibold text-brand-text">
          Cycle Progress
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory -mx-1 px-1">
        {cycles.map(({ num, payout, isCurrent, isCompleted, isUpcoming }) => (
          <div
            key={num}
            className={cn(
              "snap-start shrink-0 w-[170px] rounded-xl border p-3.5 flex flex-col gap-2",
              {
                "border-brand-accent/40 bg-brand-accent/5": isCurrent,
                "border-brand-border bg-brand-surface":
                  !isCurrent && isCompleted,
                "border-brand-border/50 bg-brand-surface/50":
                  !isCurrent && !isCompleted,
              },
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-muted">
                Cycle {num}
              </span>
              {isCompleted &&
                (payout?.isPartial ? (
                  <CircleDot size={14} className="text-brand-warning" />
                ) : (
                  <CheckCircle2 size={14} className="text-brand-success" />
                ))}
              {isCurrent && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-brand-accent">
                  <Clock size={10} />
                  Active
                </span>
              )}
              {isUpcoming && (
                <Minus size={14} className="text-brand-muted/30" />
              )}
            </div>

            {isCompleted && payout && (
              <>
                <p className="text-sm font-semibold text-brand-text truncate">
                  {payout.recipientName}
                </p>
                <p
                  className={`text-xs font-bold ${
                    payout.isPartial
                      ? "text-brand-warning"
                      : "text-brand-success"
                  }`}
                >
                  {ngn(payout.amount)}
                  {payout.isPartial && (
                    <span className="font-normal text-brand-warning/70">
                      {" "}
                      (partial)
                    </span>
                  )}
                </p>
              </>
            )}

            {isCurrent && (
              <>
                <div className="w-full h-1.5 bg-brand-surface rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${progress}%`,
                      background:
                        "linear-gradient(90deg, var(--color-brand-accent), var(--color-brand-accent-light))",
                    }}
                  />
                </div>
                <p className="text-xs text-brand-muted">
                  {ngn(pod.currentCycleTotal)}{" "}
                  <span className="text-brand-muted/60">
                    of {ngn(cycleGoal)}
                  </span>{" "}
                  · {Math.round(progress)}%
                </p>
              </>
            )}

            {isUpcoming && (
              <p className="text-xs text-brand-muted/50">Upcoming</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PoolProgress;
