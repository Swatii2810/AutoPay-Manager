# Implementation Plan: Add Payment

## Overview

All changes land in `auth/auth.js`. No new files. Tasks follow the modal lifecycle: data layer → helpers → modal DOM + UX → wiring.

## Tasks

- [x] 1. Add `savePayments()` to the data layer
  - Write `savePayments(arr)` that serialises `arr` to JSON and writes it to localStorage under key `autopay_payments`
  - Place it directly below the existing `getPayments()` function
  - _Requirements: 6.4_

  - [ ]* 1.1 Write property test for save round-trip (Property 10)
    - **Property 10: Save round-trip preserves all payment fields**
    - **Validates: Requirements 6.1, 6.3, 6.4**

- [x] 2. Implement `_generateId()` and `_calculateDate()`
  - Write `_generateId()` returning `Date.now().toString(36) + Math.random().toString(36).slice(2)`
  - Write `_calculateDate(dateStr, type)`: return `dateStr` unchanged for `one-time`; for `monthly`, advance one calendar month and clamp to last day of target month
  - _Requirements: 4.1, 4.2, 5.1, 5.2, 5.3, 5.4_

  - [ ]* 2.1 Write property test for `_generateId` uniqueness (Property 7)
    - **Property 7: Generated IDs are unique across saves**
    - **Validates: Requirements 4.1, 4.3**

  - [ ]* 2.2 Write property test for `_calculateDate` monthly (Property 8)
    - **Property 8: Monthly date calculation is correct and ISO-formatted**
    - **Validates: Requirements 5.1, 5.2**

  - [ ]* 2.3 Write property test for `_calculateDate` one-time passthrough (Property 9)
    - **Property 9: One-time date is returned unchanged and ISO-formatted**
    - **Validates: Requirements 5.3, 5.4**

- [x] 3. Implement `_validateForm(fields)`
  - Write `_validateForm({ name, amount, type, date })` returning `{ valid, errors }` per the validation rules in the design
  - Rules: name non-empty after trim; amount non-empty and parseable float > 0; date non-empty
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.7_

  - [ ]* 3.1 Write property test for whitespace-only name rejection (Property 2)
    - **Property 2: Whitespace-only name is rejected**
    - **Validates: Requirements 3.1**

  - [ ]* 3.2 Write property test for empty amount rejection (Property 3)
    - **Property 3: Empty amount is rejected**
    - **Validates: Requirements 3.2**

  - [ ]* 3.3 Write property test for non-positive amount rejection (Property 4)
    - **Property 4: Non-positive amount is rejected**
    - **Validates: Requirements 3.3**

  - [ ]* 3.4 Write property test for empty date rejection (Property 5)
    - **Property 5: Empty date is rejected**
    - **Validates: Requirements 3.4**

  - [ ]* 3.5 Write property test for invalid input never reaching localStorage (Property 6)
    - **Property 6: Invalid input never reaches localStorage**
    - **Validates: Requirements 3.7**

- [ ] 4. Checkpoint — ensure all unit tests for helpers pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement `openAddPaymentModal()`
  - Build the full modal DOM tree (overlay → card → form with name, amount, type select, date, submit, cancel) using inline styles matching the Blue + White design system
  - Animate in: `translateY(40px) → translateY(0)` + `opacity 0 → 1` over `0.3s ease-out` via `requestAnimationFrame`
  - Guard against double-open by checking `document.getElementById('apModal-overlay')`
  - Wire submit: call `_validateForm`, show inline errors on failure, clear errors on field `input`/`change`; on success call `_generateId`, `_calculateDate`, build Payment object, call `savePayments`, animate out and remove overlay, call `renderHomeContent`
  - Wire cancel button and overlay backdrop click: animate out (`opacity 1 → 0`, `0.25s ease-in`) then `remove()` — no save
  - On localStorage error: show `#apModal-saveError` inside modal, keep modal open
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.6, 6.1, 6.2, 6.3, 6.5, 7.1, 7.2, 7.3, 7.5, 7.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 10.1, 10.2, 10.3, 10.5_

  - [ ]* 5.1 Write property test for form fields reset on each open (Property 1)
    - **Property 1: Form fields reset on each open**
    - **Validates: Requirements 1.5, 10.4**

- [x] 6. Update `createEmptyStateCard` to call `openAddPaymentModal`
  - In `renderHomeContent`, replace the `onAddPayment: () => showScreen('addPaymentScreen')` callback with `onAddPayment: () => openAddPaymentModal()`
  - _Requirements: 1.1, 10.4_

- [ ] 7. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All code is pure vanilla JS with inline styles — no build tools, no frameworks
- Property tests require **fast-check** (CDN or npm); minimum 100 iterations per property
- Each property test must include the comment `// Feature: add-payment, Property N: <property_text>`
