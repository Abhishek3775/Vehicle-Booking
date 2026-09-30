# AutoRevive Customer Mobile Application (React Native)

A premium, modern, and high-performance **Customer Mobile Application** built for the **Vehicle Servicing & Roadside Assistance** platform.

---

## 💎 Design Philosophy & Core Principles

- **Pure JavaScript Only**: 100% JavaScript (`.js` & `.jsx`). Strictly **zero** TypeScript.
- **Visual Excellence**:
  - Primary Color: **Dark Teal** (`#0B4F5C`)
  - Accent Color: **Mint Green** (`#10B981`)
  - Background: Crisp Slate White (`#F8FAFC`)
  - Generous whitespace, rounded cards (`12–16px`), micro-elevations, and modern typography.
- **One Screen = One Clear Primary Action**: Avoids busy dashboards and cluttered cards by leveraging step-by-step flows, bottom sheets, and collapsible sections.
- **Security-First**:
  - Centralized Axios instance with automatic Bearer token injection and seamless 401 token refresh queue.
  - Zero payment gateway secrets or sensitive keys on the mobile client (payment verification handled strictly by backend).

---

## 📱 Application Scope (Customer Only)

The application strictly encompasses the Customer experience:

1. **Authentication**: Phone number input, 6-digit OTP auto-advancing verification, token storage with refresh mechanism.
2. **Home Screen**:
   - Personalized greeting (`Hello, [First Name]`)
   - Prominent Emergency Assistance callout
   - Default vehicle spotlight with instant garage access
   - 4 quick actions: Book Service, My Bookings, Garage, Services
   - Upcoming booking status card or clean empty state
3. **Services & Packages**:
   - Real-time search with category pills (Maintenance, Brakes, Battery, Tyres, AC, Electrical)
   - Service details: pricing, duration, vehicle compatibility, inclusions
   - Bundled Service Packages with strike-through pricing and discount badges
4. **My Garage (Vehicle Management)**:
   - Vehicle cards with type, model, variant, year, fuel, and registration plate
   - Add/Edit vehicle with dropdown pickers and default toggle
5. **Saved Addresses**:
   - Home, Work, Office, Other categories
   - Set default address, delete, and add new addresses
6. **Multi-Step Service Booking Wizard (6 Steps)**:
   - Step 1: Select Vehicle
   - Step 2: Select Service
   - Step 3: Select Address
   - Step 4: Select Date & Time Slot
   - Step 5: Review Booking Summary
   - Step 6: Confirmation with Reference ID & direct navigation
7. **Emergency Roadside Assistance**:
   - 7 issue categories: Flat Tyre, Battery Issue, Engine Problem, Fuel Issue, Accident, Vehicle Breakdown, Other
   - One-tap GPS location detection via `expo-location` with map view and address display
   - Immediate dispatch request creation
8. **Live Mechanic Tracking**:
   - Live simulated GPS tracking with route coordinate path
   - Mechanic profile card with rating, specialization, distance, ETA, and direct call trigger
9. **Bookings List & Comprehensive Status Timeline**:
   - Filter tabs: Upcoming, Active, Completed, Cancelled
   - 9-stage progression timeline (Created → Mechanic Assigned → On The Way → Arrived → Inspection → Quotation → Service → Completed → Paid)
10. **Inspection Report**:
    - Itemized health inspection with collapsible sections: Engine, Brakes, Tyres, Battery, Electrical, AC, Exterior
    - Condition tags: Good, Fair, Poor, Critical with remarks and severity indicators
11. **Quotation Approval / Rejection**:
    - Transparent breakdown: Labor, Parts, Discount, GST, Total
    - One-tap approval or rejection modal with reason capture
12. **Seamless Payment**:
    - Methods: UPI, Credit/Debit Card, Net Banking, Wallet
    - Backend payment verification integration (`/api/payments/verify`)
    - Payment success screen with invoice navigation
13. **Invoices**:
    - Full GST invoice view, line-item costs, download/share triggers
14. **Notifications**:
    - Filterable categories (Booking, Dispatch, Inspection, Quotation, Payment, Invoice, System)
    - Unread counters, mark as read, delete, FCM device token registration
15. **Profile & Account**:
    - User profile details, quick links to garage, addresses, payment history, invoices, notifications, privacy, terms, and logout

---

## 🏗️ Architecture & Project Structure

