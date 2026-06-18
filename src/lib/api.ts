"use client";

import type {
  User,
  Item,
  Loan,
  Message,
  DiscoverFilters,
} from "@/lib/types";

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    credentials: "same-origin",
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  // ---- Auth ----
  signup: (data: {
    name: string;
    email: string;
    password: string;
  }) =>
    request<User>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<User>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  logout: () => request<void>("/api/auth/logout", { method: "POST" }),

  me: () => request<User | null>("/api/auth/me"),

  // ---- Onboarding / profile ----
  setLocation: (data: {
    latitude: number;
    longitude: number;
    zipCode?: string;
    neighborhood?: string;
  }) => request<User>("/api/users/me/location", { method: "PATCH", body: JSON.stringify(data) }),

  updateProfile: (data: { name?: string; bio?: string; avatarUrl?: string }) =>
    request<User>("/api/users/me", { method: "PATCH", body: JSON.stringify(data) }),

  // ---- Items ----
  myItems: () => request<Item[]>("/api/items?scope=mine"),
  discover: (filters: DiscoverFilters) => {
    const params = new URLSearchParams({
      type: filters.type,
      condition: filters.condition,
      availability: filters.availability,
      radius: String(filters.radiusMiles),
      q: filters.query,
    });
    return request<Item[]>(`/api/items/discover?${params.toString()}`);
  },
  createItem: (data: Partial<Item> & { title: string; type: Item["type"] }) =>
    request<Item>("/api/items", { method: "POST", body: JSON.stringify(data) }),
  updateItem: (id: string, data: Partial<Item>) =>
    request<Item>(`/api/items/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteItem: (id: string) =>
    request<void>(`/api/items/${id}`, { method: "DELETE" }),

  // ---- Barcode lookup ----
  lookupBarcode: (code: string, type: "BOOK" | "BOARD_GAME") =>
    request<{ title: string; creator?: string; imageUrl?: string; found: boolean }>(
      `/api/barcode/lookup?code=${encodeURIComponent(code)}&type=${type}`
    ),

  // ---- Loans ----
  myLoans: () => request<Loan[]>("/api/loans"),
  requestLoan: (data: { itemId: string; proposedReturnDate: string }) =>
    request<Loan>("/api/loans", { method: "POST", body: JSON.stringify(data) }),
  updateLoanStatus: (id: string, status: string, extra?: Record<string, unknown>) =>
    request<Loan>(`/api/loans/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, ...extra }),
    }),
  setMeetup: (id: string, data: { name: string; address?: string; latitude: number; longitude: number }) =>
    request<Loan>(`/api/loans/${id}/meetup`, { method: "POST", body: JSON.stringify(data) }),
  agreeMeetup: (id: string) =>
    request<Loan>(`/api/loans/${id}/meetup`, { method: "PATCH", body: JSON.stringify({ action: "agree" }) }),

  // ---- Messages ----
  messages: (loanId: string) => request<Message[]>(`/api/loans/${loanId}/messages`),

  // ---- Reviews ----
  submitReview: (loanId: string, data: { rating: number; comment?: string }) =>
    request<{ revealed: boolean }>("/api/reviews", {
      method: "POST",
      body: JSON.stringify({ loanId, ...data }),
    }),

  // ---- User profile (public) ----
  getUser: (id: string) => request<{ user: User; reviews: import("@/lib/types").Review[] }>(`/api/users/${id}`),

  // ---- Seed ----
  seed: () => request<{ ok: boolean }>("/api/seed", { method: "POST" }),
};
