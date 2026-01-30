# Mobile Extraction Troubleshooting Guide

Common issues when integrating Loanalize mobile app (Expo SDK 54) with the extraction API.

---

## 1. Expo Go SDK Mismatch

**Symptom:**
- "Incompatible Expo SDK version" error when opening app
- App crashes immediately on launch

**Cause:**
- Project uses Expo SDK 54, but your Expo Go app is older/newer

**Fix:**
```bash
# Update Expo Go on your phone
# iOS: App Store → Search "Expo Go" → Update
# Android: Play Store → Search "Expo Go" → Update

# Verify project SDK version
cd apps/mobile
cat app.json | grep sdkVersion
# Should show: "sdkVersion": "54.0.0"
```

---

## 2. Wrong URL (localhost vs LAN IP)

**Symptom:**
- "Network request failed" error on physical device
- Works on simulator but not on phone

**Cause:**
- Physical devices cannot reach `localhost` or `127.0.0.1`
- Must use host machine's LAN IP address

**Fix:**
```bash
# Find your LAN IP
# macOS/Linux:
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows:
ipconfig | findstr IPv4

# Create/edit apps/mobile/.env
EXPO_PUBLIC_EXTRACT_URL=http://192.168.x.x:8009

# Replace 192.168.x.x with your actual LAN IP
```

**Verify:**
1. Open Safari (iOS) or Chrome (Android) on your phone
2. Navigate to `http://192.168.x.x:8009/health`
3. Should see: `{"status":"ok"}`

---

## 3. Environment Variable Not Updating

**Symptom:**
- Changed `.env` file but app still uses old URL
- Console logs show wrong extraction URL

**Cause:**
- Metro bundler caches environment variables
- Expo Go app may cache old bundle

**Fix:**
```bash
cd apps/mobile

# Clear Metro cache and restart
npx expo start -c

# If still not working:
# 1. Stop Expo dev server (Ctrl+C)
# 2. Close Expo Go app on phone (swipe up to kill)
# 3. Restart dev server: npx expo start -c
# 4. Reopen app on phone
```

**Verify:**
- Check console logs for `[EXTRACT] url=` output
- Should show your LAN IP, not localhost

---

## 4. iOS Multipart Boundary Error

**Symptom:**
- "Network request failed" on iOS (works on Android)
- No response from server
- Request never reaches extraction API

**Cause:**
- Manually setting `Content-Type: multipart/form-data` header
- iOS requires the boundary parameter: `multipart/form-data; boundary=----WebKitFormBoundary...`
- If you set Content-Type manually, fetch won't add the boundary

**Fix:**
```typescript
// ❌ WRONG - Do not set Content-Type manually
const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data', // ❌ Missing boundary!
    'Accept': 'application/json',
  },
  body: formData,
});

// ✅ CORRECT - Let fetch set Content-Type automatically
const response = await fetch(url, {
  method: 'POST',
  headers: {
    Accept: 'application/json', // Only set Accept header
  },
  body: formData, // fetch will set Content-Type with boundary
});
```

**Why this happens:**
- When you pass FormData to fetch, the browser/runtime automatically sets:
  - `Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...`
- The boundary is a random string that separates form fields
- If you override Content-Type, the boundary is lost and the server can't parse the request

**Current status:**
- ✅ Fixed in `apps/mobile/app/confirm.tsx` (as of 2026-01-31)

---

## 5. File URI Format Issues

**Symptom:**
- Extraction API returns 400 Bad Request
- File upload fails with "Invalid file format"

**Cause:**
- iOS Camera returns `ph://` URIs (Photos library)
- Some file pickers return `content://` URIs (Android)
- Extraction API may expect `file://` URIs

**Current Status:**
- ⚠️ Not yet implemented (may be needed in future)

**Potential Fix (if needed):**
```typescript
// Convert ph:// or content:// to file://
import * as FileSystem from 'expo-file-system';

async function normalizeFileUri(uri: string): Promise<string> {
  if (uri.startsWith('ph://') || uri.startsWith('content://')) {
    // Copy to cache directory
    const filename = `temp_${Date.now()}.jpg`;
    const destUri = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.copyAsync({ from: uri, to: destUri });
    return destUri;
  }
  return uri;
}
```

---

## 6. Firewall Blocking Port 8009

**Symptom:**
- Health check fails from phone: `http://192.168.x.x:8009/health`
- Works from host machine: `http://localhost:8009/health`

**Cause:**
- Firewall on host machine blocking incoming connections on port 8009

