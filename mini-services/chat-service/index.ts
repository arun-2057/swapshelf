import { createServer } from 'http'
import { Server } from 'socket.io'

// ----- Types -----
interface ChatMessage {
  id: string
  loanId: string
  senderId: string
  senderName: string
  text: string
  createdAt: string
  type: 'user' | 'system'
  systemEvent?: string
}

// ----- Constants -----
const PORT = 3003 // Hardcoded per SwapShelf gateway contract
const HISTORY_CAP = 200 // Max messages stored per loan room

// ----- In-memory history (keyed by loanId) -----
const history = new Map<string, ChatMessage[]>()

// ----- Helpers -----
const genId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

const nowIso = (): string => new Date().toISOString()

const roomFor = (loanId: string): string => `loan:${loanId}`

const getHistory = (loanId: string): ChatMessage[] => {
  let arr = history.get(loanId)
  if (!arr) {
    arr = []
    history.set(loanId, arr)
  }
  return arr
}

const pushHistory = (loanId: string, msg: ChatMessage): void => {
  const arr = getHistory(loanId)
  arr.push(msg)
  // Cap stored history at HISTORY_CAP entries (shift oldest)
  while (arr.length > HISTORY_CAP) {
    arr.shift()
  }
}

const makeSystemMessage = (
  loanId: string,
  text: string,
  systemEvent: string
): ChatMessage => ({
  id: genId(),
  loanId,
  senderId: 'system',
  senderName: 'System',
  text,
  createdAt: nowIso(),
  type: 'system',
  systemEvent
})

// ----- HTTP + Socket.IO server -----
const httpServer = createServer((req, res) => {
  // Lightweight health endpoint for quick checks
  if (req.url && req.url.split('?')[0] === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, service: 'swapshelf-chat-service', port: PORT }))
    return
  }
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not Found' }))
})

const io = new Server(httpServer, {
  // DO NOT change the path — Caddy forwards /?XTransformPort=3003 to this
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000
})

// Track which loans a socket is currently in (for concise disconnect logs)
const socketLoans = new Map<string, Set<string>>()

io.on('connection', (socket) => {
  console.log(`[chat] connect ${socket.id}`)

  // Join a loan chat room
  socket.on('join-loan', (payload: { loanId: string; userId: string; name: string }) => {
    const { loanId, userId, name } = payload || {}
    if (!loanId || !userId || !name) return

    const room = roomFor(loanId)
    void socket.join(room)

    // Track loan membership for this socket
    let loans = socketLoans.get(socket.id)
    if (!loans) {
      loans = new Set<string>()
      socketLoans.set(socket.id, loans)
    }
    loans.add(loanId)

    // Broadcast a system presence message to the room
    const sysMsg = makeSystemMessage(
      loanId,
      `${name} joined the conversation`,
      'presence:join'
    )
    pushHistory(loanId, sysMsg)
    io.to(room).emit('message', sysMsg)

    // Send the in-memory history back to the joiner only
    socket.emit('loan-history', getHistory(loanId))

    console.log(`[chat] join-loan room=${room} user=${name}(${userId}) history=${getHistory(loanId).length}`)
  })

  // Leave a loan chat room
  socket.on('leave-loan', (payload: { loanId: string }) => {
    const { loanId } = payload || {}
    if (!loanId) return
    const room = roomFor(loanId)
    void socket.leave(room)

    const loans = socketLoans.get(socket.id)
    if (loans) loans.delete(loanId)

    console.log(`[chat] leave-loan room=${room} socket=${socket.id}`)
  })

  // Relay a user chat message to a loan room.
  //
  // The message is ALREADY persisted to the DB by the Next.js API
  // (POST /api/loans/[id]/messages) BEFORE this event is emitted, so
  // the payload carries the canonical DB-assigned id and createdAt.
  // Socket.io is strictly a real-time event pipeline here — the DB is
  // the single source of truth. We keep a best-effort in-memory cache
  // only so freshly-joining sockets get recent context fast.
  socket.on('send-message', (payload: {
    id: string
    loanId: string
    senderId: string
    senderName: string
    text: string
    createdAt: string
  }) => {
    const { id, loanId, senderId, senderName, text, createdAt } = payload || {}
    if (!id || !loanId || !senderId || !senderName) return
    const trimmed = (text || '').toString().trim()
    if (!trimmed) return

    const msg: ChatMessage = {
      id,
      loanId,
      senderId,
      senderName,
      text: trimmed,
      createdAt: createdAt || nowIso(),
      type: 'user'
    }
    pushHistory(loanId, msg)
    io.to(roomFor(loanId)).emit('message', msg)

    console.log(`[chat] send-message room=${roomFor(loanId)} from=${senderName}(${senderId}) len=${trimmed.length}`)
  })

  // Loan status change broadcast
  socket.on('loan-status', (payload: { loanId: string; status: string; by: string }) => {
    const { loanId, status, by } = payload || {}
    if (!loanId || !status) return
    const room = roomFor(loanId)

    const sysMsg = makeSystemMessage(
      loanId,
      `Loan status changed to ${status}`,
      'loan:status'
    )
    pushHistory(loanId, sysMsg)
    io.to(room).emit('message', sysMsg)
    io.to(room).emit('loan-status', { loanId, status, by })

    console.log(`[chat] loan-status room=${room} status=${status} by=${by}`)
  })

  // Meetup spot update broadcast
  socket.on('meetup-update', (payload: { loanId: string; name: string; address: string; by: string }) => {
    const { loanId, name, address, by } = payload || {}
    if (!loanId) return
    const room = roomFor(loanId)

    const sysMsg = makeSystemMessage(
      loanId,
      `Meetup spot updated: ${name || 'Unknown'}`,
      'meetup:update'
    )
    pushHistory(loanId, sysMsg)
    io.to(room).emit('message', sysMsg)
    io.to(room).emit('meetup-update', { loanId, name, address, by })

    console.log(`[chat] meetup-update room=${room} name=${name || ''} by=${by || ''}`)
  })

  // User notification broadcast — sends to a per-user room so only the
  // target user receives it. The client joins room `user:<userId>` on
  // connect. Used by the notification orchestrator for real-time toasts.
  socket.on('user-notification', (payload: {
    userId: string
    notification: {
      id: string
      type: string
      title: string
      message: string
      loanId: string | null
      createdAt: string
    }
  }) => {
    const { userId, notification } = payload || {}
    if (!userId || !notification) return

    const userRoom = `user:${userId}`
    io.to(userRoom).emit('notification', notification)

    console.log(`[chat] user-notification room=${userRoom} type=${notification.type}`)
  })

  // Join a user's personal notification room
  socket.on('join-user', (payload: { userId: string }) => {
    const { userId } = payload || {}
    if (!userId) return
    void socket.join(`user:${userId}`)
    console.log(`[chat] join-user user:${userId} socket=${socket.id}`)
  })

  socket.on('disconnect', () => {
    // Rooms auto-clean; do nothing destructive. Just log.
    const loans = socketLoans.get(socket.id)
    const loanCount = loans ? loans.size : 0
    socketLoans.delete(socket.id)
    console.log(`[chat] disconnect ${socket.id} rooms=${loanCount}`)
  })

  socket.on('error', (err: unknown) => {
    console.error(`[chat] socket error ${socket.id}:`, err)
  })
})

httpServer.listen(PORT, () => {
  console.log(`[chat] swapshelf-chat-service listening on port ${PORT} (path: /)`)
})

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`[chat] ${signal} received, shutting down...`)
  io.close(() => {
    httpServer.close(() => {
      process.exit(0)
    })
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
