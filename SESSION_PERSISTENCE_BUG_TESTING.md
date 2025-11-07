# Session Persistence Bug Testing Guide

## Bug Description
**Issue**: After page reload, the web app shows "Connect Wallet" button instead of auto-reconnecting to the wallet, even though session is saved in localStorage.

**Expected Behavior**: Page reload should restore session and auto-reconnect to wallet without requiring QR scan again.

**Current Behavior**:
- Session is restored from localStorage
- Reconnection is attempted
- But `session_disconnected` event fires during socket cleanup
- UI shows "Disconnected" instead of "Connected"

---

## Prerequisites

1. **Backend server running** on port 3001:
   ```bash
   cd backend
   npm start
   ```

2. **Web app running** on port 3000:
   ```bash
   cd web
   npm run dev
   ```

3. **Mobile wallet running** on port 8081:
   ```bash
   cd connect-wallet-demo
   npm start
   ```

4. **SDKs built**:
   ```bash
   cd packages/phoenix-dapp
   npm run build

   cd packages/phoenix-wallet
   npm run build
   ```

---

## Step-by-Step Testing Procedure

### Step 1: Start Fresh Connection

1. Open browser to `http://localhost:3000/`
2. Open DevTools Console
3. Clear localStorage:
   ```javascript
   localStorage.clear()
   ```
4. Reload page (to start with clean state)
5. Click **"Connect Wallet"** button
6. **Note the generated UUID** from console log:
   ```
   🔗 Connection URI: phoenix:{"version":"1","uuid":"COPY-THIS-UUID",...}
   ```

### Step 2: Update Mobile Wallet

1. Open file: `connect-wallet-demo/app/(tabs)/index.tsx`
2. Find line ~262 (the `phoenixURI` constant in `startScanning` function)
3. Replace the entire URI with the one from Step 1:
   ```typescript
   const phoenixURI = `phoenix:{"version":"1","uuid":"PASTE-FULL-URI-HERE"...}`
   ```
4. Save file (React Native will auto-reload)

### Step 3: Connect Wallet to DAPP

1. Open mobile wallet in browser: `http://localhost:8081/`
2. Click **"Scan QR Code"** button
3. **Verify connection on wallet**:
   - Status should show: `✅ Connected`
   - UUID should match the one from Step 1
4. **Verify connection on web app**:
   - Status should show: `✅ Connected`
   - UUID should match
   - Sign buttons should be visible

### Step 4: Test Session Persistence (THE BUG)

