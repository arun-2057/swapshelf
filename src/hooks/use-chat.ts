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
}

interface UseChatOptions {
  loanId: string | null;
  userId: string | null;
  userName: string | null;
}

/**
 * Resilient loan-chat hook implementing the POST-then-emit pattern.
 *
 * Architecture (DB = single source of truth, Socket.io = event pipeline):
 *   - On mount & on loan change: fetch canonical history from the DB
 *     (GET /api/loans/[id]/messages) into local state.
 *   - On send: POST the message to the DB (persist) → on success, append
 *     the canonical (DB-id'd) message locally, then emit it over the
 *     socket so the counterparty receives it in real time.
 *   - On socket `message`: append only if not already present (id-based
 *     deduplication — handles echoes of our own sends).
 *   - On socket `reconnect`: re-fetch DB history and merge by id to fill
 *     any gaps created while the connection was down.
 */
export function useChat({ loanId, userId, userName }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const loadTokenRef = useRef(0);
  const mountedRef = useRef(true);

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
          senderName:
            m.senderId === userId
              ? userName || "You"
              : "Neighbor",
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
        /* network errors are non-fatal; socket will keep trying */
      } finally {
        if (mountedRef.current && token === loadTokenRef.current) {
          setLoading(false);
        }
      }
    },
    [userId, userName]
  );

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

    // Reconnect listener: after a network drop, refetch DB history to
    // fill any gaps created while we were offline.
    const onReconnect = () => {
      void fetchHistory(loanId, { replace: false });
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
  }, [loanId, userId, userName, fetchHistory]);

  // ---- Send: persist first, then broadcast (POST-then-emit) ----
  const sendMessage = useCallback(
    async (text: string): Promise<boolean> => {
      const socket = socketRef.current;
      if (!loanId || !userId || !userName || !text.trim()) return false;

      const trimmed = text.trim();

      // 1. Optimistic local append with a temp ID so the UI feels instant.
      const optimisticId = `opt-${Date.now()}`;
      const optimistic: ChatMessage = {
        id: optimisticId,
        loanId,
        senderId: userId,
        senderName: userName,
        text: trimmed,
        createdAt: new Date().toISOString(),
        type: "user",
      };
      setMessages((prev) => [...prev, optimistic]);

      try {
        // 2. POST to the DB ledger — single source of truth.
        const saved = await api.sendMessage(loanId, trimmed);

        // 3. Replace the optimistic row with the canonical (DB-id'd) one.
        const canonical: ChatMessage = {
          id: saved.id,
          loanId: saved.loanId,
          senderId: saved.senderId,
          senderName: userName,
          text: saved.text,
          createdAt: saved.createdAt,
          type: "user",
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

        // 4. Broadcast over the socket so the counterparty gets it live.
        //    The socket server relays the canonical payload (with the
        //    DB-assigned id) — it does NOT write to the DB.
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
        // Persist failed — drop the optimistic row so we don't lie to
        // the user. They can retry.
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
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
    refresh: () => loanId && fetchHistory(loanId, { replace: false }),
  };
}
