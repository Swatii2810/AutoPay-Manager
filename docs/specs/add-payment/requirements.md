# Requirements Document

## Introduction

This document defines the requirements for the Add Payment feature in AutoPay Manager. Clicking "Add Payment" from the empty state card (or any future CTA) opens a modal form. The user fills in payment details and submits. The payment is validated, assigned a unique ID, saved to localStorage under `autopay_payments`, and the dashboard re-renders immediately to reflect the new data. The feature is implemented in pure vanilla JS with inline styles consistent with the existing `auth/index.html` + `auth/auth.js` pattern and the Blue + White design system.

---

## Glossary

- **AddPaymentModal**: The modal overlay and form rendered when the user triggers the "Add Payment" action.
- **ModalOverlay**: The semi-transparent dark backdrop rendered behind the AddPaymentModal card.
- **ModalCard**: The white card container (border-radius 16px, max-width 400px) that holds the form.
- **PaymentForm**: The HTML form inside the ModalCard containing all input fields and action buttons.
- **PaymentFormData**: The raw values collected from the PaymentForm before validation — `name`, `amount`, `type`, `date`.
- **Payment**: A validated data object stored in localStorage with fields: `id`, `name`, `amount`, `date`, `type`, `status`.
- **PaymentType**: An enum value — either `one-time` or `monthly`.
- **DataLayer**: The module responsible for reading and writing Payment objects to localStorage under the key `autopay_payments`.
- **DashboardRenderer**: The `renderHomeContent()` function that re-renders the home screen content area after a payment is saved.
- **HomeContentArea**: The DOM element (`#homeContentArea`) that hosts the dashboard sections.
- **NextDueDate**: For `monthly` payments, the date falling on the same day-of-month as the selected date but in the following calendar month.

---

## Requirements

### Requirement 1: Trigger — Open the Add Payment Modal

**User Story:** As a user on the home screen, I want to click "Add Payment" from the empty state card, so that I can open the form to add my first payment.

#### Acceptance Criteria

1. WHEN the "Add Payment" button in the EmptyStateCard is clicked, THE AddPaymentModal SHALL be injected into the DOM and become visible.
2. WHEN the AddPaymentModal is opened, THE ModalOverlay SHALL cover the full viewport with a semi-transparent dark background (`rgba(0,0,0,0.5)`).
3. WHEN the AddPaymentModal is opened, THE ModalCard SHALL be centred horizontally and vertically within the viewport.
4. WHEN the AddPaymentModal is opened, THE AddPaymentModal SHALL animate in with a slide-up (`translateY(40px) → translateY(0)`) and fade-in (`opacity: 0 → 1`) transition over `0.3s ease-out`.
5. WHEN the AddPaymentModal is opened, THE PaymentForm SHALL have all fields in their default empty/unselected state.

---

### Requirement 2: Payment Form Fields

**User Story:** As a user filling in the Add Payment form, I want clearly labelled input fields for name, amount, type, and date, so that I can provide all required payment details.

#### Acceptance Criteria

1. THE PaymentForm SHALL contain a text input for `name` with placeholder "e.g. Netflix Subscription" and label "Payment Name".
2. THE PaymentForm SHALL contain a number input for `amount` with placeholder "0.00" and label "Amount (₹)".
3. THE PaymentForm SHALL contain a `<select>` dropdown for `type` with label "Payment Type" and options "Monthly" (value `monthly`) and "One-time" (value `one-time`).
4. THE PaymentForm SHALL contain a date input for `date` with label "Date".
5. THE PaymentForm SHALL contain a submit button labelled "Add Payment" styled with the blue gradient (`linear-gradient(135deg, #3D5AFE, #6B8EFF)`), white bold text, and `border-radius: 50px`.
6. THE PaymentForm SHALL contain a cancel button labelled "Cancel" styled as a ghost button (`border: 2px solid #3D5AFE`, transparent background, `#3D5AFE` text, `border-radius: 50px`).
7. THE PaymentForm input fields SHALL use `border-radius: 12px`, a `2px solid #E5E7EB` default border, and a `2px solid #3D5AFE` focus border.

