# School 🏫🎒

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Build Status](https://img.shields.io/github/actions/workflow/status/dmatik/school/build-and-test.yml?label=build)
[![Docker Pulls](https://img.shields.io/docker/pulls/dmatik/school.svg)](https://hub.docker.com/r/dmatik/school)
![Version](https://img.shields.io/badge/version-0.5.6-green)

**School** (בית הספר) is a sleek, modern, mobile-first web application designed for parents and students to monitor school life, homework assignments, attendance, and disciplinary incidents synced directly from the Israeli **Webtop** (SmartSchool) portal.

Engineered as an Apple-inspired Progressive Web App (PWA) with native bilingual support (**Hebrew RTL** as default, and **English LTR**), it features an ultra-responsive interface with a floating liquid glass dock, multi-user authentication with biometric passkeys, per-child color customizer, and complete self-hosting capabilities backed by an embedded SQLite database.

> 🌐 **Bilingual First:** Fully localized in **Hebrew (RTL, default)** and **English (LTR)** with instant language switching and logical directional layouts.

---

## ✨ Key Features

### 📚 Homework & Assignments Feed (שיעורי בית)
*   **Live Webtop Sync:** Seamlessly fetches homework, assigned exercises, and due dates directly from the school's Webtop system.
*   **Smart Lesson Consolidation:** Automatically merges duplicate lesson entries on the same day for the same student and subject into a single card showing all lesson hours (e.g., *"Hours 2, 3"*).
*   **Intelligent Subject Classification:** Automatically recognizes and categorizes 12+ academic subjects (Math, English, Science, Bible & Heritage, Art, Physical Education, History, Geography, Music, Computers, etc.) with dedicated Lucide icons and vibrant, color-coded badges.
*   **Chat-Style Timeline:** Feed organized chronologically with sticky floating glass date pills (*"Today"*, *"Yesterday"*, or formatted localized dates).
*   **Search & Filtering:** Real-time text search across subjects, teachers, student names, and assignment descriptions, with single-day date picker filtering.

### 🚨 School Incidents & Attendance (אירועים ומשמעת)
*   **Disciplinary & Academic Tracking:** Real-time overview of disciplinary events, positive teacher feedback, attendance status, tardiness, and lesson periods.
*   **Detailed Incident Breakdown:** Shows incident type, academic subject, reporting teacher, lesson hour, and full teacher remarks in clean cards.
*   **Multi-Student Filtering:** Easily filter incidents by specific child or view all siblings together in a consolidated feed.

### ⚙️ Webtop Integration & Settings (הגדרות וסנכרון)
*   **Native Webtop Connector:** Connects directly to the SmartSchool Webtop server with real-time connection testing and diagnostic error feedback.
*   **Encrypted Credentials at Rest:** User credentials are encrypted in SQLite using **AES-256-GCM** with PBKDF2/scrypt derived encryption keys.
*   **Ephemeral ID Resilience:** Heuristic matching (`matchChildWithPrevious`) maintains child identity, settings, and color selections even when Webtop rotates student session tokens or IDs across days.
*   **Per-Child Custom Color Badges:** Assign distinctive accent colors (Blue, Emerald, Purple, Amber, Rose, Cyan, Orange, Indigo) to each child, propagating instantly across all homework and incident feeds for effortless multi-child tracking.
*   **One-Touch Instant Sync:** Quick-sync button with rotating animation and instant green checkmark confirmation in the desktop header, sidebar, and settings panel.

### 🎨 Apple-Inspired Mobile Polish & Modern UI/UX
*   **Floating Liquid Glass Dock:** Custom bottom navigation bar (`apple-liquid-dock`) with spring physics pill animation (`apple-liquid-pill` powered by **Framer Motion**).
*   **Dynamic Scroll Header:** Header seamlessly tracks page scrolling, transitioning titles and applying subtle backdrop blurs when scrolling past section headers.
*   **Responsive Hybrid Shell:** Collapsible sidebar with quick shortcuts on desktop/tablet, switching to a minimalist floating dock on mobile phones.
*   **Dark & Light Modes:** Built-in theme switcher with automatic system preference detection powered by `next-themes`.
*   **PWA Ready:** Installable standalone app experience on iOS and Android with customized web manifest, touch icons, theme colors, and safe area insets handling.

### 🔑 WebAuthn & Biometric Passkeys (Level 3)
*   **Passwordless Sign-In:** Authenticate effortlessly using Face ID, Touch ID, Windows Hello, Android Biometrics, or FIDO2 hardware security keys (e.g. YubiKey).
*   **Device Management:** Register multiple authenticators with custom device labels (iPhone, Mac, Android, Windows) and view creation and last-used timestamps.
*   **Reverse Proxy & Multi-Origin Aware:** Dynamic Relying Party (`RP_ID`) and origin resolution supporting custom domains, HTTPS proxies, and local networks.

### 🛡️ Enterprise Security & Hardening
*   **Brute-Force Rate Limiting:** Sliding-window rate limiter (`express-rate-limit`) on all authentication routes (`/api/auth/login`, `/api/auth/passkey/*`) keyed by IP and username to mitigate credential stuffing.
*   **JWT Session Authentication:** Signed tokens with configurable expiration, database-backed `token_version` tracking, and automatic token invalidation upon password reset.
*   **Bcrypt Hashing:** User passwords securely hashed with bcrypt (salt rounds = 10).
*   **Protected Administration:** Built-in safeguards preventing deletion or role demotion of the last remaining admin or default administrator.
*   **Cascading Integrity:** Foreign-key cascade deletion in SQLite ensures clean database teardowns when removing users or passkeys.

### 👥 User & Account Administration
*   **Account Management:** Update first and last names, change passwords, and upload avatar photos with automatic client-side canvas compression (`compressImage`).
*   **Role-Based Access Control:**
    *   **Admin:** Full administrative dashboard to view, create, edit, search, and delete users, as well as trigger administrative password resets.
    *   **User:** Access scoped strictly to the authenticated user's assigned student records, settings, and Webtop credentials.

---

## 🛠️ Tech Stack

| Layer | Technologies | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19** + **TypeScript 6** + **Vite 7** | Functional components, standard props (`ref`), fast HMR, and strict typing |
| **UI Components** | **Radix UI Primitives** + **Tailwind CSS 3.4** | Accessible headless primitives, custom design tokens, and RTL-first logical properties |
| **Animation** | **Framer Motion 12** | Liquid dock layout animations, spring pills, and page view transitions |
| **Icons** | **Lucide React** | Consistent, modern vector iconography |
| **Dates & Locales** | **`date-fns` v3** + **i18next** | Bilingual formatting (`he` / `enUS`), localized calendar pickers, and live RTL/LTR toggling |
| **Backend API** | **Express 5** | RESTful endpoints, asynchronous error handling, and rate limiting middleware |
| **Database** | **Better-SQLite3** (`school.db`) | Synchronous embedded SQLite with Write-Ahead Logging (WAL mode) and foreign keys |
| **Security & Auth** | **@simplewebauthn** + **JWT** + **Bcrypt** | WebAuthn passkey registration/login, JWT bearer tokens, and AES-256-GCM data encryption |
| **Container & CI** | **Docker** + **Alpine Linux** + **GitHub Actions** | Multi-stage production container and automated test runner workflows |

---

## 🚀 Getting Started

### Default Administrator Credentials
Upon first database initialization, a default administrator account is seeded automatically:
*   **Username:** `admin`
*   **Password:** `admin`

> 💡 *We strongly recommend updating the default password or registering a biometric passkey immediately via the **Account** tab.*

---

### Option A: Docker Compose (Recommended) 🐳

1. Create a `docker-compose.yml` file:

```yaml
services:
  school:
    image: dmatik/school:latest
    container_name: school
    restart: always
    network_mode: bridge
    ports:
      - "5173:5173"
    volumes:
      - ./data:/app/data
```

2. Start the container:
```bash
docker compose up -d
```

3. Open your browser at: `http://localhost:8080` (or your server's IP / domain).

---

### Option B: Local Development 💻

1. **Clone the repository:**
   ```bash
   git clone https://github.com/dmatik/school.git
   cd school
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start backend API & frontend dev server:**
   ```bash
   npm run dev:all
   ```
   *This concurrently boots the Express 5 backend (port 3001) and Vite dev server (port 5173).*

4. **Open your browser:**
   Navigate to `http://localhost:5173`

---

## ⚙️ Environment Variables

All variables are optional with sensible defaults:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Port the Express server listens on | `3001` (dev) / `5173` (Docker) |
| `NODE_ENV` | Application environment (`development` / `production`) | `development` |
| `JWT_SECRET` | Secret key for signing JWT tokens | Auto-generated & persisted in SQLite `settings` table |
| `ENCRYPTION_KEY` | Secret key for AES-256-GCM Webtop credential encryption | Auto-generated & persisted in SQLite `settings` table |
| `RP_ID` | Relying Party ID for WebAuthn passkeys | Auto-detected from hostname / forwarded host |
| `EXPECTED_ORIGIN` | Comma-separated allowed WebAuthn origins | Auto-detected from request `Origin` and `Host` |
| `TRUST_PROXY` | Trust reverse proxy headers (`x-forwarded-host`, `x-forwarded-proto`) | `false` (set `true` or `1` behind Nginx/Caddy/Cloudflare) |

---

## 🧪 Verification & Testing

The repository maintains an extensive test suite:

```bash
# 1. Typecheck and Production Build
npm run build

# 2. Linting
npm run lint

# 3. Unit & Component Tests (Vitest in happy-dom)
npm test

# 4. Local End-to-End Tests (Playwright)
npm run test:e2e
```

---

## 🏗️ Architecture & Directory Layout

```
school/
├── .agents/                 # AI agent rules, workflows & specialized skills
├── .github/workflows/       # CI/CD: build-and-test, docker-build, release
├── data/                    # Persistent storage for school.db (SQLite + WAL)
├── e2e/                     # Playwright end-to-end test suites & isolated helpers
├── public/                  # PWA manifest, favicons, and Apple touch icons
├── server/
│   ├── db.js                # Better-SQLite3 schema declarations & initial seed
│   ├── index.js             # Express 5 REST API, rate limiter & auth handlers
│   ├── webauthn-config.js   # Dynamic WebAuthn RP ID and origin resolver
│   └── webtop.js            # Webtop API client, AES encryption & child identity matcher
└── src/
    ├── components/          # Application views & UI components
    │   ├── AccountPage.tsx  # User profile, password reset & passkeys manager
    │   ├── AdminPage.tsx    # User administration, roles & password resets
    │   ├── ErrorBoundary.tsx # React error boundary component
    │   ├── HomeworkPage.tsx # Homework feed, consolidation & subject filters
    │   ├── IncidentsPage.tsx # Disciplinary & attendance events feed
    │   ├── LanguageSwitcher.tsx # Bilingual Hebrew / English language toggle
    │   ├── LoginView.tsx    # Password & WebAuthn biometric login screen
    │   ├── mode-toggle.tsx  # Dark / Light / System theme toggle
    │   ├── SettingsPage.tsx # Webtop credentials, sync & per-child color customizer
    │   ├── theme-provider.tsx # Next-themes provider
    │   └── ui/              # Radix UI primitives styled with Tailwind CSS
    ├── hooks/               # Custom React hooks (use-toast)
    ├── lib/                 # Core utilities
    │   ├── child-colors.ts  # Per-student color palette & badge styles
    │   ├── image.ts         # Client-side canvas image compression
    │   ├── subject-icons.ts # Academic subject classification & icon mapping
    │   ├── utils.ts         # Date formatting, consolidation & cn helper
    │   └── webauthn.ts      # SimpleWebAuthn browser client wrappers
    ├── locales/             # Bilingual translations (he.json, en.json)
    ├── tests/               # Vitest unit & component test suites
    ├── types.ts             # TypeScript interfaces (User, Incident, HomeworkItem, etc.)
    ├── App.tsx              # Application shell, responsive layout & liquid glass dock
    └── main.tsx             # Application bootstrap & i18n setup
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Made with ❤️ by [dmatik](https://github.com/dmatik)
