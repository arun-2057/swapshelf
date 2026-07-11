"use client";

import type {
  User,
  Item,
  Loan,
  Message,
  DiscoverFilters,
} from "@/lib/types";

// ---- Token management ----
// We store the session token in localStorage and send it as an
// x-session-token header on every request. This works in ALL browser
// contexts — including cross-origin iframes (like the preview panel)
// where sameSite cookies are silently dropped.
const TOKEN_KEY = "swapshelf_token";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options?.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers["x-session-token"] = token;
  }

  const res = await fetch(url, {
    ...options,
    headers,
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
    latitude?: number;
    longitude?: number;
    zipCode?: string;
    neighborhood?: string;
  }) =>
    request<User>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    }).then((user) => {
      if (user.sessionToken) setToken(user.sessionToken);
      return user;
    }),

  login: (data: { email: string; password: string }) =>
    request<User>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }).then((user) => {
      if (user.sessionToken) setToken(user.sessionToken);
      return user;
    }),

  logout: () => {
    clearToken();
    return request<void>("/api/auth/logout", { method: "POST" });
  },

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
  sendMessage: (loanId: string, text: string) =>
    request<Message>(`/api/loans/${loanId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  // ---- Return verification ----
  verifyReturn: (
    id: string,
    data: {
      conditionRating: "EXCELLENT" | "GOOD" | "DAMAGED";
      missingComponents: string[];
      notes?: string;
      evidenceImageUrl?: string;
      status: "PASSED" | "DISPUTED";
    }
  ) =>
    request<Loan>(`/api/loans/${id}/verify-return`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ---- Report stolen/lost ----
  reportStolen: (id: string, notes?: string) =>
    request<Loan>(`/api/loans/${id}/report-stolen`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    }),

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

  // ---- Notifications ----
  notifications: () =>
    request<{
      notifications: Array<{
        id: string;
        type: string;
        title: string;
        message: string;
        read: boolean;
        loanId: string | null;
        createdAt: string;
      }>;
      unreadCount: number;
    }>("/api/notifications"),
  markNotificationsRead: (id?: string) =>
    request<{ success: boolean }>("/api/notifications", {
      method: "PATCH",
      body: JSON.stringify(id ? { id } : {}),
    }),

  // ---- Admin / Moderation ----
  adminDisputes: () =>
    request<{
      disputes: Array<{
        id: string;
        status: string;
        title: string;
        type: string;
        imageUrl: string | null;
        flagged: boolean;
        borrower: { id: string; name: string; email: string; swapScore: number; frozen: boolean; neighborhood: string | null };
        lender: { id: string; name: string; email: string; swapScore: number; frozen: boolean; neighborhood: string | null };
        dueDate: string | null;
        resolvedAt: string | null;
        moderatorId: string | null;
        createdAt: string;
        updatedAt: string;
        returnVerification: {
          id: string;
          conditionRating: string;
          missingComponents: string[];
          notes: string | null;
          evidenceImageUrl: string | null;
          status: string;
          createdAt: string;
        } | null;
        recentMessages: Array<{
          id: string;
          senderId: string;
          senderName: string;
          text: string;
          systemEvent: string | null;
          createdAt: string;
        }>;
      }>;
      moderator: { id: string; name: string; role: string };
    }>("/api/admin/disputes"),
  adminResolve: (loanId: string, action: "AWARD_LENDER" | "CLOSE_WITHOUT_PENALTY" | "BAN_USER") =>
    request<{ success: boolean; loan: { id: string; status: string } }>("/api/admin/resolve", {
      method: "POST",
      body: JSON.stringify({ loanId, action }),
    }),
  adminMessages: (loanId: string) =>
    request<Array<{
      id: string;
      loanId: string;
      senderId: string;
      senderName: string;
      senderAvatarUrl: string | null;
      text: string;
      systemEvent: string | null;
      isSystem: boolean;
      createdAt: string;
    }>>(`/api/admin/messages/${loanId}`),
};
