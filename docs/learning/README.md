# 📚 Kanban App — Learning Guide

Dokumentasi ini ditulis untuk kamu yang ingin belajar dari codebase ini — baik sebagai referensi portfolio, bahan interview, atau memahami pola-pola modern full-stack development.

## Daftar Isi

| # | Topik | Deskripsi |
|---|-------|-----------|
| 1 | [Arsitektur](01-architecture.md) | Struktur project, data flow, tech decisions |
| 2 | [Backend (Go/Gin)](02-backend.md) | JWT auth, SSE hub, rate limiter, PostgreSQL queries |
| 3 | [Frontend (Next.js)](03-frontend.md) | Zustand store, custom hooks, component patterns |
| 4 | [Drag & Drop](04-drag-and-drop.md) | @dnd-kit setup, optimistic updates, rollback |
| 5 | [Real-time SSE](05-real-time-sse.md) | Server-Sent Events, reconnection, incremental updates |
| 6 | [Design Patterns](06-patterns.md) | Error handling, a11y, performance, testing |

## Tech Stack Sekilas

```
┌──────────────────────────────────────────────┐
│                 Browser                      │
│  ┌────────────────────────────────────┐      │
│  │  Next.js 16 (React 19 + TS)        │      │
│  │  ┌──────┐ ┌───────┐ ┌──────────┐  │      │
│  │  │Zustand│ │@dnd-kit│ │Sonner   │  │      │
│  │  │(state)│ │ (DnD) │ │(toast)  │  │      │
│  │  └──────┘ └───────┘ └──────────┘  │      │
│  └──────────────┬─────────────────────┘      │
│      HTTP/REST  │  SSE (EventSource)          │
└─────────────────┼────────────────────────────┘
                  │
┌─────────────────┼────────────────────────────┐
│            Go Backend (Gin)                   │
│  ┌──────────┐ ┌────────┐ ┌───────────────┐  │
│  │ JWT Auth │ │SSE Hub │ │ Rate Limiter  │  │
│  └──────────┘ └────────┘ └───────────────┘  │
│  ┌──────────────────────────────────────┐   │
│  │         pgx (PostgreSQL driver)       │   │
│  └──────────────────────────────────────┘   │
└─────────────────┬────────────────────────────┘
                  │
         ┌────────┴────────┐
         │   PostgreSQL    │
         └─────────────────┘
```

## Cara Membaca Dokumentasi Ini

1. Mulai dari **Arsitektur** untuk gambaran besar
2. Baca **Backend** atau **Frontend** sesuai minat
3. **Drag & Drop** dan **SSE** adalah dua fitur paling kompleks — baca dengan sabar
4. **Design Patterns** merangkum semua pola yang dipakai
5. Buka kode sumber sambil baca — setiap konsep ada contoh konkretnya

## Skor Portfolio: 10/10 🎯

Project ini mencakup hampir semua skill yang dicari dalam full-stack role:
- ✅ REST API design
- ✅ Authentication (JWT + bcrypt)
- ✅ Real-time communication (SSE)
- ✅ Complex state management (optimistic updates)
- ✅ Drag & drop UX
- ✅ Dark mode
- ✅ Accessibility
- ✅ Testing (unit + integration)
- ✅ CI/CD pipeline
- ✅ Docker containerization
- ✅ Responsive design
- ✅ Type safety (TypeScript + Go types)
