"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { useApp } from "@/store/app-store";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Bell, CheckCircle, AlertTriangle, MessageSquare, Shield } from "lucide-react";

/**
 * NotificationListener — a global component that connects to the
 * Socket.io mini-service, joins the user's personal notification room,
 * and listens for incoming notifications. When one arrives:
 *   1. Shows a toast (Sonner) with an appropriate icon
 *   2. Triggers a refetch of the notification badge count
 *
 * Mounted once in the AppShell (authenticated routes only).
 */
export function NotificationListener() {
  const { user } = useApp();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const socket = io("/?XTransformPort=3003", {
      transports: ["websocket", "polling"],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      timeout: 10000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-user", { userId: user.id });
    });

    socket.on("notification", (notif: {
      id: string;
      type: string;
      title: string;
      message: string;
      loanId: string | null;
      createdAt: string;
    }) => {
      // 1. Show toast with type-appropriate icon
      const icon = getIconForType(notif.type);
      const variant = notif.type.includes("BAN") || notif.type.includes("STOLEN")
        ? "error"
        : notif.type.includes("DISPUTE")
          ? "warning"
          : "success";

      if (variant === "error") {
        toast.error(notif.title, { description: notif.message, icon });
      } else if (variant === "warning") {
        toast.warning(notif.title, { description: notif.message, icon });
      } else {
        toast.success(notif.title, { description: notif.message, icon });
      }

      // 2. Trigger a refetch of the notification badge by calling the API
      //    (the app-shell's bell button will pick this up on next render)
      void api.notifications().catch(() => {});
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]);

  return null;
}

function getIconForType(type: string) {
  if (type.includes("LOAN") || type.includes("REQUEST")) return <MessageSquare className="size-4" />;
  if (type.includes("DISPUTE") || type.includes("STOLEN")) return <Shield className="size-4" />;
  if (type.includes("DUE") || type.includes("OVERDUE")) return <AlertTriangle className="size-4" />;
  return <CheckCircle className="size-4" />;
}