---

### Requirement 3: Form Validation

**User Story:** As a user submitting the Add Payment form, I want to see clear inline error messages for invalid fields, so that I know exactly what to fix before the payment is saved.

#### Acceptance Criteria

1. WHEN the submit button is clicked and the `name` field is empty, THE PaymentForm SHALL display an inline error "Payment name is required" below the name input.
2. WHEN the submit button is clicked and the `amount` field is empty, THE PaymentForm SHALL display an inline error "Amount is required" below the amount input.
3. WHEN the submit button is clicked and the `amount` value is not a positive number (≤ 0), THE PaymentForm SHALL display an inline error "Amount must be greater than 0" below the amount input.
4. WHEN the submit button is clicked and the `date` field is empty, THE PaymentForm SHALL display an inline error "Date is required" below the date input.
5. WHEN the submit button is clicked and all fields are valid, THE PaymentForm SHALL NOT display any inline error messages.
6. WHEN a field with an existing error is corrected by the user, THE PaymentForm SHALL clear that field's inline error message.
7. THE PaymentForm SHALL validate all fields before attempting to save — partial saves SHALL NOT occur.

---

### Requirement 4: Payment ID Generation

**User Story:** As a developer, I want each new payment to receive a unique ID at creation time, so that payments can be individually identified and managed.

#### Acceptance Criteria

1. WHEN a valid PaymentFormData is submitted, THE DataLayer SHALL generate a unique `id` string for the new Payment.
2. THE DataLayer SHALL generate the `id` using `Date.now().toString(36) + Math.random().toString(36).slice(2)` or an equivalent method that produces a non-empty, unique string.
3. FOR ALL payments saved in a single session, no two Payment objects SHALL share the same `id` value.

---

### Requirement 5: Next Due Date Calculation for Monthly Payments

**User Story:** As a user adding a monthly payment, I want the system to automatically calculate the next due date, so that my recurring payment schedule is set up correctly from the start.

#### Acceptance Criteria

1. WHEN a Payment with `type: monthly` is submitted, THE DataLayer SHALL calculate the NextDueDate as the same day-of-month as the selected `date` in the following calendar month.
2. WHEN the selected `date` is the last day of a month and the following month has fewer days, THE DataLayer SHALL set the NextDueDate to the last day of the following month.
3. WHEN a Payment with `type: one-time` is submitted, THE DataLayer SHALL use the selected `date` as-is without modification.
4. THE DataLayer SHALL store the NextDueDate (or original date for one-time) as an ISO 8601 date string in the Payment's `date` field.

---

### Requirement 6: Save Payment to localStorage

**User Story:** As a user who has filled in valid payment details, I want the payment to be saved immediately when I submit the form, so that it persists across sessions.

#### Acceptance Criteria

1. WHEN a valid PaymentFormData is submitted, THE DataLayer SHALL append the new Payment object to the existing `autopay_payments` array in localStorage.
2. WHEN `autopay_payments` does not exist in localStorage, THE DataLayer SHALL create a new array containing only the new Payment and save it.
3. WHEN the Payment is saved, THE DataLayer SHALL set the Payment's `status` field to `active`.
4. WHEN `savePayments()` is called, THE DataLayer SHALL serialise the full payments array to JSON and write it to localStorage under the key `autopay_payments`.
5. IF localStorage is unavailable or throws an error during save, THEN THE DataLayer SHALL display an error message to the user and NOT close the modal.

---

### Requirement 7: Close Modal and Refresh Dashboard

**User Story:** As a user who has successfully added a payment, I want the modal to close smoothly and the dashboard to update immediately, so that I can see my new payment without reloading the page.

#### Acceptance Criteria

