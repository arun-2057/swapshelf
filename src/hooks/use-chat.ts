"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { api } from "@/lib/api";

export interface ChatMessage {
  id: string;
  loanId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  type: "user" | "system";
  systemEvent?: string;
  pending?: boolean; // true while in the outbox (not yet persisted)
}

interface UseChatOptions {
  loanId: string | null;
  userId: string | null;
  userName: string | null;
}

// ---- Persistent Outbox (localStorage) ----
// When a message fails to send (network error), it's queued here.
// On reconnect or app boot, the queue is flushed. This prevents the
// "disappearing message" frustration when a user loses signal.
const OUTBOX_KEY = "swapshelf_outbox";

interface OutboxEntry {
  loanId: string;
  userId: string;
  userName: string;
  text: string;
  tempId: string;
  createdAt: string;
}

function getOutbox(): OutboxEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) || "[]");
  } catch {
    return [];
  }
}

function setOutbox(entries: OutboxEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(entries));
  } catch {
    /* storage full or unavailable */
  }
}

function addToOutbox(entry: OutboxEntry) {
  const current = getOutbox();
  setOutbox([...current, entry]);
}

function removeFromOutbox(tempId: string) {
  const current = getOutbox();
  setOutbox(current.filter((e) => e.tempId !== tempId));
}

/**
 * Resilient loan-chat hook with Persistent Outbox.
 *
 * Architecture (DB = single source of truth, Socket.io = event pipeline):
 *   - On mount & on loan change: fetch canonical history from the DB
 *   - On send: POST to DB → replace optimistic → emit over socket
 *   - On send FAILURE: queue to localStorage outbox (message stays
 *     visible with a "pending" indicator). On reconnect, the outbox
 *     is flushed automatically.
 *   - On socket `message`: append only if not already present (dedup)
 *   - On socket `reconnect`: refetch DB history + flush outbox
 */
