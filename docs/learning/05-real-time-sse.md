# 5. Real-time dengan SSE (Server-Sent Events)

## Kenapa SSE bukan WebSocket?

| Aspek | SSE | WebSocket |
|-------|-----|-----------|
| Arah | Server → Client (one-way) | Bidirectional |
| Protocol | HTTP (standar) | Upgrade dari HTTP |
| Reconnect | Built-in (native) | Manual implementation |
| Browser API | `EventSource` (simpel) | `WebSocket` (lebih kompleks) |
| Proxy/CDN | Jalan di semua HTTP proxy | Bisa bermasalah |
| Use case cocok | Notifikasi, feed, live updates | Chat, game, kolaborasi |

Untuk Kanban board: client hanya perlu **menerima** update dari server (event task dibuat/dipindah/dihapus) — tidak perlu mengirim. SSE cukup + lebih simpel.

## Arsitektur SSE

```
┌────────────────────────────────────────────────┐
│                  Go Backend                      │
│  ┌──────────────────────────────────────────┐  │
│  │              SSE Hub                      │  │
│  │  watchers: map[boardID] → set[channel]   │  │
│  │                                           │  │
│  │  subscribe(boardID)  → channel           │  │
│  │  publish(boardID, payload)               │  │
│  │  unsubscribe(boardID, channel)           │  │
│  └──────────────┬───────────────────────────┘  │
│                 │                                │
│  publishBoardEvent(boardID, type, data)         │
│  ┌──────────────────────────────────────────┐  │
│  │  boardEvent{                              │  │
│  │    Type: "task.created",                  │  │
│  │    BoardID: "b-123",                      │  │
│  │    Data: { id, title, column_id, ... }    │  │
│  │  }                                        │  │
│  │  → json.Marshal → hub.publish(...)        │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
         │
         │  HTTP GET /api/boards/:id/events
         │  Content-Type: text/event-stream
         ▼
┌─────────────────────────────────────────────────┐
│              Browser (EventSource)               │
│                                                   │
│  event: message                                   │
│  data: {"type":"task.created","data":{...}}       │
│                                                   │
│  → useBoardEvents hook → store.applyTaskEvent()   │
└─────────────────────────────────────────────────┘
```

## Backend: SSE Endpoint

```go
func (s *server) boardEvents(c *gin.Context) {
    boardID := c.Param("id")
    // Verifikasi user owns this board
    s.ensureBoardOwnership(ctx, userID, boardID)

    // Subscribe ke hub
    stream := s.hub.subscribe(boardID)
    defer s.hub.unsubscribe(boardID, stream)

    // Set SSE headers
    c.Writer.Header().Set("Content-Type", "text/event-stream")
    c.Writer.Header().Set("Cache-Control", "no-cache")
    c.Writer.Header().Set("Connection", "keep-alive")

    // Keep-alive: ping setiap 20 detik
    ticker := time.NewTicker(20 * time.Second)

    // Stream loop
    c.Stream(func(w io.Writer) bool {
        select {
        case msg := <-stream:
            c.SSEvent("message", string(msg))  // kirim event ke client
            return true                         // lanjutkan stream
        case <-ticker.C:
            c.SSEvent("ping", "keep-alive")     // heartbeat
            return true
        case <-c.Request.Context().Done():
            return false                        // client disconnect
        }
    })
}
```

**Kenapa ping tiap 20 detik?** Proxy/load balancer sering menutup koneksi idle. Ping periodik menjaga koneksi tetap hidup.

## Backend: Publish Events

Event dipublish setelah setiap mutasi:

```go
// Setelah INSERT task
s.publishBoardEvent(boardID, "task.created", task)

// Setelah UPDATE task (column berubah)
s.publishBoardEvent(boardID, "task.moved", current)

// Setelah UPDATE task (data berubah)
s.publishBoardEvent(boardID, "task.updated", current)

// Setelah DELETE task
s.publishBoardEvent(boardID, "task.deleted", map[string]string{"task_id": taskID})
```

Event payload dikirim sebagai JSON:

```json
{"type":"task.created","board_id":"b-123","data":{"id":"t-456","title":"Fix bug","column_id":"c-789","position":0, ...}}
```

## Frontend: useBoardEvents Hook

```typescript
export function useBoardEvents(boardId: string) {
  const { applyTaskEvent, removeTaskFromStore, fetchBoard } = useKanbanStore()

  useEffect(() => {
    const token = localStorage.getItem('token')
    // EventSource tidak support custom headers — token via query param
    const es = new EventSource(
      `${API_URL}/api/boards/${boardId}/events?token=${token}`
    )

    es.onmessage = (e) => {
      const { type, data } = JSON.parse(e.data)

      switch (type) {
        case 'task.created':
        case 'task.updated':
        case 'task.moved':
          applyTaskEvent(data)        // upsert task di store
          break
        case 'task.deleted':
          removeTaskFromStore(data.task_id)
          break
        default:
          // board.updated, column.updated → full refetch
          fetchBoard(boardId)
      }
    }

    es.onerror = () => {
      es.close()
      // Reconnect dengan exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, retries), 30000)
      setTimeout(() => { /* reconnect */ }, delay)
    }

    return () => es.close()
  }, [boardId])
}
```

## Incremental vs Full Refetch

| Event Type | Handler | Alasan |
|-----------|---------|--------|
| `task.created` | `applyTaskEvent` | Cukup insert task baru |
| `task.updated` | `applyTaskEvent` | Update task di tempat |
| `task.moved` | `applyTaskEvent` | Pindahkan antar column |
| `task.deleted` | `removeTaskFromStore` | Hapus dari column |
| `board.updated` | `fetchBoard` | Bisa banyak perubahan |
| `column.updated` | `fetchBoard` | Jarang terjadi |

**Prinsip**: Untuk event yang sering dan terbatas (task CRUD), incremental update hemat bandwidth dan menghindari flicker. Untuk event jarang (board/column), full refetch lebih simpel.

## Reconnection Strategy

```typescript
let retries = 0
const MAX_RETRIES = 5
const BASE_DELAY = 1000  // 1 detik

function scheduleReconnect() {
  if (retries >= MAX_RETRIES) return

  const delay = Math.min(
    BASE_DELAY * Math.pow(2, retries),  // 1s, 2s, 4s, 8s, 16s
    30000                                 // max 30 detik
  )

  setTimeout(() => {
    retries++
    connect()  // buat EventSource baru
  }, delay)
}
```

**Exponential backoff** mencegah server overload saat banyak client reconnect bersamaan (misalnya setelah server restart).

## Page Visibility

```typescript
function handleVisibility() {
  if (document.hidden) {
    es.close()       // pause saat tab inactive
    retries = 0
  } else {
    connect()        // reconnect saat tab active kembali
  }
}

document.addEventListener('visibilitychange', handleVisibility)
```

Hemat resource — tidak perlu streaming saat user tidak melihat tab.
