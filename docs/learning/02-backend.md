# 2. Backend (Go/Gin)

## Entry Point

```go
// main.go → NewRouter(db) → r.Run(":8080")

func NewRouter(db *pgxpool.Pool) *gin.Engine {
    r := gin.New()
    r.Use(gin.Recovery())
    r.Use(loggingMiddleware())    // request logger
    r.Use(corsMiddleware())       // CORS
    r.Use(rateLimitMiddleware())  // rate limiter per IP
    // ... register routes
}
```

## JWT Authentication

```go
// auth.go
func GenerateJWT(userID, email string) (string, error)
func ParseJWT(tokenStr string) (*Claims, error)
func HashPassword(password string) (string, error)
func VerifyPassword(hash, password string) error
```

Flow:
1. **Register** → hash password (bcrypt) → simpan user → generate JWT → return token
2. **Login** → verifikasi password → generate JWT → return token
3. **Protected routes** → `jwtMiddleware()` → parse token → set `userID` di context

### Frontend mengirim token via:
```typescript
// api.ts
headers.set('Authorization', 'Bearer ' + token)
// atau via query param untuk SSE (EventSource tidak support custom headers)
new EventSource(`/api/boards/${id}/events?token=${token}`)
```

## SSE (Server-Sent Events) Hub

```go
type sseHub struct {
    mu       sync.RWMutex
    watchers map[string]map[chan []byte]struct{} // boardID → channels
}

// 3 operasi: subscribe, unsubscribe, publish
func (h *sseHub) subscribe(boardID string) chan []byte
func (h *sseHub) unsubscribe(boardID string, ch chan []byte)
func (h *sseHub) publish(boardID string, payload []byte)
```

**Pola**: Observer pattern sederhana. Setiap board punya set channel. Saat event terjadi, publish ke semua channel board itu.

**Kenapa channel bukan slice callback?**  
Go channel cocok untuk fan-out: satu publisher, banyak subscriber. Non-blocking send via `select default` mencegah slow consumer memblok producer.

```go
func (h *sseHub) publish(boardID string, payload []byte) {
    h.mu.RLock()
    defer h.mu.RUnlock()
    for ch := range h.watchers[boardID] {
        select {
        case ch <- payload:       // kirim jika buffer available
        default:                  // skip jika penuh (slow consumer)
        }
    }
}
```

## Rate Limiter

```go
type rateLimiter struct {
    mu       sync.Mutex
    visitors map[string]*visitor  // IP → rate limiter
    rate     rate.Limit           // 5 req/detik
    burst    int                  // 15 burst
}
```

**Pola**: Token bucket per IP. `rate.NewLimiter(5, 15)` artinya 5 request/detik dengan burst capacity 15. Cleanup goroutine menghapus visitor yang idle > 5 menit.

## PostgreSQL dengan pgx

```go
// db.go — connection pool
pool, err := pgxpool.New(ctx, os.Getenv("DATABASE_URL"))

// Query single row
err := pool.QueryRow(ctx, "SELECT ... WHERE id=$1", id).Scan(&field1, &field2)

// Query multiple rows
rows, err := pool.Query(ctx, "SELECT ... WHERE board_id=$1", boardID)
for rows.Next() { rows.Scan(...) }

// Transaction
tx, err := pool.Begin(ctx)
defer tx.Rollback(ctx)
// ... multiple queries ...
tx.Commit(ctx)
```

### Kenapa LEFT JOIN untuk getBoardData?

```go
// Satu query menggantikan 2+ query:
SELECT c.*, t.*
FROM columns c
LEFT JOIN tasks t ON t.column_id = c.id
WHERE c.board_id = $1
ORDER BY c.position, t.position
```

**Masalah awal**: Go `encoding/json` dengan `omitempty` menghapus empty slice (`[]Task{}` → dihapus dari JSON). Frontend menerima `column.tasks === undefined`.

**Solusi**: 
1. LEFT JOIN + nullable pointer scanning (`*string`, `*int`, `*time.Time`)
2. Jika `taskID != nil` → ada task di row ini → tambahkan ke column
3. Backend selalu inisialisasi `Tasks: []Task{}` untuk setiap column

## Label JSONB

```go
type Task struct {
    // ...
    Labels []string `json:"labels"`
}

// Scan dari JSONB:
var labelsRaw []byte
rows.Scan(..., &labelsRaw)
task.Labels = scanLabels(labelsRaw)

// Helper:
func scanLabels(b []byte) []string {
    var labels []string
    if len(b) > 0 { json.Unmarshal(b, &labels) }
    if labels == nil { labels = []string{} }
    return labels
}
```

**Kenapa JSONB array (`["bug","feature"]`) bukan table many-to-many?**  
Untuk label sederhana dengan predefined set, JSONB lebih simpel — tidak perlu join table, tidak perlu migration tambahan. Untuk use case kompleks (label per user, label description, label filter lintas board), table many-to-many tetap lebih baik.

## Testing

```go
// router_test.go
func TestSSEHubSubscribeUnsubscribe(t *testing.T) {
    hub := newSSEHub()
    ch := hub.subscribe("board-1")
    if len(hub.watchers) != 1 { t.Fatal(...) }
    hub.unsubscribe("board-1", ch)
    if len(hub.watchers) != 0 { t.Fatal(...) }
}
```

9 test: SSE hub (3), scanLabels (4), password hashing (1), JWT (1). Semua unit test — tidak perlu database.
