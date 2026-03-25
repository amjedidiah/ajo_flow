import { describe, it, expect, mock, afterEach } from "bun:test";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { createElement } from "react";

// ─── Mocks ──────────────────────────────────────────────────────────────────

mock.module("next/navigation", () => ({
  useRouter: () => ({ push: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

mock.module("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) =>
    createElement("a", { href, ...props }, children),
}));

mock.module("@/contexts/AuthContext", () => ({
  useAuthContext: () => ({
    user: null,
    hasToken: false,
    isInitialized: true,
    setAuth: () => {},
    clearAuth: () => {},
  }),
}));

mock.module("sonner", () => ({
  toast: { error: () => {}, success: () => {} },
}));

mock.module("@/lib/api", () => ({
  podsApi: { create: () => Promise.resolve({ data: {} }) },
}));

import PodBrowser from "@/components/pods/PodBrowser";

afterEach(cleanup);

// ─── Test data ──────────────────────────────────────────────────────────────

const pods = [
  {
    _id: "1",
    name: "Lagos Weekly Savers",
    contributionAmount: 5000,
    frequency: "weekly" as const,
    members: ["a", "b"],
    maxMembers: 4,
    status: "active" as const,
  },
  {
    _id: "2",
    name: "Daily Hustle Pod",
    contributionAmount: 2000,
    frequency: "daily" as const,
    members: ["a", "b", "c", "d"],
    maxMembers: 4,
    status: "active" as const,
  },
  {
    _id: "3",
    name: "Big Monthly Circle",
    contributionAmount: 50000,
    frequency: "monthly" as const,
    members: ["a"],
    maxMembers: 10,
    status: "active" as const,
  },
];

describe("PodBrowser", () => {
  it("renders the pod count", () => {
    render(<PodBrowser initialPods={pods} />);
    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText(/pods available/)).toBeDefined();
  });

  it("filters by search query", () => {
    render(<PodBrowser initialPods={pods} />);
    const search = screen.getByPlaceholderText("Search pods…");
    fireEvent.change(search, { target: { value: "Lagos" } });

    // Only "Lagos Weekly Savers" should match
    expect(screen.getByText("1")).toBeDefined(); // pod count
    expect(screen.getByText("Lagos Weekly Savers")).toBeDefined();
  });

  it("filters by frequency", () => {
    render(<PodBrowser initialPods={pods} />);
    const dailyBtn = screen.getByRole("button", { name: "daily" });
    fireEvent.click(dailyBtn);

    expect(screen.getByText("1")).toBeDefined(); // 1 pod
    expect(screen.getByText("Daily Hustle Pod")).toBeDefined();
  });

  it("filters by amount preset (≤ ₦5k)", () => {
    render(<PodBrowser initialPods={pods} />);
    const btn = screen.getByRole("button", { name: "≤ ₦5k" });
    fireEvent.click(btn);

    // 5000 and 2000 match ≤5k
    expect(screen.getByText("2")).toBeDefined();
  });

  it("filters by amount preset (₦20k+)", () => {
    render(<PodBrowser initialPods={pods} />);
    const btn = screen.getByRole("button", { name: "₦20k+" });
    fireEvent.click(btn);

    // Only 50000 matches
    expect(screen.getByText("1")).toBeDefined();
    expect(screen.getByText("Big Monthly Circle")).toBeDefined();
  });

  it("filters by open spots only", () => {
    render(<PodBrowser initialPods={pods} />);
    const openBtn = screen.getByRole("button", { name: "Open spots only" });
    fireEvent.click(openBtn);

    // Pod 2 is full (4/4), so only 2 pods remain
    expect(screen.getByText("2")).toBeDefined();
  });

  it("shows 'No pods found' when filters eliminate all", () => {
    render(<PodBrowser initialPods={pods} />);
    const search = screen.getByPlaceholderText("Search pods…");
    fireEvent.change(search, { target: { value: "zzzznonexistent" } });

    expect(screen.getByText("No pods found")).toBeDefined();
  });

  it("shows empty state message when no pods at all", () => {
    render(<PodBrowser initialPods={[]} />);
    expect(screen.getByText("No pods found")).toBeDefined();
    expect(screen.getByText(/Be the first to create one/)).toBeDefined();
  });

  it("links to login when user is not authenticated", () => {
    render(<PodBrowser initialPods={pods} />);
    // The Create Pod button should be a link to /login when not authenticated
    const createLink = screen.getByText("+ Create Pod").closest("a");
    expect(createLink).not.toBeNull();
    expect(createLink!.getAttribute("href")).toContain("/login");
  });
});
