# Vehicle Servicing & Roadside Assistance - Admin Panel

A modern, production-ready SaaS Admin Dashboard for managing the Vehicle Servicing & Roadside Assistance platform. Built with React.js, Vite, pure Vanilla CSS design system, React Icons, Axios, and Recharts.

---

## 🚀 Key Features

### 1. 🔐 Role-Based Authentication & Guarding
- Phone & OTP based 2-step login flow matching the backend authentication system (`/api/auth/send-otp` & `/api/auth/verify-otp`).
- Role verification ensuring only `ADMIN` accounts access administrative functions.
- Automatic JWT token management with Axios interceptor refreshing tokens via `/api/auth/refresh-token`.
- Automatic logout and redirection on session expiry or unauthorized access.

### 2. 📊 Executive Dashboard & Real-Time Analytics
- **Live Metric KPI Cards**: Total Users, Verified Mechanics, Total Bookings, Revenue, Active Dispatches, Low-Stock Warnings.
- **Booking Volume & Trend Analysis**: Recharts visual trend graphs of completed, cancelled, and pending jobs.
- **Fleet Mechanic Status Chart**: Visual distribution of available, on-job, and offline mechanics.
- **Recent Bookings Ledger**: Live feed of latest roadside assistance and scheduled service bookings.

### 3. 👥 Customer Management
- Paginated customer directory with search by name, phone, or email.
- Account status filters (`ACTIVE`, `BLOCKED`, `SUSPENDED`).
- User profile dossier showing registered vehicles (garage), contact details, and account status.
- Admin moderation actions (Block / Suspend / Activate) with confirmation dialogs.

### 4. 🔧 Mechanic Fleet Management
- Filter mechanics by verification status (`VERIFIED`, `PENDING`, `REJECTED`), availability, and work status (`AVAILABLE`, `ON_JOB`, `OFFLINE`).
- Mechanic dossier displaying specialization, vehicle compatibility, completed jobs count, and average rating.
- Verification approval & decision modal with compliance notes.

