# Implementation Plan: Empty State UX

## Overview

Add `#homeContentArea` container to `auth/index.html` and implement `createEmptyStateCard()` + `renderHomeContent()` in `auth/auth.js`. Update `showHome()` to call `renderHomeContent()`. Pure vanilla JS with inline styles — no new files, no build tools.

## Tasks

- [x] 1. Add `#homeContentArea` container to `auth/index.html`
  - Inside `#homeScreen`, add `<div id="homeContentArea" style="display:flex;flex-direction:column;gap:16px"></div>` immediately after the balance card `<div>`
  - This is the Container that `renderHomeContent` will write into
  - _Requirements: 1.1, 6.1, 6.2_

- [x] 2. Implement `createEmptyStateCard()` in `auth/auth.js`
  - [x] 2.1 Implement the factory function
    - Add `createEmptyStateCard({ onAddPayment })` below the `showHome` function
    - Build the card `<div class="empty-state-card">` with inline styles: `background:#FFFFFF`, `border-radius:12px`, `box-shadow:0 2px 12px rgba(0,0,0,0.06)`, `padding:24px`, `text-align:center`, `opacity:0`, `transform:scale(0.95)`, `transition:opacity 0.35s ease-out,transform 0.35s ease-out`
    - Append icon container (`background:#EEF1FF`, `border-radius:10px`, `width:56px`, `height:56px`) with an inline SVG (credit-card or plus-circle outline, `stroke:#3D5AFE`)
    - Append `<h3>` "No transactions yet" with `color:#1A1A2E`, `font-weight:700`
    - Append `<p>` "Start by adding your first payment" with `color:#6B7280`
    - Append `<button>` "Add Payment" with `background:linear-gradient(135deg,#3D5AFE,#6B8EFF)`, `color:#FFFFFF`, `font-weight:700`, `border-radius:50px`, `border:none`, `padding:12px 24px`, `cursor:pointer`
    - Default `onAddPayment` to a no-op if not provided; log `console.warn` in that case
    - Wire button `onclick` to `onAddPayment`
    - Return the card element
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.3, 4.1, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 2.2 Write property test for `createEmptyStateCard` structural completeness
    - **Property 5: EmptyStateCard structural completeness**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

  - [ ]* 2.3 Write property test for initial animation state
    - **Property 7: EmptyStateCard initial animation state**
    - **Validates: Requirements 4.1**

  - [ ]* 2.4 Write property test for CTA callback invoked exactly once per click
    - **Property 6: CTA callback invoked exactly once per click**
    - **Validates: Requirements 3.1**

  - [ ]* 2.5 Write property test for theme colour compliance
    - **Property 9: Theme colour compliance**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**

- [x] 3. Implement `renderHomeContent()` in `auth/auth.js`
  - [x] 3.1 Implement the render function
    - Add `renderHomeContent(transactions, container)` below `createEmptyStateCard`
    - Guard: `if (!container) return;`
    - Normalise: `const txns = transactions ?? []`
    - Clear: `container.innerHTML = ''`
    - If `txns.length === 0`: create and append `createEmptyStateCard({ onAddPayment: () => showScreen('addPaymentScreen') })`, then call `requestAnimationFrame` to set `opacity:'1'` and `transform:'scale(1)'` on the card
    - Else: append a placeholder `<p>` "Transaction list coming soon" (or existing list logic if present) — ensures Container is never empty
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.2, 4.2, 4.3, 4.4, 6.1, 7.1, 7.2_

  - [ ]* 3.2 Write property test for empty array renders exactly one EmptyStateCard
    - **Property 1: Empty array renders exactly one EmptyStateCard and no TransactionList**
    - **Validates: Requirements 1.1, 1.2**

  - [ ]* 3.3 Write property test for non-empty array renders no EmptyStateCard
    - **Property 2: Non-empty array renders TransactionList and no EmptyStateCard**
    - **Validates: Requirements 1.3, 1.4**

  - [ ]* 3.4 Write property test for container content invariant
    - **Property 3: Container content invariant**
    - **Validates: Requirements 6.1**

  - [ ]* 3.5 Write property test for re-render clears previous content
    - **Property 4: Re-render clears previous content**
    - **Validates: Requirements 1.5**

  - [ ]* 3.6 Write property test for animation resets on every mount
    - **Property 8: Animation resets on every mount**
    - **Validates: Requirements 4.4**

- [x] 4. Update `showHome()` to call `renderHomeContent()`
  - In `auth/auth.js`, update `showHome(m)` to retrieve the container via `document.getElementById('homeContentArea')` and call `renderHomeContent(getTransactions ? getTransactions() : [], container)` after `showScreen('homeScreen')`
  - If `getTransactions` does not yet exist, pass `[]` as the transactions argument
  - _Requirements: 6.2_

- [x] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check as specified in the design document
- The `#homeContentArea` div must exist in the DOM before `showHome()` is called — task 1 is a hard prerequisite for tasks 3 and 4
