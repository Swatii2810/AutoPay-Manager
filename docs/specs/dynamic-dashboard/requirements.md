# Requirements Document

## Introduction

This document defines the requirements for the Dynamic Dashboard feature in AutoPay Manager. The feature replaces the current static home screen with a live, data-driven dashboard that reads all payment data from localStorage. The dashboard includes a dynamic balance card, a transactions list with status indicators, an AutoPay section for recurring payments, and a full empty state when no data exists. All UI must follow the Blue + White design system defined in ui-theme.md.

---

## Glossary

- **Dashboard**: The home screen rendered after login, composed of the BalanceCard, TransactionList, and AutoPaySection.
- **BalanceCard**: The gradient blue card at the top of the Dashboard showing the total balance derived from all payments.
- **TransactionList**: The scrollable list of all payments rendered below the BalanceCard when payments exist.
- **AutoPaySection**: The section showing only monthly recurring payments with their toggle state.
- **Payment**: A data object stored in localStorage with fields: `id`, `name`, `amount`, `date`, `type`, `status`.
- **PaymentType**: An enum value — either `one-time` or `monthly`.
- **PaymentStatus**: An enum value — either `active` or `paused`.
- **TransactionStatus**: A derived display state — `completed` (past due date), `due-soon` (within 2 days of due date), or `upcoming` (future due date).
- **DataLayer**: The module responsible for reading and writing Payment objects to localStorage under the key `autopay_payments`.
- **EmptyState**: The UI shown inside the Dashboard when the DataLayer returns zero payments.
- **HomeContentArea**: The DOM element (`#homeContentArea`) that hosts the TransactionList, AutoPaySection, or EmptyState.
- **DashboardRenderer**: The logic layer that orchestrates fetching data and rendering all Dashboard sections.

---

## Requirements

### Requirement 1: Data Layer — localStorage CRUD

**User Story:** As a developer, I want a consistent data layer for payments stored in localStorage, so that all dashboard sections read from a single source of truth.

#### Acceptance Criteria

1. THE DataLayer SHALL store all payments as a JSON array under the localStorage key `autopay_payments`.
2. WHEN `getPayments()` is called, THE DataLayer SHALL return the parsed array of Payment objects from localStorage.
3. IF the `autopay_payments` key does not exist in localStorage, THEN THE DataLayer SHALL return an empty array.
4. IF the value stored under `autopay_payments` is not valid JSON, THEN THE DataLayer SHALL return an empty array and not throw an error.
5. WHEN `savePayments(payments)` is called, THE DataLayer SHALL serialise the payments array to JSON and write it to localStorage under `autopay_payments`.
6. THE DataLayer SHALL validate that each Payment object contains the fields: `id` (string), `name` (string), `amount` (number), `date` (string, ISO 8601), `type` (PaymentType), `status` (PaymentStatus).
7. IF a Payment object is missing a required field, THEN THE DataLayer SHALL exclude it from the returned array and log a console warning.

---

### Requirement 2: Payment Data Model

**User Story:** As a developer, I want a well-defined payment data model, so that all parts of the app work with consistent, predictable data structures.

#### Acceptance Criteria

1. THE Payment object SHALL contain the field `id` as a non-empty string uniquely identifying the payment.
2. THE Payment object SHALL contain the field `name` as a non-empty string describing the payment.
3. THE Payment object SHALL contain the field `amount` as a positive number representing the payment value in INR.
4. THE Payment object SHALL contain the field `date` as a string in ISO 8601 format representing the due date.
5. THE Payment object SHALL contain the field `type` with a value of either `one-time` or `monthly`.
6. THE Payment object SHALL contain the field `status` with a value of either `active` or `paused`.

---

### Requirement 3: Dashboard Initialisation on Page Load

**User Story:** As a user, I want the dashboard to load my payment data automatically when I open the app, so that I always see up-to-date information without manual refresh.

