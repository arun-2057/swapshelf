"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/store/app-store";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  Shield,
  Loader2,
  CloudOff,
  CloudCheck,
} from "lucide-react";

type ConnectionState = "connected" | "reconnecting" | "disconnected";

/**
 * NotificationListener + ConnectionStatusBanner.
 *
 * This component does two things:
 *   1. Maintains a global socket connection for user notifications.
 *   2. Exposes the connection state via a thin height-transitioning
 *      banner at the top of the screen so users always know when
 *      they're offline and their actions are being queued.
 *
 * The banner uses Framer Motion for the h-0 → h-8 height transition
 * and shows different copy + icons based on the state:
 *   - reconnecting: "Reconnecting… Your messages are being queued."
 *   - disconnected: "Offline — your actions will sync when you reconnect."
 *   - connected → back online: brief "Back online" flash, then hides.
 *
 * Mounted once in the AppShell (authenticated routes only).
 */
export function NotificationListener() {
  const { user } = useApp();
  const socketRef = useRef<Socket | null>(null);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connected");
  const [showBackOnline, setShowBackOnline] = useState(false);
  const wasConnected = useRef(true);

  useEffect(() => {
    if (!user?.id) return;

    const isDevPort3000 = typeof window !== "undefined" && window.location.port === "3000";
    const socketUrl = isDevPort3000 ? "http://localhost:3003" : "/?XTransformPort=3003";

    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      timeout: 10000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionState("connected");
      socket.emit("join-user", { userId: user.id });

      // If we were previously disconnected, flash "Back online"
      if (!wasConnected.current) {
        wasConnected.current = true;
        setShowBackOnline(true);
        setTimeout(() => setShowBackOnline(false), 2500);
      }
    });

    socket.io.on("reconnect_attempt", () => {
      setConnectionState("reconnecting");
      wasConnected.current = false;
    });

    socket.on("disconnect", () => {
      setConnectionState("disconnected");
      wasConnected.current = false;
    });

    socket.on("connect_error", () => {
      setConnectionState("reconnecting");
    });

    socket.on("notification", (notif: {
      id: string;
      type: string;
      title: string;
      message: string;
      loanId: string | null;
      createdAt: string;
    }) => {
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

      void api.notifications().catch(() => {});
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]);

  // The banner shows when: reconnecting, disconnected, or briefly
  // when coming back online.
  const showBanner =
    connectionState !== "connected" || showBackOnline;

  const bannerConfig = {
    reconnecting: {
      icon: Loader2,
      text: "Reconnecting… Your messages are being queued.",
      bg: "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300",
      animate: true,
    },
    disconnected: {
      icon: CloudOff,
      text: "Offline — your actions will sync when you reconnect.",
      bg: "bg-destructive/10 border-destructive/25 text-destructive",
      animate: false,
    },
    connected: {
      // Back online flash
      icon: CloudCheck,
      text: "Back online — all caught up!",
      bg: "bg-primary/10 border-primary/25 text-primary",
      animate: false,
    },
  };

  const config = showBackOnline
    ? bannerConfig.connected
    : bannerConfig[connectionState];
  const Icon = config.icon;

  return (
    <>
      {/* Connection status banner */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div
              className={`flex items-center justify-center gap-2 border-b px-4 py-1.5 text-xs font-medium ${config.bg}`}
            >
              <Icon
                className={`size-3.5 ${config.animate ? "animate-spin" : ""}`}
              />
              {config.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function getIconForType(type: string) {
  if (type.includes("LOAN") || type.includes("REQUEST")) return <MessageSquare className="size-4" />;
  if (type.includes("DISPUTE") || type.includes("STOLEN")) return <Shield className="size-4" />;
  if (type.includes("DUE") || type.includes("OVERDUE")) return <AlertTriangle className="size-4" />;
  return <CheckCircle className="size-4" />;
}
