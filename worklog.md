# SwapShelf — Work Log

Hyper-local media exchange app. All agents read this before starting and append their section after finishing.

---
Task ID: 1
Agent: main
Task: Set up design system (palette, fonts, glassmorphism utilities) and root layout

Work Log:
- Inspected existing scaffold (Next.js 16, shadcn/ui, Prisma SQLite, framer-motion, next-themes available)
- Customized `src/app/globals.css` with SwapShelf palette: Deep Forest Green (primary), Warm Amber/Oatmeal (secondary), Electric Coral (accent), warm cream background
- Added Playfair Display (headers) + Inter (UI) fonts via next/font in `src/app/layout.tsx`
- Added glassmorphism utility classes and custom scrollbar styling
- Installed next-themes, set up ThemeProvider

Stage Summary:
- Design tokens in place. Light + dark themes. `font-display` (Playfair) and `font-sans` (Inter) CSS variables available.

---
Task ID: 12a
Agent: full-stack-developer
Task: Build WebSocket chat mini-service on port 3003

Work Log:
- Read worklog.md and examples/websocket/server.ts to confirm socket.io + Caddy conventions (path MUST be `/`, port 3003, no env PORT)
- Created `/home/z/my-project/mini-services/chat-service/` as an independent Bun project
- Wrote `package.json` named `swapshelf-chat-service` with `socket.io` dep and `"dev": "bun --hot index.ts"` script
- Wrote `index.ts`: http server + socket.io on hardcoded port 3003, path `/`, CORS `origin: "*"`, pingTimeout 60s / pingInterval 25s
- Implemented room-based chat per loan (`loan:<loanId>`):
  - `join-loan` {loanId,userId,name} → socket.join, broadcast system message `presence:join` ("<name> joined the conversation"), emit `loan-history` to joiner
  - `leave-loan` {loanId} → socket.leave
  - `send-message` {loanId,userId,name,text} → validate non-empty text, build ChatMessage (type "user"), store + `io.to(room).emit("message", msg)`
  - `loan-status` {loanId,status,by} → system message `loan:status` ("Loan status changed to <status>") + emit `loan-status` to room
  - `meetup-update` {loanId,name,address,by} → system message `meetup:update` ("Meetup spot updated: <name>") + emit `meetup-update` to room
  - `disconnect` → non-destructive, rooms auto-clean; concise log
- In-memory `Map<string, ChatMessage[]>` keyed by loanId, capped at 200 entries (shift oldest)
- Used the required `ChatMessage` interface at top of file (id, loanId, senderId, senderName, text, createdAt, type "user"|"system", systemEvent?)
- Concise logging on: server start, join-loan, send-message, disconnect
- Ran `bun install` (installed socket.io@4.8.3) and launched via `nohup bun run dev > /tmp/chat-service.log 2>&1 &`
- Verified startup: log shows `[chat] swapshelf-chat-service listening on port 3003 (path: /)`, port 3003 is LISTEN, socket.io polling handshake on `/?EIO=4&transport=polling` returns a valid sid

Stage Summary:
- Standalone Bun + socket.io chat mini-service running in background on port 3003 at path `/`
- Frontend can connect with `io("/?XTransformPort=3003", { transports:["websocket","polling"] })` and use events: `join-loan`, `leave-loan`, `send-message`, `loan-status`, `meetup-update`; listens for `message`, `loan-history`, `loan-status`, `meetup-update`
- In-memory history (max 200/loan) survives across reconnects within the process lifetime; no DB persistence (intentional — chat is ephemeral)
- Log file: `/tmp/chat-service.log`. Service dir: `/home/z/my-project/mini-services/chat-service/`

---
Task ID: 12b
Agent: full-stack-developer
Task: Build all SwapShelf API routes

