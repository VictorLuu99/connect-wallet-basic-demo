# Mobile Wallet Reload Bug Testing Guide

## Bug Description
**Issue**: After page reload, the mobile wallet should auto-reconnect to the dApp, but signMessage and signTransaction may not work after reload.

**Expected Behavior**: 
- Page reload should restore session and auto-reconnect to dApp
- SignMessage and signTransaction should work after reload without requiring re-scan

**Current Behavior**:
- Session is restored from AsyncStorage
- Reconnection is attempted
- But signMessage/signTransaction may fail after reload

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

1. Open browser to `http://localhost:3000/` (Web dApp)
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

1. Keep web app tab open (don't close it)
2. Go to mobile wallet tab (`http://localhost:8081/`)
3. **Reload the page** (F5 or Cmd+R)
4. Watch the console logs carefully

**Expected Console Logs (CORRECT BEHAVIOR)**:
```
[Phoenix Wallet] Session restored, ready to reconnect with signer
📦 Stored session found, auto-reconnecting...
[Phoenix Wallet] Setting isReconnecting = true
[Phoenix Wallet] Connected to server
[Phoenix Wallet] Session established
✅ Auto-reconnected successfully
✅ Connected to dApp: {uuid: ..., connected: true, ...}
```

**Actual Console Logs (BUG)**:
```
[Phoenix Wallet] Session restored, ready to reconnect with signer
📦 Stored session found, auto-reconnecting...
❌ Disconnected from dApp  ← THIS FIRES BEFORE CONNECTION COMPLETES!
[Phoenix Wallet] Connected to server
[Phoenix Wallet] Session established
```

**UI Check**:
- ✅ **FIXED**: Shows `✅ Connected` status
- ✅ **FIXED**: Session info displays correct UUID
- ❌ **BUG**: SignMessage/SignTransaction may not work after reload

### Step 5: Test Sign Operations After Reload

1. After reload and reconnection, go back to web app tab
2. Try to **Sign Message**:
   - Enter a message
   - Click "Sign Message" button
   - **Expected**: Request should appear in wallet, can approve
   - **Actual**: May fail or not appear in wallet

3. Try to **Sign Transaction**:
   - Enter transaction details
   - Click "Sign Transaction" button
   - **Expected**: Request should appear in wallet, can approve
   - **Actual**: May fail or not appear in wallet

---

## Root Cause Analysis

### Problem 1: Socket Cleanup Race Condition

**Location**: `packages/phoenix-wallet/src/PhoenixWalletClient.ts` lines 175-188

**Issue**:
1. When page reloads, `restoreSession()` restores session
2. `reconnectWithSigner()` calls `connectSocket()`
3. Old socket exists from previous page load
4. Calls `removeAllListeners()` to clear event handlers
5. Calls `disconnect()` which might trigger 'disconnect' event
6. **Problem**: The disconnect listener was added to the CURRENT socket
7. This listener fires `session_disconnected` event
8. React component receives this event and sets state to "Disconnected"
9. This happens BEFORE the new socket finishes connecting

### Problem 2: Sign Request Handler Not Re-registered

**Location**: `packages/phoenix-wallet/src/PhoenixWalletClient.ts` lines 215-217

**Issue**:
- Sign request listener is registered in `connectSocket()` CONNECT handler
- If reconnection happens, the listener might not be properly registered
- Or the socket might not be fully ready to receive requests

### Problem 3: `isReconnecting` Flag Timing

**Issue**: `isReconnecting` flag might be cleared before sign request handler is registered.

---

## Success Criteria

The bug is **FIXED** when:

1. ✅ Page reload shows `📦 Stored session found, auto-reconnecting...` in console
2. ✅ No `❌ Disconnected from dApp` event fires during reconnection
3. ✅ Console shows `[Phoenix Wallet] Connected to server`
4. ✅ Console shows `✅ Auto-reconnected successfully`
5. ✅ UI shows `✅ Connected` status
6. ✅ Session info displays correct UUID
7. ✅ **SignMessage works after reload** - request appears in wallet
8. ✅ **SignTransaction works after reload** - request appears in wallet
9. ✅ Can approve/reject requests after reload
10. ✅ Web app tab still shows `✅ Connected`

---

## Files to Check When Debugging

1. **Wallet SDK**: `packages/phoenix-wallet/src/PhoenixWalletClient.ts`
   - `connectSocket()` method (lines 175-259)
   - `reconnectWithSigner()` method (lines 324-354)
   - `restoreSession()` method (lines 290-318)
   - Disconnect event listener (lines 243-257)
   - Sign request listener (lines 215-217)

2. **Mobile Wallet**: `connect-wallet-demo/app/(tabs)/index.tsx`
   - `useEffect` initialization (lines 101-133)
   - `session_disconnected` listener (lines 158-162)
   - `session_connected` listener (lines 145-155)

3. **Storage**: `packages/phoenix-wallet/src/utils/sessionStorage.ts`
   - `saveSession()` method
   - `loadSession()` method

4. **Web App**: `web/src/App-PhoenixSDK.jsx`
   - Sign message handler
   - Sign transaction handler

---

## Related Issues

- Socket.io `removeAllListeners()` not removing listeners synchronously
- React state updates happening out of order
- Event emitter firing stale events after cleanup
- Sign request handler not re-registered after reconnection
- Socket not ready to receive requests immediately after connection

---

## Next Steps for Fix

1. **Option A**: Ensure sign request handler is registered after reconnection
   - Verify handler is in CONNECT event
   - Add logging to confirm handler registration
   - Check if socket is ready before sending requests

2. **Option B**: Wait for socket to be fully ready before allowing sign operations
   - Add ready state check
   - Queue requests until socket is ready

3. **Option C**: Re-register all event handlers after reconnection
   - Ensure all listeners are properly set up
   - Verify socket state before operations

4. **Option D**: Fix root cause - ensure proper socket state after reconnection
   - Verify socket is connected and ready
   - Check if room is properly joined
   - Ensure encryption keys are properly restored

---

## Testing with Playwright MCP

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

// CRITICAL TEST: Reload mobile wallet
await page.goto('http://localhost:8081/');

// Check if still shows connected
const status = await page.textContent('.status');
// Expected: "✅ Connected"

// TEST: Try signMessage after reload
await page.goto('http://localhost:3000/');
await page.fill('input[placeholder*="message"]', 'Test message');
await page.click('button:has-text("Sign Message")');

// Check if request appears in wallet
await page.goto('http://localhost:8081/');
const hasRequest = await page.waitForSelector('text=Sign Request', { timeout: 5000 });
// Expected: Request should appear
```

## Important Notes

### If Wallet SDK Changes

**CRITICAL**: After making changes to `packages/phoenix-wallet/src/`, you MUST:

1. **Rebuild the SDK**:
   ```bash
   cd packages/phoenix-wallet
   npm run build
   ```

2. **Clear Metro Cache** (for React Native):
   ```bash
   cd connect-wallet-demo
   npx expo start --clear
   ```

3. **Hard Reload Browser** (for web testing):
   - Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
   - Or clear browser cache

### Current Issues Found

1. **Auto-reconnect not working**: Wallet shows "❌ Disconnected" after reload
   - Session restoration logs appear but auto-reconnect doesn't trigger
   - Need to check if `waitForInitialization()` is being called correctly

2. **Sign operations fail after reload**: 
   - SignMessage/SignTransaction requests timeout
   - Wallet not receiving requests after reload
   - Likely because socket isn't properly reconnected or sign request listener not registered

3. **Metro bundler cache**: 
   - Changes to SDK may not be picked up immediately
   - Need to clear cache or restart Metro

## Fixes Applied

1. ✅ Added `isReconnecting` flag to prevent disconnect events during reconnection
2. ✅ Fixed `connectSocket()` to properly clean up old sockets
3. ✅ Fixed `reconnectWithSigner()` to set flag before connecting
4. ✅ Fixed `disconnect()` to check flag before emitting events
5. ✅ Added `waitForInitialization()` method to PhoenixWalletClient
6. ✅ Updated React component to use `waitForInitialization()`
7. ✅ Fixed `restoreSession()` to mark session as `connected: false` after restore
8. ✅ Added defensive check in React component disconnect handler
9. ✅ Updated React component to auto-reconnect on reload

## Next Steps

1. Clear Metro cache and restart mobile wallet
2. Test reload again to verify auto-reconnect works
3. Test signMessage and signTransaction after reload
4. Verify sign request listener is properly registered after reconnection