```
customer-app/
├── App.js
├── index.js
├── package.json
└── src/
    ├── api/
    │   ├── axiosInstance.js       # Centralized Axios with JWT interceptor & refresh queue
    │   ├── authApi.js             # Send OTP, Verify OTP, Refresh Token, Logout, Me
    │   ├── userApi.js             # Profile management
    │   ├── vehicleApi.js          # Customer garage CRUD
    │   ├── addressApi.js          # Saved addresses CRUD
    │   ├── locationApi.js         # Geocoding & coordinate tracking
    │   ├── serviceApi.js          # Services & categories
    │   ├── packageApi.js          # Bundled service packages
    │   ├── bookingApi.js          # Booking lifecycle & cancellation
    │   ├── mechanicApi.js         # Mechanic details & tracking
    │   ├── inspectionApi.js       # Vehicle inspection reports
    │   ├── quotationApi.js        # Estimates, approval & rejection
    │   ├── paymentApi.js          # Create order & backend verification
    │   ├── invoiceApi.js          # Invoices & billing details
    │   └── notificationApi.js     # User notifications & FCM registration
    │
    ├── components/
    │   ├── booking/               # StepIndicator, TimeSlotPicker
    │   ├── buttons/               # PrimaryButton, SecondaryButton, IconButton
    │   ├── cards/                 # VehicleCard, ServiceCard, PackageCard, AddressCard, BookingCard, NotificationCard
    │   ├── common/                # ScreenContainer, Header, EmptyState, LoadingSkeleton, ErrorView, Badge, StatusTimeline
    │   ├── forms/                 # InputField, SelectDropdown, OtpInput
    │   ├── mechanic/              # MechanicInfoCard
    │   ├── quotation/             # QuotationBreakdown
    │   └── vehicle/               # VehiclePickerSheet
    │
    ├── constants/
    │   ├── apiConfig.js           # Platform-aware Base URL & Storage Keys
    │   └── appConstants.js        # Statuses, issue types, vehicle types, payment methods
    │
    ├── context/
    │   ├── AuthContext.js         # Session persistence, auto-login, logout
    │   └── NotificationContext.js # Live unread count & notification sync
    │
    ├── hooks/
    │   ├── useAuth.js             # Consumer hook for AuthContext
    │   └── useNotifications.js    # Consumer hook for NotificationContext
    │
    ├── navigation/
    │   ├── AuthNavigator.js       # Login & OTP screens
    │   ├── CustomerNavigator.js   # 5 Bottom Tabs: Home, Services, Bookings, Garage, Profile
    │   └── RootNavigator.js       # Root Stack & Auth Gating
    │
    ├── screens/
    │   ├── addresses/             # SavedAddressesScreen, AddAddressScreen
    │   ├── auth/                  # LoginScreen, OtpScreen
    │   ├── bookings/              # BookServiceScreen (6-step), BookingsListScreen, BookingDetailScreen
    │   ├── emergency/             # EmergencyAssistanceScreen
    │   ├── home/                  # HomeScreen
    │   ├── inspection/            # InspectionReportScreen
    │   ├── invoices/              # InvoicesListScreen, InvoiceDetailScreen
    │   ├── notifications/         # NotificationsScreen
    │   ├── payments/              # PaymentScreen, PaymentSuccessScreen
    │   ├── profile/               # ProfileScreen, EditProfileScreen, PrivacyPolicyScreen, TermsScreen
    │   ├── quotation/             # QuotationDetailScreen
    │   ├── services/              # ServicesScreen, ServiceDetailScreen, PackageDetailScreen
    │   ├── tracking/              # MechanicTrackingScreen
    │   └── vehicles/              # GarageScreen, AddVehicleScreen, VehicleDetailScreen
    │
    ├── theme/
    │   ├── colors.js              # Dark teal, mint green, neutrals, status tones
    │   ├── spacing.js             # Consistent grid spacing & soft shadows
    │   ├── typography.js          # Typography hierarchy
    │   └── index.js
    │
    └── utils/
        ├── fcm.js                 # Push notification token registrar
        ├── formatters.js          # INR currency, plate numbers, date formatting
        └── storage.js             # AsyncStorage safe token & user store
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Expo CLI (`npx expo`)
- Physical device with Expo Go, or Android / iOS emulator

### 1. Install Dependencies

```bash
cd customer-app
npm install --legacy-peer-deps
```

### 2. Configure Backend API URL

Open `src/constants/apiConfig.js`:

```javascript
// Automatically configures:
// Android Emulator -> http://10.0.2.2:5000
// iOS Simulator / Web -> http://localhost:5000
// For physical devices, set your LAN IP (e.g. http://192.168.1.100:5000)
```

Ensure the backend server is running on port 5000:
```bash
cd ../backend
npm run dev
```

### 3. Start the Application

```bash
# Start Expo development server
npm start

# Or directly target:
npm run android
npm run ios
npm run web
```
