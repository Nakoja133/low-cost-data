# 📦 Low-Cost Data Bundles Platform

A full-stack web application for reselling mobile data bundles with a built-in agent commission system, Paystack payment integration, and a comprehensive admin dashboard.

## ✨ Features

- 🔐 **Secure Authentication** (JWT-based login for Agents & Admins)
- 🛒 **Agent Dashboard** (View packages, place orders, track wallet & orders)
- 💰 **Wallet System** (Auto-credit profits, request withdrawals)
- 📊 **Admin Panel** (Manage users, packages, withdrawals, terms/rules)
- 💳 **Paystack Integration** (Test & Live mode, webhook-driven order completion)
- 📱 **Responsive UI** (Mobile-first design with dark/light theme support)
- 📧 **Email Notifications** (Withdrawal approvals/rejections, account updates)

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | PostgreSQL |
| Payments | Paystack API |
| Auth | JWT + bcrypt |
| Email | Nodemailer |
| Hosting (Recommended) | Vercel (Frontend) + Render (Backend) + Supabase (DB) |

## 📋 Prerequisites

- Node.js `>= 18`
- npm or yarn
- PostgreSQL database
- Paystack account (Test mode for development)

## ⚙️ Environment Setup

Create a `.env` file in the `backend/` folder:
```env
# Database
DB_USER=your_db_user
DB_HOST=your_db_host
DB_NAME=your_db_name
DB_PASSWORD=your_db_password
DB_PORT=5432
DATABASE_URL=postgresql://user:password@host:5432/dbname
DB_SSL=false

# Production / hosted PostgreSQL
# Set DB_SSL=true on Render/Supabase/managed Postgres if SSL is required.
# Leave DB_SSL=false for most local PostgreSQL setups.

# JWT
JWT_SECRET=your_super_secure_jwt_secret

# Paystack
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
FRONTEND_URL=http://localhost:5173

# Email (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