#### Acceptance Criteria

1. WHEN `showHome()` is called, THE DashboardRenderer SHALL call `getPayments()` from the DataLayer before rendering any section.
2. WHEN `showHome()` is called, THE DashboardRenderer SHALL render the BalanceCard, HomeContentArea, and all sections before the home screen becomes visible.
3. WHEN the home screen is shown, THE DashboardRenderer SHALL complete all rendering synchronously so no blank sections are visible on load.

---

### Requirement 4: Balance Card — Dynamic Total

**User Story:** As a user, I want the balance card to show the total of all my payments, so that I have an at-a-glance summary of my financial activity.

#### Acceptance Criteria

1. WHEN payments exist, THE BalanceCard SHALL display the sum of all Payment `amount` values formatted as `₹X,XXX.XX`.
2. WHEN no payments exist, THE BalanceCard SHALL display `₹0.00` as the total balance.
3. THE BalanceCard SHALL display the total of `active` payments in the "Sent" sub-card.
4. THE BalanceCard SHALL display the total of `paused` payments in the "Received" sub-card.
5. WHEN a payment is added or removed, THE BalanceCard SHALL update its displayed totals to reflect the new data.

---

### Requirement 5: Empty State — No Payments

**User Story:** As a new user with no payments, I want to see a helpful empty state on the dashboard, so that I understand the app is working and know how to add my first payment.

#### Acceptance Criteria

1. WHEN `getPayments()` returns an empty array, THE DashboardRenderer SHALL render the EmptyState inside the HomeContentArea.
2. WHEN the EmptyState is rendered, THE DashboardRenderer SHALL NOT render the TransactionList or AutoPaySection.
3. THE EmptyState SHALL display the heading "No transactions yet".
4. THE EmptyState SHALL display the subtitle "Start by adding your first payment".
5. THE EmptyState SHALL display a button labelled "Add Payment".
6. WHEN the "Add Payment" button is clicked, THE EmptyState SHALL invoke the `onAddPayment` callback.
7. WHEN the EmptyState is mounted, THE DashboardRenderer SHALL animate it in with `opacity 0.35s ease-out` and `transform: scale(0.95) → scale(1)`.

---

### Requirement 6: Transaction List — Payment Items

**User Story:** As a user with existing payments, I want to see all my payments listed with their name, amount, date, and status, so that I can track what I owe and when.

#### Acceptance Criteria

1. WHEN `getPayments()` returns one or more payments, THE DashboardRenderer SHALL render the TransactionList inside the HomeContentArea.
2. THE TransactionList SHALL render one row per Payment object returned by the DataLayer.
3. WHEN rendering a payment row, THE TransactionList SHALL display the payment `name`, `amount` formatted as `₹X,XXX.XX`, and `date` formatted as a human-readable date (e.g. `15 Jan 2025`).
4. WHEN rendering a payment row, THE TransactionList SHALL display the payment `type` label (`One-time` or `Monthly`).
5. WHEN a payment's `date` is in the past, THE TransactionList SHALL assign it the `completed` TransactionStatus and display a green indicator.
6. WHEN a payment's `date` is within 2 calendar days from today (inclusive), THE TransactionList SHALL assign it the `due-soon` TransactionStatus and display a yellow/orange indicator.
7. WHEN a payment's `date` is more than 2 calendar days in the future, THE TransactionList SHALL assign it the `upcoming` TransactionStatus and display a blue indicator.
8. IF a payment's `date` is not a valid ISO 8601 string, THEN THE TransactionList SHALL display a grey "Unknown" status indicator for that row.

---

### Requirement 7: AutoPay Section — Monthly Recurring Payments

**User Story:** As a user with monthly recurring payments, I want to see them grouped in a dedicated AutoPay section, so that I can quickly review and manage my subscriptions.

#### Acceptance Criteria

