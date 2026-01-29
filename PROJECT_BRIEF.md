# Loanalize: Project Brief & Handoff

**Version**: 5.0 (Authorized Concept)
**Date**: January 2026
**Type**: Mobile Application (iOS/Android)

## 🚀 The Vision
**Loanalize** is the ultimate **Mortgage Utility Tool**.
It rejects gamification gimmicks, 3D models, and generic advice. Instead, it provides a **premium, high-performance financial instrument** for homeowners who want to ruthlessly optimize their mortgage and get out of debt faster.

**Core Philosophy**: "Premium Utility." The cleanest, most powerful mortgage calculator on the App Store.

---

## 🛠 Tech Stack (Strict)
*   **Framework**: **Expo** (React Native) with TypeScript.
*   **Backend / Auth**: **Supabase** (PostgreSQL, Auth, Edge Functions).
*   **AI Engine**: **GPT-4o Vision** (via OpenAI API) - Strictly for extracting data from user-uploaded photos of statements.
*   **Charting**: **Victory Native XL** (built on Skia) - Chosen for high-performance (60fps), interactive charting (scrubbing/touch).
*   **UI/Animation**: `react-native-reanimated` (complex animations) + `react-native-haptic-feedback` (tactile interactions).
*   **State Management**: Local-First architecture (AsyncStorage) with optional Cloud Sync.

---

## ✨ Key Features

### 1. "Snap & Solve" (The Entry Point)
*   **Problem**: Typing mortgage details is tedious and prone to error.
*   **Solution**: User takes a photo of their paper statement.
*   **Process**: GPT-4o extracts Principal Balance, Interest Rate, Escrow, and Maturity Date.
*   **Output**: An instant "Brutal Truth" dashboard: *"You have 26 years left. You will pay $142,000 in interest."*

### 2. The "Freedom Control Panel" (The Core Loop)
This is not a static form. It is a live, haptic instrument.
*   **Extra Payment Slider**: Slide up to test adding +$100, +$500/mo. The chart updates instantly (60fps).
*   **Bi-Weekly Toggle**: A single switch to visualize the impact of 26 half-payments/year. (Often saves ~4 years).
*   **Lump Sum Injection**: Input a one-time bonus (e.g., $10k tax refund) to see immediate term reduction.

### 3. The "Interest Mountain" (Visualization)
*   **Library**: Victory Native XL.
*   **Visual**: A stacked Area Chart showing **Principal vs. Interest** over time.
*   **Interaction**: As the user adjusts the "Freedom Slider", the "Interest" portion of the mountain physically shrinks in real-time. User can scrub the timeline to see exact balances at any future date.

### 4. Advanced Scenarios (The Pro Utilities)
*   **Recast Simulator**: Calculates the drop in monthly payment if a lump sum is paid *without* refinancing (keeping the same rate/term).
*   **Refi Breakeven Checker**: Calculates if a lower rate is worth the closing costs based on how long the user plans to stay in the home.

---

## 🎨 Design Guidelines
*   **Aesthetic**: "Premium Utility". Think **Teen Engineering** or **Linear**.
*   **Typography**: Monospace numbers (e.g., IBM Plex Mono or JetBrains Mono) for financial precision; Clean sans-serif for labels.
*   **Colors**: High contrast. Dark mode default. Stark white/green accents for data.
*   **Haptics**: Heavy use of haptic feedback on sliders and toggles to give the numbers "weight".

---

## 📂 Project Structure
*   `/app`: Expo Router file-based navigation.
*   `/components/Calculator`: Core interactive logic (Sliders, Charts).
*   `/lib/engine`: TypeScript Mortgage Math Class (Amortization, Recast, Refi logic). **Must be penny-accurate to Bankrate.**
*   `/lib/ai`: Prompts and handlers for GPT-4o extraction.

---

## 📍 Current Status
*   **Planning**: Complete (Phase V Approved).
*   **Next Step**: Initialize Expo project and build the "Engine" (Math Logic).