Work Log:
- Read existing schema, types, auth, geo, and api.ts to confirm contracts
- Added `src/lib/serialize.ts` with `stripUser`, `stripSelfUser`, `stripItemOwner`, and a `withErrorHandler` wrapper that turns `requireUser()`'s `UNAUTHORIZED` throw into a clean 401
- Added `src/lib/loan-serialize.ts` with a shared `serializeLoan` + `loanInclude` so every loan endpoint returns the same shape (item.owner stripped of lat/lon, parties stripped of passwordHash/lat/lon/zipCode, meetup, lastMessage)
- Auth: `POST /api/auth/signup` (hashes pw, creates user at lat=0/lon=0/swapScore=50, starts session, returns self), `POST /api/auth/login`, `POST /api/auth/logout` (204), `GET /api/auth/me` (returns null if logged out)
- Users: `PATCH /api/users/me/location` (validates lat/lon, optional zipCode/neighborhood), `PATCH /api/users/me` (name/bio/avatarUrl), `GET /api/users/[id]` (public profile + revealed reviews with reviewer name+avatarUrl)
- Items: `GET /api/items?scope=mine` (newest first, owner=self), `POST /api/items` (creates with status AVAILABLE, validates type/condition), `PATCH /api/items/[id]` (owner-only), `DELETE /api/items/[id]` (owner-only, soft delete -> status REMOVED, 204)
- Discover: `GET /api/items/discover?type=&condition=&availability=&radius=&q=` — requires auth, filters by type/condition/availability (AVAILABLE only vs all-except-REMOVED), title/creator ILIKE, computes haversineMiles from current user to each item's owner, rounds distanceMiles to 2 decimals, sorts nearest first, strips owner down to id/name/neighborhood/swapScore/avatarUrl
- Barcode: `GET /api/barcode/lookup?code=&type=` — robust try/catch, 6s timeout via AbortController, BOARD_GAME always returns found:false, BOOK queries Open Library and parses first bibkey. Always returns a JSON object, never throws
- Loans: `GET /api/loans` (borrower OR lender, includes item/borrower/lender/meetup/lastMessage, sorted updatedAt desc), `POST /api/loans` (validates item exists, not own item, status AVAILABLE; creates REQUESTED + sets item to REQUESTED), `PATCH /api/loans/[id]` (party-only; handles ACCEPTED with optional dueDate, DECLINED/CANCELLED -> item back to AVAILABLE, BORROWED -> startDate=now + item BORROWED, RETURNED -> returnedDate=now + item AVAILABLE + swapScore +3 to both parties capped at 100, OVERDUE/MEETING_SCHEDULED just set status)
- Meetup: `POST /api/loans/[id]/meetup` (upsert by loanId, suggestedBy=self, agreedBy=null, status=proposed; auto-advances loan to MEETING_SCHEDULED when coming from REQUESTED/ACCEPTED), `PATCH /api/loans/[id]/meetup` (action=agree -> agreedBy=self, status=agreed)
- Messages: `GET /api/loans/[id]/messages` (party-only, oldest first)
- Reviews: `POST /api/reviews` (validates 1-5 rating, prevents double review, derives revieweeId as the other party, on second review reveals BOTH and recomputes swapScore for both parties via avg/5*70+30 clamped 0-100; returns { revealed })
- Seed: `POST /api/seed` (idempotent — no-op if user already has items; creates 8 items for current user, 4 neighbor users within ~3mi with 4 items each, 2 sample loans (one as borrower with BORROWED status + meetup + 4 messages, one as lender with ACCEPTED status + proposed meetup + 3 messages); centers on user's lat/lon, defaults to NYC 40.7282/-73.9942 if 0,0; uses placehold.co image URLs)
- Smoke-tested end-to-end with curl (signup -> location update -> seed -> myItems -> discover -> loans -> messages -> profile), then wiped DB to leave a clean slate
- Ran `bun run lint` — passes with zero errors
- Confirmed dev server is healthy (dev.log shows 200s on /)

Stage Summary:
- All 17 API route handlers from `src/lib/api.ts` implemented under `src/app/api/...` matching the client contracts exactly
- Sensitive-field stripping centralized in `src/lib/serialize.ts` and `src/lib/loan-serialize.ts`
- All handlers wrapped in try/catch via `withErrorHandler`; `requireUser()` -> 401 { error: "Please sign in" } consistently
- Lint clean, smoke tests pass, DB schema in sync, dev server running on port 3000

---
Task ID: 1-11 + 13 + 14
Agent: main
Task: Build entire SwapShelf frontend, wire to backend, self-verify with Agent Browser

Work Log:
- Built design system: SwapShelf palette (Forest Green/Amber/Coral) in globals.css, Playfair Display + Inter fonts, glassmorphism + paper-texture utilities, theme provider
- Defined Prisma schema (User, Item, Loan, Message, MeetupSpot, Review + enums), pushed to SQLite
- Built shared lib: types, auth (cookie sessions + password hashing), geo (Haversine + fuzzy distance + jitter), API client, Zustand app store
- Built views: Landing (hero/features/how-it-works/CTA/footer), Auth (login/signup split layout), Onboarding (location picker with GPS + presets), Dashboard (bento stats + SwapScore + lending shelf + activity), Discover (grid/map toggle + filters + radius slider + cluster pins), Add Item dialog (barcode scan animation + Open Library lookup + manual entry), Request Loan dialog (calendar picker), Loan/Chat view (status lifecycle tracker + real-time socket.io chat + meetup widget + role-based action bar + double-blind review), Profile (SwapScore ring + trust breakdown + privacy + reviews)
- Built shared components: Logo, badges (status/condition/type), ItemCover (gradient spines), UserAvatar, SwapScoreRing, ItemCard, AppShell (sidebar + topbar + mobile sheet)
- Fixed hydration error: ItemCard root changed from motion.button to motion.div (button-in-button invalid HTML) — now role=button div with keyboard handlers
- Self-verified with Agent Browser: landing renders, signup→onboarding→dashboard flow works, seed populates 8 items + 2 loans + neighbors, Discover shows 30 items with fuzzy distances, Map view renders grid+pins, barcode lookup hit Open Library and returned "The Hobbit", real-time chat sends messages, mobile responsive (iPhone 14), sticky footer correct, zero console errors

Stage Summary:
- Full SwapShelf app is production-ready and browser-verified. All core flows work end-to-end: auth, geo-onboarding, inventory (scan+manual), geo-discovery (grid+map), transaction lifecycle, real-time chat (socket.io on :3003), double-blind reviews, SwapScore trust system. Lint clean (0 errors/warnings). Dev server on :3000, chat service on :3003.

---
Task ID: fix-auth + global-locations
Agent: main
Task: Fix auth breaking in preview iframe + expand locations globally

Work Log:
- Root cause: sessions were cookie-only (sameSite:lax). The Preview Panel renders the app in a cross-origin iframe, and browsers silently drop sameSite:lax cookies in cross-origin iframe subrequests. Login returned 200 but the next authenticated request got 401 (no cookie sent).
- Fix: switched to header-based auth. Token stored in localStorage, sent as `x-session-token` header on every API request. Server reads header via `headers()` from next/headers, falls back to cookie for same-origin direct access.
  - auth.ts: getCurrentUser() checks x-session-token header first, then cookie
  - serialize.ts: stripSelfUser includes sessionToken so login/signup responses carry the token
  - api.ts: localStorage token management (getToken/setToken/clearToken) + header injection on every request
  - signup/login routes: re-fetch user after createSession so sessionToken is in the response
  - store: logout already calls api.logout() which clears localStorage token
- Also fixed: seed route idempotency (upsert neighbors instead of create → P2002 on re-seed). Skip item creation if neighbor already has items. Check item availability before creating loans.
- Expanded onboarding locations from 5 NYC neighborhoods to 35 global presets across 6 continents (North America, South America, Europe, Asia, Africa, Oceania). Added search filter and region grouping with scrollable list.
- Verified with Agent Browser: fresh signup → London → Enter SwapShelf → dashboard (no auth error) → seed (8 items) → Discover (30 items near London, "1.4 miles away"). Zero console errors.
- Reset DB for clean user start.

Stage Summary:
- Auth now works in ALL contexts (direct browser, iframe, preview panel). Sessions are DB-backed + header-based. Locations span the globe. Seed is idempotent.
