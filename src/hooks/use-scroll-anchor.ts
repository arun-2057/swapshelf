"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Scroll-anchoring hook using IntersectionObserver.
 *
 * Tracks whether the user is parked at the bottom of a scrollable
 * container. When new messages arrive:
 *   - If at bottom → auto-scroll to follow new messages (smooth)
 *   - If reading history → don't jump; show a "New messages" pill
 *
 * Also handles initial load (snap to bottom without animation) and
 * height-delta compensation for prepended historical rows (reconnect
 * refetches) so the view stays anchored on the same message.
 */
export function useScrollAnchor<T extends HTMLElement>(
  messagesLength: number,
  loading: boolean = false
) {
  const scrollRef = useRef<T>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const didInitialJumpRef = useRef(false);
  const prevHeightRef = useRef(0);
  const prevScrollTopRef = useRef(0);

  // 1. IntersectionObserver: track if the bottom sentinel is visible
  useEffect(() => {
    const scrollEl = scrollRef.current;
    const bottomEl = bottomRef.current;
    if (!scrollEl || !bottomEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const atBottom = entry.isIntersecting;
        setIsAtBottom(atBottom);
        if (atBottom) setShowNewMessage(false);
      },
      {
        root: scrollEl,
        threshold: 0.1,
        rootMargin: "0px 0px 40px 0px", // treat "near bottom" as "at bottom"
      }
    );

    observer.observe(bottomEl);
    return () => observer.disconnect();
  }, []);

  // 2. Capture scroll geometry before DOM mutation (for height-delta
  //    compensation on prepended rows)
  const captureGeometry = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    prevHeightRef.current = el.scrollHeight;
    prevScrollTopRef.current = el.scrollTop;
  }, []);

  // 3. After DOM mutation: either snap to bottom, follow, or compensate
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Initial history load: snap to bottom instantly
    if (!didInitialJumpRef.current && !loading && messagesLength > 0) {
      el.scrollTop = el.scrollHeight;
      didInitialJumpRef.current = true;
      // Intentional: set state on initial load to establish baseline
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAtBottom(true);
      return;
    }

    if (isAtBottom) {
      // User is at bottom — follow new messages
      el.scrollTop = el.scrollHeight;
    } else {
      // User is reading history. If rows were prepended (reconnect
      // refetch), the content grew and the browser would keep scrollTop
      // fixed — shifting the user's view upward. Compensate by adding
      // the height delta so the same message stays in view.
      const newHeight = el.scrollHeight;
      const delta = newHeight - prevHeightRef.current;
      if (delta > 0) {
        el.scrollTop = prevScrollTopRef.current + delta;
      }
      // Show "New messages" pill if new messages arrived
      if (messagesLength > 0) setShowNewMessage(true);
    }
  }, [messagesLength, loading, isAtBottom]);

  // 4. Scroll-to-bottom helper (for the "New messages" pill click)
  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setIsAtBottom(true);
    setShowNewMessage(false);
  }, []);

  // 5. Reset state when switching loans
  const resetAnchor = useCallback(() => {
    didInitialJumpRef.current = false;
    setIsAtBottom(true);
    setShowNewMessage(false);
    prevHeightRef.current = 0;
    prevScrollTopRef.current = 0;
  }, []);

  return {
    scrollRef,
    bottomRef,
    isAtBottom,
    showNewMessage,
    scrollToBottom,
    captureGeometry,
    resetAnchor,
  };
}
