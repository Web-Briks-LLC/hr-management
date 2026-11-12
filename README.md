# 🚀 BackendSafe — Professional MongoDB Backup System

BackendSafe is an enterprise-grade automated backup solution for MongoDB, featuring a modern web dashboard for real-time monitoring and dynamic management.

## ✨ Core Features

- 🔄 **Dynamic Management** — Change MongoDB connection strings, database names, and backup locations via the dashboard without any restart.
- 📦 **Smart Compression** — Automated `tar.gz` compression to optimize disk space.
- ☁️ **Cloud Sync** — Instant off-site replication to **Nextcloud** or any other **rclone**-compatible storage.
- 🔔 **Instant Failure Alerts** — Get notified via **Email (SMTP)** immediately if a backup or sync operation fails.
- 📊 **Disk Analytics** — Real-time tracking of disk usage and backup growth with high-fidelity analytics snapshots.
- 🧹 **Retention Controls** — Configurable auto-cleanup for local backups to prevent storage overflow.
- 🔄 **One-Click Restore** — Simple, reliable restoration process from any successful backup record.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | [Next.js](https://nextjs.org/), [Tailwind CSS 4](https://tailwindcss.com/) |
| **Backend** | [Node.js](https://nodejs.org/), [Express](https://expressjs.com/), [TypeScript](https://www.typescriptlang.org/) |
| **Database** | [Prisma](https://www.prisma.io/) (Metadata), [SQLite](https://sqlite.org/) |
| **Automation** | Bash Shell scripts, [node-cron](https://github.com/node-cron/node-cron), [rclone](https://rclone.org/) |

---

## 🚀 Installation & Setup

### 1. Prerequisites
- Node.js (v18+)
- MongoDB (Target for backup)
- Rclone (Optional, for Cloud sync)

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your initial variables
```

### 3. Server Initialization
```bash
cd server
npm install
npx prisma db push
npm run dev
```

### 4. Dashboard Setup
```bash
cd dashboard
npm install
npm run dev
```

---

## 📂 Project Structure
- **/dashboard**: Next.js monitoring panel.
- **/server**: Node.js API and backup execution logic.
- **/scripts**: Core shell scripts for backup, restore, and cron setup.
- **/backups**: Default destination for local backup archives.

---

## 📜 Commands
- Trigger Manual Backup: Via the Dashboard UI or `POST /api/backups/trigger`
- Setup Cron: `bash scripts/cron-setup.sh`

---

## ❤️ Credits
Developed as a robust solution for production MongoDB deployments.
