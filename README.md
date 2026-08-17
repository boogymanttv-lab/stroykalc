# Maistorix

A full-stack SaaS platform for construction contractors and craftsmen in Bulgaria. Create quotes, manage clients and projects, track payments and expenses, generate PDF documents — all from the phone or desktop, online or offline.

**Live:** [maistorix.com](https://maistorix.com)
**Google Play:** [com.maistorix.app](https://play.google.com/store/apps/details?id=com.maistorix.app)

---

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Row Level Security, Storage)
- **Payments:** Stripe (subscriptions, checkout, customer portal, webhooks)
- **Offline storage:** IndexedDB (Dexie.js) with a custom bidirectional sync engine
- **Distribution:** PWA + Trusted Web Activity (TWA) wrapper published on Google Play
- **Hosting:** Vercel (serverless API functions, edge deployment)
- **Email:** Resend
- **Push notifications:** Web Push API

---

## Key Features

- Quote/offer calculator with 300+ predefined construction services across 25 categories
- Client and project management, fully offline-capable
- PDF generation and sharing (quotes, contracts) with watermarking on the Free tier
- Payment and expense tracking
- Photo galleries per project
- Task management, reminders, Excel export, QR code sharing
- Document management per project
- Multi-language support (Bulgarian / English)
- Full offline mode with automatic background synchronization
- Admin panel for account and subscription management
- In-app support ticket system
- SEO-optimized landing page with a pre-rendered HTML shell for search engine crawlers

## Architecture Highlights

- **Offline-first design** — a local IndexedDB store mirrors Supabase data; a background sync service reconciles changes once connectivity returns
- **Subscription lifecycle** managed server-side via Stripe webhooks, keeping account status in sync with Supabase
- **Multi-tenant data isolation** enforced through Supabase Row Level Security policies
- **Serverless API layer** on Vercel handling payments, email, push notifications, and admin operations

---

## License

All rights reserved © 2026 Иван Михов / Maistorix. This repository is published for portfolio and demonstration purposes only. See [LICENSE](./LICENSE) for details — no part of this code may be copied, reused, or redistributed without written permission.
