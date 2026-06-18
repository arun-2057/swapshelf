"use client";

import { create } from "zustand";
import type {
  AppView,
  User,
  Item,
  Loan,
  DiscoverFilters,
} from "@/lib/types";
import { api } from "@/lib/api";

interface AppState {
  // Auth
  user: User | null;
  authLoading: boolean;
  authError: string | null;

  // Navigation
  view: AppView;
  activeLoanId: string | null;
  activeItemId: string | null;

  // Data cache
  myItems: Item[];
  loans: Loan[];
  discoverItems: Item[];
  discoverLoading: boolean;

  // Filters
  filters: DiscoverFilters;

  // UI
  add_item_open: boolean;
  request_item_id: string | null;

  // Actions
  bootstrap: () => Promise<void>;
  doSignup: (name: string, email: string, password: string) => Promise<void>;
  doLogin: (email: string, password: string) => Promise<void>;
  doLogout: () => Promise<void>;
  setLocation: (lat: number, lon: number, zip?: string, neighborhood?: string) => Promise<void>;
  setView: (view: AppView) => void;
  openLoan: (loanId: string) => void;
  openItemRequest: (itemId: string | null) => void;
  setAddItemOpen: (open: boolean) => void;
  setFilters: (f: Partial<DiscoverFilters>) => void;
  refreshMyItems: () => Promise<void>;
  refreshLoans: () => Promise<void>;
  refreshDiscover: () => Promise<void>;
  upsertLoan: (loan: Loan) => void;
  patchLoan: (loanId: string, patch: Partial<Loan>) => void;
}

const defaultFilters: DiscoverFilters = {
  type: "ALL",
  condition: "ALL",
  availability: "available",
  radiusMiles: 3,
  query: "",
};

export const useApp = create<AppState>((set, get) => ({
  user: null,
  authLoading: true,
  authError: null,

  view: "landing",
  activeLoanId: null,
  activeItemId: null,

  myItems: [],
  loans: [],
  discoverItems: [],
  discoverLoading: false,

  filters: defaultFilters,

  add_item_open: false,
  request_item_id: null,

  bootstrap: async () => {
    set({ authLoading: true, authError: null });
    try {
      const user = await api.me();
      if (user) {
        const needsOnboarding = user.latitude === 0 && user.longitude === 0;
        set({
          user,
          view: needsOnboarding ? "onboarding" : "dashboard",
          authLoading: false,
        });
        void get().refreshMyItems();
        void get().refreshLoans();
      } else {
        set({ user: null, view: "landing", authLoading: false });
      }
    } catch {
      set({ user: null, view: "landing", authLoading: false });
    }
  },

  doSignup: async (name, email, password) => {
    set({ authError: null });
    try {
      const user = await api.signup({ name, email, password });
      set({ user, view: "onboarding" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Signup failed";
      set({ authError: msg });
      throw e;
    }
  },

  doLogin: async (email, password) => {
    set({ authError: null });
    try {
      const user = await api.login({ email, password });
      const needsOnboarding = user.latitude === 0 && user.longitude === 0;
      set({
        user,
        view: needsOnboarding ? "onboarding" : "dashboard",
      });
      void get().refreshMyItems();
      void get().refreshLoans();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Login failed";
      set({ authError: msg });
      throw e;
    }
  },

  doLogout: async () => {
    await api.logout();
    set({
      user: null,
      view: "landing",
      myItems: [],
      loans: [],
      discoverItems: [],
      activeLoanId: null,
    });
  },

  setLocation: async (lat, lon, zip, neighborhood) => {
    const user = await api.setLocation({
      latitude: lat,
      longitude: lon,
      zipCode: zip,
      neighborhood,
    });
    set({ user, view: "dashboard" });
    void get().refreshMyItems();
    void get().refreshLoans();
  },

  setView: (view) => set({ view }),
  openLoan: (loanId) => set({ activeLoanId: loanId, view: "loan" }),
  openItemRequest: (itemId) => set({ request_item_id: itemId }),
  setAddItemOpen: (open) => set({ add_item_open: open }),
  setFilters: (f) => {
    set({ filters: { ...get().filters, ...f } });
    void get().refreshDiscover();
  },

  refreshMyItems: async () => {
    try {
      const items = await api.myItems();
      set({ myItems: items });
    } catch {
      /* ignore */
    }
  },

  refreshLoans: async () => {
    try {
      const loans = await api.myLoans();
      set({ loans });
    } catch {
      /* ignore */
    }
  },

  refreshDiscover: async () => {
    set({ discoverLoading: true });
    try {
      const items = await api.discover(get().filters);
      set({ discoverItems: items, discoverLoading: false });
    } catch {
      set({ discoverLoading: false });
    }
  },

  upsertLoan: (loan) => {
    const loans = get().loans;
    const idx = loans.findIndex((l) => l.id === loan.id);
    if (idx >= 0) {
      const next = [...loans];
      next[idx] = loan;
      set({ loans: next });
    } else {
      set({ loans: [loan, ...loans] });
    }
  },

  patchLoan: (loanId, patch) => {
    const loans = get().loans.map((l) =>
      l.id === loanId ? { ...l, ...patch } : l
    );
    set({ loans });
  },
}));