1. WHEN `getPayments()` returns at least one payment with `type: monthly`, THE DashboardRenderer SHALL render the AutoPaySection below the TransactionList.
2. WHEN `getPayments()` returns no payments with `type: monthly`, THE DashboardRenderer SHALL NOT render the AutoPaySection.
3. THE AutoPaySection SHALL render one row per Payment with `type: monthly`.
4. WHEN rendering an AutoPay row, THE AutoPaySection SHALL display the payment `name`, `amount` formatted as `₹X,XXX.XX`, and the next due `date` formatted as a human-readable date.
5. WHEN rendering an AutoPay row, THE AutoPaySection SHALL display a toggle reflecting the payment's current `status` — toggled on for `active`, toggled off for `paused`.
6. WHEN the toggle is switched from on to off, THE AutoPaySection SHALL update the payment's `status` to `paused` and call `savePayments()` to persist the change.
7. WHEN the toggle is switched from off to on, THE AutoPaySection SHALL update the payment's `status` to `active` and call `savePayments()` to persist the change.
8. WHEN a toggle state changes, THE AutoPaySection SHALL update the toggle's visual state immediately without a page reload.

---

### Requirement 8: TransactionStatus Derivation

**User Story:** As a developer, I want a deterministic function to derive TransactionStatus from a payment date, so that status indicators are consistent across all dashboard sections.

#### Acceptance Criteria

1. THE DashboardRenderer SHALL derive TransactionStatus by comparing the payment `date` to the current date at render time.
2. WHEN the payment `date` is before today's date (midnight), THE DashboardRenderer SHALL return `completed`.
3. WHEN the payment `date` is today or within the next 2 calendar days, THE DashboardRenderer SHALL return `due-soon`.
4. WHEN the payment `date` is more than 2 calendar days from today, THE DashboardRenderer SHALL return `upcoming`.
5. FOR ALL valid ISO 8601 date strings, the TransactionStatus derivation function SHALL return exactly one of `completed`, `due-soon`, or `upcoming`.

---

### Requirement 9: Visual Theme Compliance

**User Story:** As a product owner, I want the entire dashboard to match the Blue + White design system, so that the feature is visually consistent with the rest of AutoPay Manager.

#### Acceptance Criteria

1. THE Dashboard SHALL use `Inter`, `Segoe UI`, sans-serif as the font family for all text.
2. THE BalanceCard SHALL use `linear-gradient(135deg, #3D5AFE, #6B8EFF)` as its background.
3. THE TransactionList and AutoPaySection SHALL use `#FFFFFF` card backgrounds with `border-radius: 12px` and `box-shadow: 0 2px 12px rgba(0,0,0,0.06)`.
4. THE Dashboard SHALL use `#1A1A2E` for all primary text and `#6B7280` for all secondary/descriptive text.
5. THE EmptyState CTA button SHALL use `linear-gradient(135deg, #3D5AFE, #6B8EFF)` as its background with white bold text and `border-radius: 50px`.
6. THE AutoPaySection toggle SHALL use `#3D5AFE` as the active colour and `#E5E7EB` as the inactive colour.
7. THE Dashboard layout SHALL be mobile-first with a maximum content width of `480px`, expanding to `960px` on desktop.

---

### Requirement 10: Smooth Animations

**User Story:** As a user, I want dashboard sections to appear with smooth animations, so that the experience feels polished and responsive.

#### Acceptance Criteria

1. WHEN the Dashboard is rendered, THE DashboardRenderer SHALL animate each section in with a `fade-up` effect (`opacity: 0 → 1`, `translateY(20px) → translateY(0)`) over `0.35s ease-out`.
2. WHEN a toggle state changes in the AutoPaySection, THE AutoPaySection SHALL transition the toggle's background colour over `0.2s ease`.
3. WHEN the EmptyState is mounted, THE DashboardRenderer SHALL animate it with `opacity 0.35s ease-out` and `transform: scale(0.95) → scale(1)`.
