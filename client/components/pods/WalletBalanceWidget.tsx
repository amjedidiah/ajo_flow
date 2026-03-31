"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Wallet,
  RefreshCw,
  AlertTriangle,
  Copy,
  Check,
  Building2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { podsApi } from "@/lib/api";
import { ngn } from "@/lib/helpers";
import { useAuthContext } from "@/contexts/AuthContext";

type WidgetState = "loading" | "hidden" | "error" | "ready" | "not_provisioned";

interface VirtualAccount {
  accountName: string;
  accountNumber: string;
  bankName: string;
  bankCode: string;
  accountPayableCode: string;
}

function CopyButton({ text }: Readonly<{ text: string }>) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-all"
      style={{
        background: copied
          ? "color-mix(in srgb, var(--color-brand-success) 12%, transparent)"
          : "color-mix(in srgb, var(--color-brand-accent) 10%, transparent)",
        color: copied
          ? "var(--color-brand-success)"
          : "var(--color-brand-accent)",
      }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function WalletBalanceWidget({
  podId,
  onProvisionWallet = async () => {},
  provisionLoading = false,
  isAdmin = false,
}: Readonly<{
  podId: string;
  onProvisionWallet?: () => Promise<void>;
  provisionLoading?: boolean;
  isAdmin?: boolean;
}>) {
  const { hasToken, isInitialized } = useAuthContext();
  const [showLedger, setShowLedger] = useState(false);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["wallet-balance", podId],
    queryFn: () => podsApi.walletBalance(podId).then((r) => r.data),
    refetchInterval: 30_000,
    enabled: isInitialized && hasToken,
    retry: 1,
  });

  const widgetState: WidgetState = useMemo(() => {
    if (isLoading) return "loading";
    else if (isError) return "error";
    else if (data?.balance === null) return "not_provisioned";
    else if (data) return "ready";

    return "loading";
  }, [data, isError, isLoading]);

  const balance = data?.balance ?? null;
  const ledgerBalance = data?.ledgerBalance ?? null;
  const virtualAccount: VirtualAccount | null = data?.virtualAccount ?? null;

  // Track balance changes to retrigger CSS animation via key swap
  const [balanceKey, setBalanceKey] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  useEffect(() => {
    if (balance === null) return;
    if (!hasLoaded) {
      setHasLoaded(true);
      return;
    }
    setBalanceKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balance]);

  if (!isInitialized || !hasToken) return null;

  if (widgetState === "loading") {
    return (
      <div className="bg-brand-card rounded-2xl border border-brand-border p-6 relative overflow-hidden animate-pulse">
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-brand-accent/30" />
        <div className="pl-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-brand-muted/20 rounded" />
              <div className="h-4 w-28 bg-brand-muted/20 rounded" />
            </div>
            <div className="h-3 w-14 bg-brand-muted/10 rounded" />
          </div>
          <div className="h-10 w-36 bg-brand-muted/20 rounded" />
          <div className="h-2.5 w-48 bg-brand-muted/10 rounded mt-2" />
        </div>
      </div>
    );
  }

  const header = (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Wallet size={16} className="text-brand-accent" />
        <span className="font-bold text-brand-text">Wallet</span>
      </div>
      <button
        onClick={() => refetch()}
        className="text-xs text-brand-muted hover:text-brand-primary flex items-center gap-1 transition-colors"
      >
        <RefreshCw
          size={12}
          className={isRefetching ? "animate-spin" : ""}
        />
        {isRefetching ? "Syncing…" : "Refresh"}
      </button>
    </div>
  );

  if (widgetState === "not_provisioned") {
    return (
      <div className="bg-brand-card rounded-2xl border border-brand-border p-6 relative overflow-hidden">
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{
            background:
              "linear-gradient(180deg, var(--color-brand-accent), var(--color-brand-accent-light))",
          }}
        />
        <div className="pl-3">
          {header}
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-brand-muted">
              No wallet provisioned yet.
            </p>
            {isAdmin && (
              <button
                onClick={onProvisionWallet}
                disabled={provisionLoading}
                className="shrink-0 hero-cta-primary px-4 py-2 rounded-xl font-semibold text-sm text-brand-primary relative overflow-hidden disabled:opacity-50"
              >
                <span className="relative z-10">
                  {provisionLoading ? "Provisioning…" : "Provision Wallet"}
                </span>
                <span className="hero-cta-shine" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (widgetState === "error") {
    return (
      <div className="bg-brand-card rounded-2xl border border-brand-border p-6 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-brand-danger" />
        <div className="pl-3">
          {header}
          <div className="flex items-center gap-2 text-sm text-brand-danger">
            <AlertTriangle size={14} className="shrink-0" />
            Could not fetch wallet balance.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-brand-card rounded-2xl border border-brand-border p-6 relative overflow-hidden">
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${isRefetching ? "animate-pulse" : ""}`}
        style={{
          background:
            "linear-gradient(180deg, var(--color-brand-accent), var(--color-brand-accent-light))",
        }}
      />
      <div className="pl-3">
        {header}

        {ledgerBalance !== null && (
          <div className="flex rounded-lg border border-brand-border overflow-hidden mb-3 text-xs font-semibold">
            <button
              onClick={() => setShowLedger(false)}
              className={`flex-1 px-3 py-1.5 transition-colors ${
                showLedger
                  ? "bg-brand-surface text-brand-muted hover:text-brand-text"
                  : "bg-brand-primary text-white"
              }`}
            >
              Interswitch
            </button>
            <button
              onClick={() => setShowLedger(true)}
              className={`flex-1 px-3 py-1.5 transition-colors ${
                showLedger
                  ? "bg-brand-primary text-white"
                  : "bg-brand-surface text-brand-muted hover:text-brand-text"
              }`}
            >
              Ledger
            </button>
          </div>
        )}

        <p
          key={`bal-${balanceKey}`}
          className="text-4xl font-black text-brand-primary animate-[balanceFlash_0.8s_ease-out]"
        >
          {ngn(showLedger ? (ledgerBalance ?? 0) : (balance ?? 0))}
        </p>
        <p className="text-xs text-brand-muted mt-1.5">
          {showLedger
            ? "Net balance (contributions minus payouts) — tracked internally."
            : "Live balance held in a wallet — not in any admin account."}
        </p>

        {virtualAccount && (
          <div
            className="mt-5 rounded-xl p-4"
            style={{
              background:
                "color-mix(in srgb, var(--color-brand-accent) 6%, var(--color-brand-surface))",
              border:
                "1px solid color-mix(in srgb, var(--color-brand-accent) 20%, transparent)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-3">
              <Building2 size={13} className="text-brand-accent" />
              <span className="text-xs font-semibold text-brand-accent uppercase tracking-wider">
                Pay via Bank Transfer
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xl font-black text-brand-primary tracking-wide">
                  {virtualAccount.accountNumber}
                </p>
                <p className="text-xs text-brand-muted mt-0.5">
                  {virtualAccount.bankName} · {virtualAccount.accountName}
                </p>
              </div>
              <CopyButton text={virtualAccount.accountNumber} />
            </div>
            <p className="text-xs text-brand-muted mt-3 leading-relaxed">
              Transfer your contribution directly to this account. Funds are
              credited automatically to the pod wallet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default WalletBalanceWidget;
