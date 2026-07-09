"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AppView, User, Item, Loan, DiscoverFilters } from "@/lib/types";
import { api } from "@/lib/api";

export type ActiveModal = "NONE" | "SCANNER" | "REVIEW" | "MEETUP" | "EXTENSION";

export type OutboxMessage = {
  tempId: string;
  loanId: string;
  text: string;
  createdAt: string;
};

interface AppState {
  user: User | null;
  authLoading: boolean;
  authError: string | null;

  view: AppView;
  activeLoanId: string | null;
  activeItemId: string | null;

  myItems: Item[];
  loans: Loan[];
  discoverItems: Item[];
  discoverLoading: boolean;

  filters: DiscoverFilters;

  activeModal: ActiveModal;
  modalContextId: string | null;
  isMobileNavOpen: boolean;
  add_item_open: boolean;
  request_item_id: string | null;

  outbox: OutboxMessage[];

  bootstrap: () => Promise<void>;
  doSignup: (name: string, email: string, password: string) => Promise<void>;
  doLogin: (email: string, password: string) => Promise<void>;
  doLogout: () => Promise<void>;
  setLocation: (lat: number, lon: number, zip?: string, neighborhood?: string) => Promise<void>;
  setView: (view: AppView) => void;
  openLoan: (loanId: string) => void;
  setActiveModal: (modal: ActiveModal, contextId?: string | null) => void;
  setMobileNavOpen: (isOpen: boolean) => void;
  openItemRequest: (itemId: string | null) => void;
  setAddItemOpen: (open: boolean) => void;
  setFilters: (f: Partial<AppState["filters"]>) => void;
  refreshMyItems: () => Promise<void>;
  refreshLoans: () => Promise<void>;
  refreshDiscover: () => Promise<void>;
  upsertLoan: (loan: Loan) => void;
  patchLoan: (loanId: string, patch: Partial<Loan>) => void;
  enqueueMessage: (message: OutboxMessage) => void;
  dequeueMessage: (tempId: string) => void;
  syncOutbox: () => Promise<void>;
}

const defaultFilters: DiscoverFilters = {
  type: "ALL",
  condition: "ALL",
  availability: "available",
  radiusMiles: 3,
  query: "",
};

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
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

      activeModal: "NONE",
      modalContextId: null,
      isMobileNavOpen: false,
      add_item_open: false,
      request_item_id: null,

      outbox: [],

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
          activeModal: "NONE",
          modalContextId: null,
          isMobileNavOpen: false,
          add_item_open: false,
          outbox: [],
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
      setActiveModal: (modal, contextId = null) =>
        set({
          activeModal: modal,
          modalContextId: contextId,
          add_item_open: modal === "SCANNER",
        }),
      setMobileNavOpen: (isOpen) => set({ isMobileNavOpen: isOpen }),
      openItemRequest: (itemId) => set({ request_item_id: itemId }),
      setAddItemOpen: (open) =>
        set({
          add_item_open: open,
          activeModal: open ? "SCANNER" : "NONE",
        }),
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

      enqueueMessage: (message) =>
        set((state) => ({ outbox: [...state.outbox, message] })),

      dequeueMessage: (tempId) =>
        set((state) => ({ outbox: state.outbox.filter((m) => m.tempId !== tempId) })),

      syncOutbox: async () => {
        const { outbox, dequeueMessage } = get();
        if (outbox.length === 0) return;

        for (const msg of outbox) {
          try {
            const res = await fetch("/api/loans/" + msg.loanId + "/messages", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: msg.text }),
            });

            if (res.ok) {
              dequeueMessage(msg.tempId);
            } else if (res.status === 403) {
              dequeueMessage(msg.tempId);
              console.error("Outbox message rejected: Account frozen");
            }
          } catch (error) {
            console.warn("Outbox sync delayed due to network error");
            break;
          }
        }
      },
    }),
    {
      name: "swapshelf-storage",
      partialize: (state) => ({ outbox: state.outbox }),
      storage: createJSONStorage(() => localStorage),
    }
  )
);