### 5. 📅 Bookings & Service Operations
- Comprehensive booking ledger supporting standard service bookings and emergency roadside assistance.
- Filter by status (`PENDING`, `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), booking type, and search queries.
- Detailed dossier view: customer profile, vehicle specifications, assigned mechanic, pickup address with GPS telemetry, inspection findings, and cancellation modals.

### 6. 📡 Real-Time Dispatch Management
- Live dispatch board tracking broadcast offers, retry attempts, search radius, and response deadlines.
- Manual mechanic reassignment modal querying available verified mechanics.
- Emergency dispatch cancellation with audit trail.

### 7. 🛠️ Services & Packages Catalog
- Full CRUD management for standalone repair and maintenance services.
- Price, duration, vehicle type compatibility (`TWO_WHEELER`, `FOUR_WHEELER`, etc.), and category management.
- Service Packages builder allowing bundled service offerings with discount rates.

### 8. 📦 Warehouse Inventory & Spare Parts
- SKU tracking, selling and cost pricing, inventory stock levels, and reserved stock quantities.
- Visual warning badges for low stock thresholds.
- Stock adjustment dialog supporting `ADD` (restock), `REMOVE` (damaged/return), and `SET` (physical audit count).

### 9. 💳 Payments & Tax Invoices
- Payment ledger with settlement statuses, payment methods, and gateway references (Razorpay, COD, Manual UPI).
- Tax invoice generator with itemized line items (services + parts), GST calculation, and printable invoice layout.
- Safe credential handling (no secret keys exposed).

### 10. 🛡️ System Audit Logs & Notifications
- Immutable administrative audit logs capturing admin actor, target module, action type, description, and IP address.
- In-app notification center with read status management, unread filters, and dismiss actions.
- Admin profile management with departmental updates and permission viewer.

---

## 🛠️ Technology Stack

- **Framework**: React.js (JavaScript, React 19)
- **Bundler**: Vite
- **HTTP Client**: Axios with centralized interceptors and token refresh queue
- **Routing**: React Router DOM v7 (Lazy-loaded code splitting)
- **Icons**: React Icons (`react-icons/fi`)
- **Charts**: Recharts
- **Styling**: Pure Modular Vanilla CSS (CSS Variables Design System, light theme SaaS)

---

## 📂 Project Architecture

```text
admin-panel/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── common/             # DataTable, FilterBar, StatCard, StatusBadge, Modal, Pagination, LoadingStates, FeedbackStates
│   │   └── layout/             # AdminLayout, Header (Global Search), Sidebar (Collapsible), ProtectedRoute
│   ├── context/
│   │   ├── AuthContext.jsx     # Session, OTP login, admin role check, token storage
│   │   └── ToastContext.jsx    # Accessible floating toast notification system
│   ├── pages/
│   │   ├── auth/               # LoginPage, UnauthorizedPage
│   │   ├── dashboard/          # DashboardPage
│   │   ├── users/              # UsersListPage, UserDetailsPage
│   │   ├── mechanics/          # MechanicsListPage, MechanicDetailsPage
│   │   ├── bookings/           # BookingsListPage, BookingDetailsPage
│   │   ├── dispatch/           # DispatchListPage
│   │   ├── services/           # ServicesListPage
│   │   ├── packages/           # PackagesListPage
│   │   ├── inventory/          # InventoryListPage
│   │   ├── payments/           # PaymentsListPage, PaymentDetailsPage
│   │   ├── invoices/           # InvoicesListPage, InvoiceDetailsPage
│   │   ├── notifications/      # NotificationsPage
│   │   ├── audit/              # AuditLogsPage
│   │   ├── profile/            # AdminProfilePage
│   │   └── common/             # NotFoundPage, ComingSoonPage
│   ├── services/
│   │   ├── api.js              # Central Axios instance + Interceptors + Refresh Queue
│   │   ├── auth.api.js         # OTP authentication APIs
│   │   ├── admin.api.js        # Dashboard, Users, Mechanics, Bookings, Search, Audit, Profile APIs
│   │   ├── dispatch.api.js     # Dispatch lifecycle APIs
│   │   ├── services.api.js     # Services catalog APIs
│   │   ├── packages.api.js     # Service package bundle APIs
│   │   ├── inventory.api.js    # Spare parts inventory APIs
│   │   ├── payments.api.js     # Payment audit APIs
│   │   ├── invoices.api.js     # Tax invoice APIs
│   │   └── notifications.api.js# Notification center APIs
│   ├── styles/
│   │   ├── variables.css       # Design tokens (colors, fonts, shadows, borders)
│   │   ├── global.css          # Reset, buttons, forms, badges, cards, grid
│   │   ├── layout.css          # Sidebar, Header, AdminLayout, Global Search
│   │   └── components.css      # Tables, Filters, Modals, Toasts, Skeletons
│   ├── utils/
│   │   ├── constants.js        # Status, category, vehicle type enums
│   │   └── formatters.js       # Currency (₹ INR), date-time, phone, status labels
│   ├── routes/
│   │   └── AppRoutes.jsx       # Lazy route declarations & access guards
│   ├── App.jsx
│   └── main.jsx
├── .env
├── .env.example
├── package.json
└── README.md
```

---

## ⚙️ Environment Variables

Create `.env` in the root of `admin-panel/`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 🏃 How to Run the Admin Panel

1. **Install Dependencies:**
   ```bash
   cd admin-panel
   npm install
   ```

2. **Start Development Server:**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

3. **Build for Production:**
   ```bash
   npm run build
   ```

4. **Preview Production Build:**
   ```bash
   npm run preview
   ```

---

## 📌 Backend API Mapping & Verification

| Module | Backend Endpoint | Status in Admin Panel |
| :--- | :--- | :--- |
| **Auth** | `POST /api/auth/send-otp`, `POST /api/auth/verify-otp`, `POST /api/auth/refresh-token` | ✅ Integrated |
| **Dashboard** | `GET /api/admin/dashboard`, `/bookings`, `/revenue`, `/mechanics` | ✅ Integrated |
| **Global Search** | `GET /api/admin/search?q=` | ✅ Integrated (Header dropdown) |
| **Users** | `GET /api/admin/users`, `GET /:id`, `PATCH /:id/status` | ✅ Integrated |
| **Mechanics** | `GET /api/admin/mechanics`, `GET /:id`, `PATCH /:id/verification` | ✅ Integrated |
| **Bookings** | `GET /api/admin/bookings`, `GET /:id`, `PATCH /:id/cancel` | ✅ Integrated |
| **Dispatch** | `GET /api/dispatch`, `POST /:bookingId/assign`, `PATCH /:id/reassign`, `PATCH /:id/cancel` | ✅ Integrated |
| **Services** | `GET /api/services`, `POST`, `PUT /:id`, `PATCH /:id/status` | ✅ Integrated |
| **Packages** | `GET /api/service-packages`, `POST`, `PUT /:id`, `PATCH /:id/status`, `DELETE /:id` | ✅ Integrated |
| **Inventory** | `GET /api/parts`, `POST`, `PUT /:id`, `PATCH /:id/stock`, `PATCH /:id/status` | ✅ Integrated |
| **Payments** | `GET /api/payments`, `GET /:paymentId` | ✅ Integrated |
| **Invoices** | `GET /api/invoices`, `GET /:invoiceId`, `PATCH /:invoiceId/cancel` | ✅ Integrated |
| **Notifications** | `GET /api/notifications`, `PATCH /:id/read`, `PATCH /read-all`, `DELETE /:id` | ✅ Integrated |
| **Audit Logs** | `GET /api/admin/audit-logs` | ✅ Integrated |
| **Profile** | `GET /api/admin/profile`, `PUT /api/admin/profile` | ✅ Integrated |
| **Reviews** | Planned / Future milestone in Backend | ⏳ Marked "Coming Soon" |
| **Support** | Planned / Future milestone in Backend | ⏳ Marked "Coming Soon" |
| **Coupons** | Planned / Future milestone in Backend | ⏳ Marked "Coming Soon" |