export function useChat({ loanId, userId, userName }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const loadTokenRef = useRef(0);
  const mountedRef = useRef(true);
  const flushingRef = useRef(false);

  // ---- DB history fetch + merge ----
  const fetchHistory = useCallback(
    async (loanId: string, opts?: { replace?: boolean }) => {
      const token = ++loadTokenRef.current;
      try {
        const msgs = await api.messages(loanId);
        if (!mountedRef.current || token !== loadTokenRef.current) return;
        const mapped: ChatMessage[] = msgs.map((m) => ({
          id: m.id,
          loanId: m.loanId,
          senderId: m.senderId,
          senderName: m.senderId === userId ? userName || "You" : "Neighbor",
          text: m.text,
          createdAt: m.createdAt,
          type: m.systemEvent ? "system" : "user",
          systemEvent: m.systemEvent || undefined,
        }));
        setMessages((prev) => {
          if (opts?.replace) return mapped;
          const seen = new Set(prev.map((m) => m.id));
          const merged = [...prev];
          for (const m of mapped) {
            if (!seen.has(m.id)) {
              merged.push(m);
              seen.add(m.id);
            }
          }
          merged.sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          return merged;
        });
      } catch {
        /* non-fatal */
      } finally {
        if (mountedRef.current && token === loadTokenRef.current) {
          setLoading(false);
        }
      }
    },
    [userId, userName]
  );

  // ---- Flush the persistent outbox ----
  const flushOutbox = useCallback(async () => {
    if (flushingRef.current || !loanId || !userId || !userName) return;
    flushingRef.current = true;
    try {
      const entries = getOutbox().filter((e) => e.loanId === loanId);
      for (const entry of entries) {
        try {
          const saved = await api.sendMessage(entry.loanId, entry.text);
          const canonical: ChatMessage = {
            id: saved.id,
            loanId: saved.loanId,
            senderId: saved.senderId,
            senderName: entry.userName,
            text: saved.text,
            createdAt: saved.createdAt,
            type: "user",
          };
          setMessages((prev) =>
            prev
              .filter((m) => m.id !== entry.tempId)
              .concat(canonical)
              .sort(
                (a, b) =>
                  new Date(a.createdAt).getTime() -
                  new Date(b.createdAt).getTime()
              )
          );
          removeFromOutbox(entry.tempId);

          // Broadcast the flushed message
          const socket = socketRef.current;
          if (socket && socket.connected) {
            socket.emit("send-message", {
              id: saved.id,
              loanId: saved.loanId,
              senderId: saved.senderId,
              senderName: entry.userName,
              text: saved.text,
              createdAt: saved.createdAt,
            });
          }
        } catch {
          break; // still offline — leave in outbox for next attempt
        }
      }
    } finally {
      flushingRef.current = false;
    }
  }, [loanId, userId, userName]);

  // ---- Restore pending outbox messages for this loan on mount ----
  useEffect(() => {
    if (!loanId || !userId) return;
    const pending = getOutbox().filter((e) => e.loanId === loanId);
    if (pending.length > 0) {
      setMessages((prev) => [
        ...prev,
        ...pending.map((e) => ({
          id: e.tempId,
          loanId: e.loanId,
          senderId: e.userId,
          senderName: e.userName,
          text: e.text,
          createdAt: e.createdAt,
          type: "user" as const,
          pending: true,
        })),
      ]);
    }
  }, [loanId, userId]);

  // ---- Load history on loan change ----
  useEffect(() => {
    mountedRef.current = true;
    if (!loanId) {
      setMessages([]);
      setLoading(false);
      return () => {
        mountedRef.current = false;
      };
    }
    setLoading(true);
    setMessages([]);
    void fetchHistory(loanId, { replace: true });
    return () => {
      mountedRef.current = false;
    };
  }, [loanId, fetchHistory]);

  // ---- Socket lifecycle ----
  useEffect(() => {
    if (!loanId || !userId || !userName) return;

    const socket = io("/?XTransformPort=3003", {
      transports: ["websocket", "polling"],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1200,
      reconnectionDelayMax: 8000,
      timeout: 10000,
    });
    socketRef.current = socket;

    const onConnect = () => {
      setConnected(true);
      socket.emit("join-loan", { loanId, userId, name: userName });
    };
    const onDisconnect = () => setConnected(false);
    const onConnectError = () => setConnected(false);

    // Reconnect listener: refetch DB history + flush outbox
    const onReconnect = () => {
      void fetchHistory(loanId, { replace: false });
      void flushOutbox();
    };

    socket.on("connect", onConnect);
    socket.on("reconnect", onReconnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    socket.on("loan-history", (data: { messages: ChatMessage[] }) => {
      if (!data.messages || !data.messages.length) return;
      const seen = new Set<string>();
      setMessages((prev) => {
        for (const m of prev) seen.add(m.id);
        const merged = [...prev];
        for (const m of data.messages!) {
          if (!seen.has(m.id)) {
            merged.push(m);
            seen.add(m.id);
          }
        }
        merged.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        return merged;
      });
    });

    socket.on("message", (msg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        const merged = [...prev, msg];
        merged.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        return merged;
      });
    });

    return () => {
      socket.emit("leave-loan", { loanId });
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [loanId, userId, userName, fetchHistory, flushOutbox]);

  // ---- Send: persist first, then broadcast (POST-then-emit) ----
  // On failure: queue to localStorage outbox (message stays visible
  // with pending=true). Flushed on reconnect.
  const sendMessage = useCallback(
    async (text: string): Promise<boolean> => {
      const socket = socketRef.current;
      if (!loanId || !userId || !userName || !text.trim()) return false;

      const trimmed = text.trim();
      const optimisticId = `opt-${Date.now()}`;
      const now = new Date().toISOString();

      // 1. Optimistic local append (pending=true until persisted)
      const optimistic: ChatMessage = {
        id: optimisticId,
        loanId,
        senderId: userId,
        senderName: userName,
        text: trimmed,
        createdAt: now,
        type: "user",
        pending: true,
      };
      setMessages((prev) => [...prev, optimistic]);

      try {
        // 2. POST to the DB ledger
        const saved = await api.sendMessage(loanId, trimmed);

        // 3. Replace optimistic with canonical (clear pending)
        const canonical: ChatMessage = {
          id: saved.id,
          loanId: saved.loanId,
          senderId: saved.senderId,
          senderName: userName,
          text: saved.text,
          createdAt: saved.createdAt,
          type: "user",
          pending: false,
        };
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== optimisticId)
            .concat(canonical)
            .sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
            )
        );

        // 4. Broadcast over socket
        if (socket && socket.connected) {
          socket.emit("send-message", {
            id: saved.id,
            loanId,
            senderId: userId,
            senderName: userName,
            text: saved.text,
            createdAt: saved.createdAt,
          });
        }
        return true;
      } catch {
        // 5. Persist failed — DON'T drop the message. Queue to the
        //    persistent outbox so it survives navigation + app reload.
        //    The message stays visible with pending=true (shows a
        //    "sending..." indicator). On reconnect, flushOutbox()
        //    will retry the POST and swap the temp ID for the real one.
        addToOutbox({
          loanId,
          userId,
          userName,
          text: trimmed,
          tempId: optimisticId,
          createdAt: now,
        });
        return false;
      }
    },
    [loanId, userId, userName]
  );

  const broadcastStatus = useCallback(
    (status: string) => {
      const socket = socketRef.current;
      if (!socket || !loanId) return;
      socket.emit("loan-status", { loanId, status, by: userId });
    },
    [loanId, userId]
  );

  const broadcastMeetup = useCallback(
    (name: string, address?: string) => {
      const socket = socketRef.current;
      if (!socket || !loanId) return;
      socket.emit("meetup-update", { loanId, name, address, by: userId });
    },
    [loanId, userId]
  );

  return {
    messages,
    sendMessage,
    connected,
    loading,
    broadcastStatus,
    broadcastMeetup,
    flushOutbox,
    refresh: () => loanId && fetchHistory(loanId, { replace: false }),
  };
}
