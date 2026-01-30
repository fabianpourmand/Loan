# Loanalize Mobile App

Expo mobile app with file-based routing for Loanalize.

## Setup

```bash
cd apps/mobile
npm install
npx expo start
```

## Commands

- `npm start` - Start Expo dev server
- `npm run ios` - Start on iOS simulator
- `npm run android` - Start on Android emulator
- `npm run typecheck` - Run TypeScript type checking

## Project Structure

```
apps/mobile/
├── app/               # File-based routing (Expo Router)
│   ├── _layout.tsx   # Root Stack layout
│   ├── index.tsx     # Home screen (Start button)
│   ├── capture.tsx   # Capture screen (placeholder)
│   └── confirm.tsx   # Confirm/edit screen
├── app.json          # Expo config
├── package.json      # Dependencies
└── tsconfig.json     # TypeScript config (strict mode ON)
```

## Current Status (Phase II / ARCH-01)

**DONE:**
- Expo + TypeScript strict mode setup
- File-based routing with Expo Router
- Three screens: Home → Capture → Confirm
- Confirm screen with editable fields + assumption mode toggle

**PLACEHOLDERS (not implemented yet):**
- Camera capture (PH2-01/A-01)
- PDF import (A-02)
- Statement extraction (A-03)
- AsyncStorage persistence (A-04)

## TypeScript

TypeScript strict mode is enabled in `tsconfig.json`. All type checking is enforced.

Run `npm run typecheck` to verify types.

## Notes

- No Phase 1 math engine files are imported yet
- No OpenAI keys anywhere
- This is a scaffold for Phase 2 work