1. Keep wallet tab open (don't close it)
2. Go back to web app tab (`http://localhost:3000/`)
3. **Reload the page** (F5 or Cmd+R)
4. Watch the console logs carefully

**Expected Console Logs (CORRECT BEHAVIOR)**:
```
[Phoenix DAPP] Restoring session, attempting to reconnect...
[Phoenix DAPP] Manual reconnect requested
uuid 83632bda-ec5d-4570-aa87-c016f240c79a
connectSocket 83632bda-ec5d-4570-aa87-c016f240c79a
[Phoenix DAPP] Connected to server
[Phoenix DAPP] Joined room: 83632bda-ec5d-4570-aa87-c016f240c79a
✅ Session restored
```

**Actual Console Logs (BUG)**:
```
[Phoenix DAPP] Restoring session, attempting to reconnect...
[Phoenix DAPP] Manual reconnect requested
uuid 83632bda-ec5d-4570-aa87-c016f240c79a
connectSocket 83632bda-ec5d-4570-aa87-c016f240c79a
❌ Wallet disconnected  ← THIS FIRES BEFORE CONNECTION COMPLETES!
[Phoenix DAPP] Connected to server
[Phoenix DAPP] Joined room: 83632bda-ec5d-4570-aa87-c016f240c79a
```

**UI Check**:
- ❌ **BUG**: Shows "Connect Wallet" button (disconnected state)
- ✅ **FIXED**: Shows session info with UUID and "Disconnect" button (connected state)

### Step 5: Verify Session Storage

Check if session was saved to localStorage:

```javascript
// In browser console
localStorage.getItem('phoenix_session')
```

**Expected**: Should return JSON string with session data
**Actual**: Returns `null` or outdated session

---

## Root Cause Analysis

### Problem 1: Socket Cleanup Race Condition

**Location**: `packages/phoenix-dapp/src/PhoenixDappClient.ts` lines 324-330

```typescript
// Clean up old socket if exists
if (this.socket) {
  console.log('[Phoenix DAPP] Cleaning up old socket connection');
  this.socket.removeAllListeners(); // Remove listeners BEFORE disconnect
  this.socket.disconnect();         // This triggers 'disconnect' event
  this.socket = undefined;
}
```

**Issue**:
1. When page reloads, `restoreSession()` calls `reconnect()`
2. `reconnect()` calls `connectSocket(uuid)`
3. Old socket exists from previous page load (stored in memory before reload)
4. Calls `removeAllListeners()` to clear event handlers
5. Calls `disconnect()` which triggers 'disconnect' event
6. **Problem**: The disconnect listener was added to the CURRENT socket at lines 372-383
7. This listener fires `session_disconnected` event
8. React component receives this event and sets state to "Disconnected"
9. This happens BEFORE the new socket finishes connecting

### Problem 2: `removeAllListeners()` Timing

**Issue**: `removeAllListeners()` might not remove listeners synchronously, or the disconnect event has already been queued.

### Attempted Fix: `isReconnecting` Flag

**Location**: Lines 40, 322, 346, 353, 375-377

Added flag to prevent disconnect event from firing during reconnection:

```typescript
private isReconnecting: boolean = false;

// In connectSocket():
this.isReconnecting = true;

// In disconnect listener:
if (this.isReconnecting) {
  console.log('[Phoenix DAPP] Skipping disconnect event during reconnection');
  return;
}
```

**Result**: Still failing - the event is firing from a different code path

---

## Additional Testing Notes

### Check Session Storage Format

```javascript
// Expected session structure
{
  "session": {
    "uuid": "83632bda-ec5d-4570-aa87-c016f240c79a",
    "connected": true
  },
  "serverUrl": "http://localhost:3001",
  "secretKey": "...",
  "publicKey": "...",
  "peerPublicKey": "..."
}
```

### Check Event Listener Order

The disconnect listener is registered at line 372-383 (INSIDE `connectSocket`), which means:
1. First call to `connectSocket`: Adds disconnect listener to socket A
2. Page reload → constructor runs → `restoreSession()` → `reconnect()` → `connectSocket()`
3. Second call: Old socket A still exists, tries to clean it up
4. Adds disconnect listener to socket B
5. When socket A disconnects, its listener fires (even after `removeAllListeners()`?)

### Testing with Playwright MCP

Use browser automation to test reload behavior:

```javascript
// Navigate to web app
await page.goto('http://localhost:3000/');

// Click Connect Wallet
await page.click('button:has-text("Connect Wallet")');

// Get UUID from console
const uri = await page.evaluate(() => console.logs.find(log => log.includes('Connection URI')));

// Update mobile wallet file with UUID
// ... edit file ...

// Navigate to wallet and scan
await page.goto('http://localhost:8081/');
await page.click('button:has-text("Scan QR Code")');

// Verify connection
await page.waitForSelector('text=✅ Connected');

// CRITICAL TEST: Reload web app
await page.goto('http://localhost:3000/');

// Check if still shows connected
const status = await page.textContent('.status');
// Expected: "✅ Connected"
// Actual: "❌ Disconnected" ← BUG
```

---

## Success Criteria

The bug is **FIXED** when:

1. ✅ Page reload shows `[Phoenix DAPP] Restoring session` in console
2. ✅ No `❌ Wallet disconnected` event fires during reconnection
3. ✅ Console shows `[Phoenix DAPP] Connected to server`
4. ✅ UI shows `✅ Connected` status
5. ✅ Session info displays correct UUID
6. ✅ Sign buttons are visible and functional
7. ✅ Wallet tab still shows `✅ Connected`
8. ✅ Can send sign requests without re-scanning QR

---

## Files to Check When Debugging

1. **DAPP SDK**: `packages/phoenix-dapp/src/PhoenixDappClient.ts`
   - `connectSocket()` method (lines 318-391)
   - `restoreSession()` method (lines 476-507)
   - `reconnect()` method (lines 144-180)
   - Disconnect event listener (lines 372-383)

2. **Web App**: `web/src/App-PhoenixSDK.jsx`
   - `useEffect` initialization (lines 53-97)
   - `session_disconnected` listener (lines 79-83)

3. **Storage**: `packages/phoenix-dapp/src/utils/storage.ts`
   - `saveSession()` method
   - `loadSession()` method

4. **Mobile Wallet**: `connect-wallet-demo/app/(tabs)/index.tsx`
   - `phoenixURI` constant (line ~262)
   - `handleQRScanned()` method (lines 184-210)

---

## Related Issues

- Socket.io `removeAllListeners()` not removing listeners synchronously
- React state updates happening out of order
- Event emitter firing stale events after cleanup
- localStorage session not including `connected: true` flag

---

## Next Steps for Fix

1. **Option A**: Prevent disconnect event entirely during reconnection
   - Use flag to skip event emission (attempted, didn't work)
   - Remove specific listener instead of all listeners
   - Disconnect socket without triggering events

2. **Option B**: Don't emit `session_disconnected` during initialization
   - Only emit if session was previously connected
   - Check if disconnect was intentional vs. cleanup

3. **Option C**: Delay React state update until connection completes
   - Wait for `session_connected` event before updating UI
   - Ignore `session_disconnected` if reconnection is in progress

4. **Option D**: Fix root cause - don't cleanup old socket during reconnection
   - Reuse existing socket if possible
   - Only create new socket if old one is truly dead
