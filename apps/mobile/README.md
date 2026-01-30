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
- Camera capture (A-01) ✅
- PDF import (A-02) ✅
- Statement extraction API integration (A-03) ✅

**PLACEHOLDERS (not implemented yet):**
- AsyncStorage persistence (A-04)

## Extraction API Configuration

The mobile app connects to the extraction API to process statement images/PDFs.

**Local Development (Simulator/Emulator):**
The default URL is `http://localhost:8009`. This works when testing on iOS Simulator or Android Emulator.

**Physical Device Testing:**
When testing on a physical phone, you need to set the extraction API URL to your machine's LAN IP:

```bash
# In apps/mobile directory, create/edit .env
EXPO_PUBLIC_EXTRACT_URL=http://192.168.x.x:8009
```

Replace `192.168.x.x` with your machine's local IP address (find with `ipconfig` on Windows or `ifconfig` on Mac/Linux).

**Starting the Extraction API:**
```bash
# From repo root
cd apps/extraction-api
docker-compose up
```

The API will be available at `http://localhost:8009`.

## TypeScript

TypeScript strict mode is enabled in `tsconfig.json`. All type checking is enforced.

Run `npm run typecheck` to verify types.

## Notes

- No Phase 1 math engine files are imported yet
- No OpenAI keys anywhere
- This is a scaffold for Phase 2 work
