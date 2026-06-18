"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";

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
  // Seeded history fetched from the API (so the room doesn't start empty)
  initialHistory?: ChatMessage[];
}

/**
 * Connects to the SwapShelf chat mini-service (port 3003 via Caddy
 * gateway). Manages room join/leave, message send/receive, and system
 * events for loan status + meetup changes.
 */
export function useChat({
  loanId,
  userId,
  userName,
  initialHistory = [],
}: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialHistory);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Reset history when loan changes
  useEffect(() => {
    // Intentional: reset local cache when switching loans
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages(initialHistory);
  }, [loanId, initialHistory]);

  useEffect(() => {
    if (!loanId || !userId || !userName) return;

    const socket = io("/?XTransformPort=3003", {
      transports: ["websocket", "polling"],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1200,
      timeout: 10000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join-loan", { loanId, userId, name: userName });
    });

    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));

    socket.on("loan-history", (data: { messages: ChatMessage[] }) => {
      if (data.messages && data.messages.length) {
        // Merge: prefer server history if we have no local messages yet
        setMessages((prev) =>
          prev.length === 0 ? data.messages : [...prev, ...data.messages.filter(m => !prev.some(p => p.id === m.id))]
        );
      }
    });

    socket.on("message", (msg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      socket.emit("leave-loan", { loanId });
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [loanId, userId, userName]);

  const sendMessage = useCallback(
    (text: string) => {
      const socket = socketRef.current;
      if (!socket || !loanId || !userId || !userName || !text.trim()) return;
      socket.emit("send-message", {
        loanId,
        userId,
        name: userName,
        text: text.trim(),
      });
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

  return { messages, sendMessage, connected, broadcastStatus, broadcastMeetup };
}