**Fix (macOS):**
```bash
# Check if port is listening
lsof -i :8009

# Allow incoming connections (System Preferences → Security & Privacy → Firewall)
# Or temporarily disable firewall for testing
```

**Fix (Windows):**
```powershell
# Add firewall rule
netsh advfirewall firewall add rule name="Loanalize API" dir=in action=allow protocol=TCP localport=8009
```

**Fix (Linux):**
```bash
# UFW
sudo ufw allow 8009/tcp

# iptables
sudo iptables -A INPUT -p tcp --dport 8009 -j ACCEPT
```

---

## 7. Docker Not Listening on 0.0.0.0

**Symptom:**
- API works on host machine but not from phone
- `docker ps` shows `127.0.0.1:8009` instead of `0.0.0.0:8009`

**Cause:**
- docker-compose.yml binds to localhost only

**Fix:**
```yaml
# apps/extraction-api/docker-compose.yml
services:
  api:
    ports:
      - "0.0.0.0:8009:8009"  # ✅ Bind to all interfaces
      # NOT: "127.0.0.1:8009:8009"  # ❌ Localhost only
```

**Verify:**
```bash
docker ps
# Should show: 0.0.0.0:8009->8009/tcp
```

---

## 8. Phone and Computer on Different Networks

**Symptom:**
- Cannot reach `http://192.168.x.x:8009/health` from phone
- Ping fails

**Cause:**
- Phone on cellular data or different WiFi network
- Computer on Ethernet, phone on WiFi (may be isolated)

**Fix:**
1. Ensure both devices on same WiFi network
2. Disable cellular data on phone (force WiFi)
3. Check router settings for "AP Isolation" or "Client Isolation" (disable if enabled)

---

## 9. EXPO_PUBLIC_EXTRACT_URL Missing

**Symptom:**
- App shows error: "EXPO_PUBLIC_EXTRACT_URL is missing"
- Extraction button does nothing

**Cause:**
- `.env` file not created or variable not set
- As of 2026-01-31, app hard-fails if this variable is missing

**Fix:**
```bash
cd apps/mobile

# Create .env file
cat > .env << EOF
EXPO_PUBLIC_EXTRACT_URL=http://192.168.x.x:8009
EOF

# Restart with cache clear
npx expo start -c
```

---

## 10. Docker Logs Show 192.168.65.1 as Request Source

**Symptom:**
- Docker logs show requests from `192.168.65.1` instead of phone's IP
- Worried requests aren't coming from phone

**Cause:**
- This is normal Docker behavior
- `192.168.65.1` is the Docker bridge IP (Docker Desktop on Mac)
- Requests are being forwarded correctly from phone → host → Docker

**Fix:**
- No fix needed - this is expected behavior
- Your phone's requests are reaching the API correctly

---

## Debug Checklist

When extraction fails, check console logs for `[EXTRACT]` output:

```
[EXTRACT] url= http://192.168.x.x:8009/v1/extract
[EXTRACT] file uri= file:///path/to/image.jpg
[EXTRACT] file type= image/jpeg name= image.jpg
[EXTRACT] status= 200
[EXTRACT] body= {"fields":{"principal_balance":...}}
```

**What to check:**
1. ✅ URL uses LAN IP (not localhost)
2. ✅ File URI is valid (file://, ph://, or content://)
3. ✅ File type is correct (image/jpeg, image/png, application/pdf)
4. ✅ Status is 200 (not 400, 500, or network error)
5. ✅ Body contains valid JSON with fields

---

## Quick Reference

| Issue | Quick Fix |
|-------|-----------|
| SDK mismatch | Update Expo Go app from store |
| Network failed (physical device) | Use LAN IP in `.env`, not localhost |
| Env not updating | `npx expo start -c` |
| iOS multipart error | Remove Content-Type header, keep Accept only |
| Firewall blocking | Allow port 8009 in firewall settings |
| Docker not accessible | Bind to `0.0.0.0:8009` in docker-compose.yml |
| Different networks | Ensure phone and computer on same WiFi |
| Missing env var | Create `.env` with `EXPO_PUBLIC_EXTRACT_URL` |

---

## Still Stuck?

1. Check [apps/mobile/README.md](../apps/mobile/README.md) for setup instructions
2. Check [apps/extraction-api/README.md](../apps/extraction-api/README.md) for API docs
3. Verify health endpoint works from phone's browser: `http://<LAN_IP>:8009/health`
4. Check console logs for `[EXTRACT]` debug output
5. Verify Expo SDK 54 alignment (project + Expo Go app)
