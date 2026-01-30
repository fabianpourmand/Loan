# Loanalize Mobile App

Expo mobile app with file-based routing for Loanalize.

**Requirements:**
- Expo SDK 54
- Expo Go SDK 54 (for physical device testing)
- Node.js 18+

## Setup

### Fresh Installation (Recommended)

```bash
cd apps/mobile
rm -rf node_modules package-lock.json
npm install
npx expo start -c
```

The `-c` flag clears the Metro bundler cache, which is important when environment variables change.

### Quick Start (Existing Installation)

```bash
cd apps/mobile
npm install
npx expo start
```

## Commands

- `npm start` - Start Expo dev server
- `npx expo start -c` - Start with cache clear (use after env changes)
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
  - **VERIFIED on physical iPhone (Expo Go SDK 54)**
  - iOS multipart fix applied (Content-Type header removed)
  - Confirm screen only overwrites fields when extracted value is non-empty
  - OCR improvements: EXIF orientation, two-pass OCR, enhanced regex patterns

**KNOWN ISSUES:**
- OCR quality varies for photos of screens; extraction may return empty values
- Image-only PDFs not yet OCR'd successfully (needs container fix)
- next_due_date and escrow extraction depend on OCR accuracy

**PLACEHOLDERS (not implemented yet):**
- AsyncStorage persistence (A-04)

## Extraction API Configuration

The mobile app connects to the extraction API to process statement images/PDFs.

### Local Development (Simulator/Emulator)

The default URL is `http://localhost:8009`. This works when testing on iOS Simulator or Android Emulator.

### Physical Device Testing

When testing on a physical phone, you **must** set the extraction API URL to your machine's LAN IP:

```bash
# In apps/mobile directory, create/edit .env
EXPO_PUBLIC_EXTRACT_URL=http://192.168.x.x:8009
```

Replace `192.168.x.x` with your machine's local IP address:
- **macOS/Linux:** Run `ifconfig` and look for `inet` under your active network interface (usually `en0` or `wlan0`)
- **Windows:** Run `ipconfig` and look for `IPv4 Address` under your active network adapter

**Important:** After changing `.env`, restart Expo with cache clear:
```bash
npx expo start -c
```

### Starting the Extraction API

```bash
# From repo root
cd apps/extraction-api
docker-compose up --build
```

The API will be available at `http://0.0.0.0:8009` (listens on all interfaces).

### Verification Steps

1. **Verify API is running:**
   - Open Safari on your iPhone (or Chrome on Android)
   - Navigate to `http://<YOUR_LAN_IP>:8009/health`
   - You should see: `{"status":"ok"}`

2. **Test extraction in app:**
   - Open Loanalize app on your phone
   - Tap "Start" → "Capture Photo" or "Import PDF"
   - On the Confirm screen, tap "Extract Fields"
   - Check console logs for `[EXTRACT]` debug output

### Troubleshooting

**"Network request failed" on iOS:**
- This commonly happens if you manually set `Content-Type` header for multipart/form-data requests
- Solution: Let `fetch()` set the Content-Type automatically (including the multipart boundary)
- The app now correctly omits Content-Type and only sets `Accept: application/json`

**Environment variable not updating:**
- Run `npx expo start -c` to clear Metro bundler cache
- Restart Expo Go app on your phone

**Cannot reach API from phone:**
- Ensure phone and computer are on the same WiFi network
- Check firewall settings on your computer (port 8009 must be open)
- Verify API is listening on `0.0.0.0:8009` (not `127.0.0.1`)

**Expo Go SDK mismatch:**
- This project requires Expo SDK 54
- Update Expo Go app on your phone to SDK 54 from App Store/Play Store
- If you see "Incompatible Expo SDK version", update the app

**Docker logs show 192.168.65.1 as request source:**
- This is normal - it's the Docker bridge IP, not your phone's IP
- The request is being forwarded correctly from your phone through Docker

## TypeScript

TypeScript strict mode is enabled in `tsconfig.json`. All type checking is enforced.

Run `npm run typecheck` to verify types.

## Notes

- No Phase 1 math engine files are imported yet
- No OpenAI keys anywhere
- This is a scaffold for Phase 2 work