1. WHEN a Payment is successfully saved, THE AddPaymentModal SHALL animate out with a fade-out (`opacity: 1 → 0`) transition over `0.25s ease-in`.
2. WHEN the fade-out animation completes, THE AddPaymentModal SHALL remove itself from the DOM.
3. WHEN the AddPaymentModal is removed from the DOM, THE DashboardRenderer SHALL call `renderHomeContent()` with the updated payments array to re-render the HomeContentArea.
4. WHEN `renderHomeContent()` is called after a save, THE DashboardRenderer SHALL reflect the newly added payment in the TransactionList immediately.
5. WHEN the cancel button is clicked, THE AddPaymentModal SHALL animate out with the same fade-out transition and remove itself from the DOM without saving any data.
6. WHEN the ModalOverlay is clicked, THE AddPaymentModal SHALL behave identically to clicking the cancel button.

---

### Requirement 8: Dashboard Reflects New Payment

**User Story:** As a user who has just added a payment, I want to see it appear in the correct dashboard sections immediately, so that I have confirmation the payment was saved.

#### Acceptance Criteria

1. WHEN a new Payment is saved and the dashboard re-renders, THE DashboardRenderer SHALL display the new payment as a row in the TransactionList.
2. WHEN a new Payment with `type: monthly` is saved and the dashboard re-renders, THE DashboardRenderer SHALL also display the payment in the AutoPaySection.
3. WHEN a new Payment is saved and the dashboard re-renders, THE DashboardRenderer SHALL no longer display the EmptyState.
4. WHEN a new Payment is saved and the dashboard re-renders, THE BalanceCard SHALL update its total to include the new payment's `amount`.

---

### Requirement 9: Modal Visual Theme Compliance

**User Story:** As a product owner, I want the Add Payment modal to match the Blue + White design system, so that it is visually consistent with the rest of AutoPay Manager.

#### Acceptance Criteria

1. THE ModalCard SHALL use `#FFFFFF` as its background colour, `border-radius: 16px`, `padding: 24px`, and `max-width: 400px`.
2. THE ModalOverlay SHALL use `rgba(0,0,0,0.5)` as its background and cover the full viewport (`position: fixed; inset: 0`).
3. THE PaymentForm input fields SHALL use `#1A1A2E` for input text colour and `#6B7280` for placeholder text colour.
4. THE PaymentForm field labels SHALL use `#1A1A2E` text colour and `font-weight: 600`.
5. THE submit button SHALL use `linear-gradient(135deg, #3D5AFE, #6B8EFF)` background, white bold text, `border-radius: 50px`, and `box-shadow: 0 4px 16px rgba(61,90,254,0.3)`.
6. THE cancel button SHALL use `border: 2px solid #3D5AFE`, transparent background, `#3D5AFE` text colour, and `border-radius: 50px`.
7. THE inline error messages SHALL use `#EF4444` as their text colour and `font-size: 12px`.
8. THE AddPaymentModal SHALL use `Inter`, `Segoe UI`, sans-serif as the font family for all text.

---

### Requirement 10: Modal DOM Lifecycle

**User Story:** As a developer, I want the modal to be injected into and removed from the DOM on open/close, so that it does not affect the page when not in use.

#### Acceptance Criteria

1. WHEN the AddPaymentModal is opened, THE AddPaymentModal SHALL inject the ModalOverlay and ModalCard as new DOM elements appended to `document.body`.
2. WHEN the AddPaymentModal is closed (cancel, overlay click, or successful save), THE AddPaymentModal SHALL remove the injected DOM elements from `document.body`.
3. WHILE the AddPaymentModal is open, THE AddPaymentModal SHALL NOT interfere with or modify any existing DOM elements outside the modal.
4. WHEN the AddPaymentModal is opened multiple times in a session, THE AddPaymentModal SHALL inject a fresh set of DOM elements each time with all fields reset to their default state.
5. IF an AddPaymentModal is already open, THEN THE AddPaymentModal SHALL NOT open a second instance on top of the existing one.
