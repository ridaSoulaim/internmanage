# InternManage 🚀

A modern, full-stack **Internship & Workforce Performance Management Platform** built with **Next.js 16 (App Router)**, **React 19**, **Prisma ORM**, **PostgreSQL (Supabase)**, **Auth.js / NextAuth v5**, and **Tailwind CSS v4**.

---

## ✨ Features

- **📊 Central Executive Dashboard**: Real-time workforce metrics, attendance rates, active task queues, pending leaves, and departmental distributions.
- **⏱️ Attendance & Digital Clock**:
  - Live digital punch-in/punch-out with real-time shift duration counter.
  - Automated late arrival detection (> 9:30 AM).
  - Manual admin entry modal and attendance history logs.
- **📅 Leave Management System**:
  - Leave requests with type categorization (Sick, Casual, Exam/Study, Annual, Unpaid).
  - Inclusive calendar day duration calculator.
  - 1-click Admin/HR approval & rejection workflows.
- **📋 Intern Kanban Task Board**:
  - 4-stage Kanban workflow (`To Do`, `In Progress`, `In Review`, `Done`).
  - Priority levels (`Low`, `Medium`, `High`, `Urgent`), tag chips, and due dates.
  - Deliverable link submissions (GitHub PRs, Figma, docs) and mentor review modal.
- **🏆 Milestones & Performance Reviews (PPO Hub)**:
  - 12-week internship milestone stepper roadmap.
  - 4-competency 5-star rubric evaluation (Technical, Communication, Problem Solving, Initiative) with live GPA calculation.
  - Pre-Placement Offer (PPO) decision manager (`PPO Offered`, `Recommended for PPO`, `Under Evaluation`, `Extend Internship`, `No Offer`).
- **👥 Employee & Intern Directory**: Full profiles, departments, positions, compensation, and account management.
- **💳 Payroll & Stipend Management**: Exportable compensation summaries and salary disbursement tracking.
- **🛡️ Role-Based Access Control**: Separate permission scopes for `ADMIN`, `HR`, and `EMPLOYEE` with Next.js edge route protection.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router, Server Actions)
- **Frontend**: [React 19](https://react.dev), [Tailwind CSS v4](https://tailwindcss.com), [Lucide React](https://lucide.dev)
- **Database & ORM**: [Prisma ORM](https://prisma.io), PostgreSQL ([Supabase](https://supabase.com))
- **Authentication**: [NextAuth.js v5 / Auth.js](https://authjs.dev) (Credentials Provider with bcrypt)
- **Language**: TypeScript (Strict Mode)

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/ridaSoulaim/internmanage.git
cd internmanage
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file in the project root:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/internmanage?schema=public"
AUTH_SECRET="your-32-character-secret"
```

### 4. Initialize Database
```bash
npx prisma db push
```

### 5. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## 🔑 Demo Credentials

- **Admin Account**: `admin@example.com` / `password123`
- **HR Account**: `hr@example.com` / `password123`

---

## 📄 License

This project is licensed under the MIT License.
