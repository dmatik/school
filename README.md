# School 🏫🎒

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Build Status](https://img.shields.io/github/actions/workflow/status/dmatik/school/build-and-test.yml?label=build)
[![Docker Pulls](https://img.shields.io/docker/pulls/dmatik/school.svg)](https://hub.docker.com/r/dmatik/school)
![Version](https://img.shields.io/badge/version-0.1.0-green)

**School** (בית הספר) is a sleek, mobile-first web application designed for parents to easily monitor their children's school incidents, attendance, and homework assignments fetched from the school's **Webtop** system.

Built as a Progressive Web App (PWA) with native bilingual support (Hebrew RTL and English LTR), it features a polished UI, multi-user authentication with biometric passkeys, and complete self-hosting capabilities powered by an embedded SQLite database.

> **Note:** Fully localized in **Hebrew (RTL, default)** and **English (LTR)** with instant language switching.

---

## ✨ Key Features

*   **📱 Mobile-First & PWA Ready:** Standalone mobile app experience on iOS and Android with customized web manifest, touch icons, and bottom navigation.
*   **🚨 School Incidents & Discipline (אירועים):** Centralized tracking for school incidents, teacher notes, attendance status, and disciplinary events.
*   **📚 Homework & Assignments (שיעורי בית):** Clear overview of assigned homework, subjects, exercise instructions, and upcoming due dates.
*   **🔌 Webtop Integration Ready:** Built-in data models and endpoints prepared for seamless connection to third-party Webtop school APIs.
*   **👥 Multi-User Support & Roles:** Role-based access control with two tiers:
    *   **Admin:** Complete system administration (create users, reset passwords, assign admin/user roles, delete users).
    *   **User:** Scoped access to assigned student records and school data.
*   **👤 Account Management:** Dedicated Account view to update full names, upload and crop profile photos (with client-side image compression), change passwords, and manage authenticators.
*   **🔑 WebAuthn & Biometric Passkeys:** Fast, passwordless sign-in using Face ID, Touch ID, Windows Hello, or hardware security keys in addition to standard credentials.
*   **🗄️ SQLite Database:** Zero-configuration, synchronous embedded database (`school.db`) stored in `./data` with WAL mode and foreign-key cascade deletions.
*   **🔐 Secure Authentication:** JWT tokens with bcrypt password hashing and automatic session invalidation upon password reset.
*   **🎨 Polished Modern Design:** Built with **Tailwind CSS** and headless **Radix UI** primitives, supporting Dark and Light color palettes and Hebrew/English typography (Heebo & Assistant).
*   **⚡ Smooth Transitions:** Responsive layout animations and tab switches powered by **Framer Motion**.
*   **🐳 Dockerized & Self-Hostable:** Production-grade multi-stage Docker build targeting `dmatik/school` with persistent data volumes.

---

## 🛠️ Tech Stack

### **Frontend**
![React](https://img.shields.io/badge/react-19-20232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Radix UI](https://img.shields.io/badge/radix%20ui-161618.svg?style=for-the-badge&logo=radix-ui&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer-Motion-black?style=for-the-badge&logo=framer&logoColor=blue)

### **Backend & DevOps**
![NodeJS](https://img.shields.io/badge/node.js-22-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/express.js-5-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![SQLite](https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/github%20actions-%232671E5.svg?style=for-the-badge&logo=githubactions&logoColor=white)

---

## 🚀 Getting Started

### **Default Credentials**
Upon first initialization, a default system administrator account is seeded automatically:
*   **Username:** `admin`
*   **Password:** `admin`

> 💡 *We recommend updating the default administrator password immediately via the **Account** page.*

---

### **Option A: Docker Compose (Recommended)** 🐳

Create a `docker-compose.yml` file:

```yaml
services:
  school:
    image: dmatik/school:latest
    container_name: school
    restart: always
    ports:
      - "8080:5173"
    volumes:
      - ./data:/app/data
```

Start the application:
```bash
docker compose up -d
```

Open your browser at: `http://localhost:8080`

---

### **Option B: Local Development** 💻

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/dmatik/school.git
    cd school
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start backend API & frontend development servers:**
    ```bash
    npm run dev:all
    ```
    *This starts the Express 5 backend API (port 3001) with SQLite alongside the Vite dev server (port 5173).*

4.  **Open browser:**
    Navigate to `http://localhost:5173`

5.  **Run Verification & Tests:**
    ```bash
    # 1. Typecheck and Production Build
    npm run build

    # 2. Linting
    npm run lint

    # 3. Unit & Component Tests (Vitest)
    npm test

    # 4. End-to-End Tests (Playwright)
    npm run test:e2e
    ```

---

## 🏗️ Architecture & Directory Layout

```
school/
├── .agents/                 # AI agent rules and specialized skills
├── .github/workflows/       # CI/CD: build-and-test, docker-build, release
├── data/                    # Persistent storage for school.db (SQLite + WAL)
├── e2e/                     # Playwright end-to-end test suites & helpers
├── public/                  # PWA manifest, favicons, and Apple touch icons
├── server/
│   ├── db.js                # Better-SQLite3 schema & database initializer
│   └── index.js             # Express REST API, JWT auth & WebAuthn routes
└── src/
    ├── components/          # Views (IncidentsPage, HomeworkPage, AdminPage, AccountPage, LoginView)
    ├── components/ui/       # Headless Radix UI primitives with Tailwind
    ├── locales/             # Bilingual translations (he.json, en.json)
    ├── lib/                 # Utilities (webauthn, image compression, cn)
    ├── types.ts             # TypeScript interfaces
    └── App.tsx              # App shell, responsive navigation & routing
```

---

Made with ❤️ by [dmatik](https://github.com/dmatik)

