# Requirements Document

## Introduction

This document defines the requirements for the Empty State UX feature in AutoPay Manager. When the home screen has no transactions, a styled empty state card replaces the blank content area below the balance card. The card guides the user toward their first action — adding a payment — using an icon, descriptive copy, and a primary CTA button consistent with the Blue + White theme. The feature applies to the vanilla JS home screen (`auth/index.html` / `auth/auth.js`) and is designed to be portable to future React-based screens.

---

## Glossary

- **EmptyStateCard**: The UI component rendered below the balance card when no transactions exist.
- **HomeContentRenderer**: The logic layer (`renderHomeContent`) that decides whether to render the EmptyStateCard or the TransactionList.
- **TransactionList**: The UI component rendered when one or more transactions exist.
- **CTA**: Call-to-action button ("Add Payment") inside the EmptyStateCard.
- **Container**: The DOM element (`#homeContentArea`) that hosts either the EmptyStateCard or the TransactionList.
- **onAddPayment**: The callback function invoked when the CTA button is clicked.
- **Transaction**: An object representing a sent or received payment with id, type, amount, timestamp, and label fields.

---

## Requirements

### Requirement 1: Render Empty State When No Transactions Exist

**User Story:** As a new user with no transactions, I want to see a helpful prompt below the balance card, so that I know how to get started with my first payment.

#### Acceptance Criteria

1. WHEN `renderHomeContent` is called with an empty transactions array, THE HomeContentRenderer SHALL render exactly one EmptyStateCard inside the Container.
2. WHEN `renderHomeContent` is called with an empty transactions array, THE HomeContentRenderer SHALL ensure no TransactionList is present in the Container.
3. WHEN `renderHomeContent` is called with a non-empty transactions array, THE HomeContentRenderer SHALL render the TransactionList inside the Container.
4. WHEN `renderHomeContent` is called with a non-empty transactions array, THE HomeContentRenderer SHALL ensure no EmptyStateCard is present in the Container.
5. WHEN `renderHomeContent` is called, THE HomeContentRenderer SHALL clear all previous content from the Container before rendering new content.
6. IF `transactions` is null or undefined, THEN THE HomeContentRenderer SHALL treat it as an empty array and render the EmptyStateCard.

---

### Requirement 2: EmptyStateCard DOM Structure

**User Story:** As a user viewing the empty state, I want to see a well-structured card with an icon, title, subtitle, and action button, so that the screen feels complete and actionable rather than blank.

#### Acceptance Criteria

1. THE EmptyStateCard SHALL return a single `HTMLElement` (`<div>`) with the CSS class `empty-state-card`.
2. THE EmptyStateCard SHALL contain an icon container element displaying an inline SVG icon.
3. THE EmptyStateCard SHALL contain a title element (`<h3>`) with the text "No transactions yet".
4. THE EmptyStateCard SHALL contain a subtitle element (`<p>`) with the text "Start by adding your first payment".
5. THE EmptyStateCard SHALL contain a CTA `<button>` element with the label "Add Payment".
6. IF `onAddPayment` is not provided to `createEmptyStateCard`, THEN THE EmptyStateCard SHALL default to a no-op function and render the button without throwing an error.

---

### Requirement 3: CTA Button Behaviour

**User Story:** As a user on the empty state screen, I want the "Add Payment" button to navigate me to the add payment screen, so that I can complete my first transaction.

#### Acceptance Criteria

1. WHEN the CTA button is clicked, THE EmptyStateCard SHALL invoke the `onAddPayment` callback exactly once.
2. WHEN `onAddPayment` is invoked, THE HomeContentRenderer SHALL navigate to the `addPaymentScreen` using the existing `showScreen()` utility.
3. IF `onAddPayment` is not provided, THEN THE EmptyStateCard SHALL log a console warning in development and perform no navigation.

---

### Requirement 4: Mount Animation

**User Story:** As a user, I want the empty state card to appear with a smooth animation, so that the transition feels polished and consistent with the rest of the app.

#### Acceptance Criteria

1. WHEN the EmptyStateCard is created, THE EmptyStateCard SHALL initialise with `opacity: 0` and `transform: scale(0.95)`.
2. WHEN the EmptyStateCard is appended to the Container, THE HomeContentRenderer SHALL schedule an animation via `requestAnimationFrame` that sets `opacity: 1` and `transform: scale(1)`.
3. WHEN the animation runs, THE EmptyStateCard SHALL apply a CSS transition of `opacity 0.35s ease-out, transform 0.35s ease-out`.
4. WHEN the EmptyStateCard is mounted, THE EmptyStateCard SHALL complete the fade-in and scale-up animation on every mount, not only on first render.

---

### Requirement 5: Visual Theme Compliance

**User Story:** As a product owner, I want the empty state card to match the Blue + White design system, so that the screen is visually consistent with the rest of the AutoPay Manager UI.

#### Acceptance Criteria

1. THE EmptyStateCard SHALL use `#EEF1FF` as the background colour for the icon container.
2. THE EmptyStateCard SHALL use `linear-gradient(135deg, #3D5AFE, #6B8EFF)` as the background for the CTA button.
3. THE EmptyStateCard SHALL use `#1A1A2E` for the title text colour.
4. THE EmptyStateCard SHALL use `#6B7280` for the subtitle text colour.
5. THE EmptyStateCard SHALL use white (`#FFFFFF`) for the CTA button text colour.
6. THE EmptyStateCard SHALL use a card background of `#FFFFFF` with a box shadow of `0 2px 12px rgba(0,0,0,0.06)` and a border radius of `12px`.

---

### Requirement 6: No Blank Space Below Balance Card

**User Story:** As a user on the home screen, I want the area below the balance card to always show meaningful content, so that the screen never appears broken or incomplete.

#### Acceptance Criteria

1. WHILE the home screen is active, THE HomeContentRenderer SHALL ensure the Container always contains either the EmptyStateCard or the TransactionList.
2. WHEN `showHome()` is called, THE HomeContentRenderer SHALL be invoked before the home screen is visible to the user.

---

### Requirement 7: Guard Against Missing Container

**User Story:** As a developer, I want the render function to handle a missing container element gracefully, so that the app does not crash if the DOM is not ready.

#### Acceptance Criteria

1. IF `renderHomeContent` is called with a null or undefined container, THEN THE HomeContentRenderer SHALL return without performing any DOM operations.
2. IF `renderHomeContent` is called with a null or undefined container, THEN THE HomeContentRenderer SHALL NOT throw an error.
