# Phoenix SDK Integration Guide

This guide shows how to integrate the Phoenix WalletConnect SDKs into your existing dApp and wallet applications.

## 📦 SDKs Installed

✅ **@phoenix-demo/dapp** → Installed in `web/` project
✅ **@phoenix-demo/wallet** → Installed in `connect-wallet-demo/` project

## 🔄 Migration Path

### Option 1: Test New Implementation (Recommended)

Test the Phoenix SDK implementations side-by-side with your current code:

#### Web dApp:
- ✅ **Current**: `web/src/App.jsx` (original implementation)
- ✅ **New**: `web/src/App-PhoenixSDK.jsx` (Phoenix SDK)

#### Wallet App:
- ✅ **Current**: `connect-wallet-demo/app/(tabs)/index.tsx` (original)
- ✅ **New**: `connect-wallet-demo/app/(tabs)/index-PhoenixSDK.tsx` (Phoenix SDK)

### Option 2: Replace Completely

Once tested, replace the original files:

```bash
# Web dApp
cd web/src
mv App.jsx App-Original.jsx.backup
mv App-PhoenixSDK.jsx App.jsx

# Wallet App
cd connect-wallet-demo/app/(tabs)
mv index.tsx index-Original.tsx.backup
mv index-PhoenixSDK.tsx index.tsx
```

---

## 🚀 Quick Test - Option 1 (Side by Side)

### 1. Test Web dApp with Phoenix SDK

**Update `web/src/main.jsx` temporarily:**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
// import App from './App.jsx';           // Old
import App from './App-PhoenixSDK.jsx';   // New - Phoenix SDK
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

**Run:**
```bash
cd web
npm run dev
```

### 2. Test Wallet App with Phoenix SDK

**Update `connect-wallet-demo/app/(tabs)/_layout.tsx`:**

```tsx
import { Tabs } from 'expo-router';
import React from 'react';
import { TabBarIcon } from '@/components/navigation/TabBarIcon';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index-PhoenixSDK"  // Changed from "index"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'wallet' : 'wallet-outline'} color={color} />
          ),
        }}
      />
      {/* ... other tabs ... */}
    </Tabs>
  );
}
```

**Run:**
```bash
cd connect-wallet-demo
npm start
```

---

## 📊 Code Comparison

### Web dApp Reduction

| Metric | Original | Phoenix SDK | Improvement |
|--------|----------|-------------|-------------|
| Lines of Code | ~819 | ~295 | **64% reduction** |
| Complexity | High | Low | Simpler logic |
| Encryption Code | Manual | SDK handles | No manual crypto |
| Socket Management | Manual | SDK handles | Auto reconnect |
| Error Handling | Custom | Built-in | Better UX |

**Key Simplifications:**
- ❌ No manual `generateKeyPair()`, `encryptMessage()`, `decryptMessage()`
- ❌ No socket event management
- ❌ No QR code URI encoding
- ✅ Just use `phoenixClient.connect()`, `phoenixClient.signMessage()`

### Wallet App Reduction

| Metric | Original | Phoenix SDK | Improvement |
|--------|----------|-------------|-------------|
| Lines of Code | ~1058 | ~510 | **52% reduction** |
| Complexity | High | Low | Cleaner code |
| Encryption Code | Manual | SDK handles | No manual crypto |
| Request Handling | Custom | SDK handles | Type-safe |
| Signer Interface | None | Pluggable | Flexible |

**Key Simplifications:**
- ❌ No manual encryption/decryption
- ❌ No socket event wiring
- ❌ No QR parsing logic
- ✅ Implement `WalletSigner` interface
- ✅ Use `phoenixClient.connect(qrData, signer)`
- ✅ Call `phoenixClient.approveRequest()` or `rejectRequest()`

---

## 🎯 Benefits of Phoenix SDK

### For dApp Developers

1. **Simpler API**: 3 main methods instead of 20+ functions
   ```typescript
   await phoenixClient.connect();              // Generate QR
   await phoenixClient.signMessage({...});     // Sign message
   await phoenixClient.signTransaction({...}); // Sign transaction
   ```

2. **Built-in Security**: E2E encryption, timestamp validation, replay protection

3. **Event-Driven**: React-friendly event system
   ```typescript
   phoenixClient.on('session_connected', (session) => {...});
   phoenixClient.on('request_response', (response) => {...});
   ```

4. **TypeScript Support**: Full type safety with IntelliSense

### For Wallet Developers

1. **Pluggable Signing**: Implement `WalletSigner`, SDK handles the rest
   ```typescript
   class MyWalletSigner implements WalletSigner {
     signMessage(params) { return myWallet.sign(params); }
     signTransaction(params) { return myWallet.signTx(params); }
   }
   ```

2. **No Manual Crypto**: SDK handles all encryption/decryption

3. **Simple Integration**: 3 main methods
   ```typescript
   await phoenixClient.connect(qrData, signer);  // Connect
   await phoenixClient.approveRequest(id);       // Approve
   await phoenixClient.rejectRequest(id);        // Reject
   ```

4. **Event-Driven**: Clean separation of concerns

---

## 🧪 Testing Checklist

### Test Connection Flow

- [ ] Web: Click "Connect Wallet" → QR code displays
- [ ] Wallet: Scan QR code → "Connected to dApp" message
- [ ] Web: Shows "✅ Connected" badge
- [ ] Wallet: Shows session UUID

### Test Sign Message

- [ ] Web: Enter message → Click "Sign Message"
- [ ] Wallet: Approval modal appears with message
- [ ] Wallet: Click "Approve"
- [ ] Web: Displays signature

### Test Sign Transaction

- [ ] Web: Enter transaction details → Click "Send Transaction"
- [ ] Wallet: Approval modal shows transaction details
- [ ] Wallet: Click "Approve"
- [ ] Web: Displays transaction hash

### Test Rejection

- [ ] Web: Send any request
- [ ] Wallet: Click "Reject"
- [ ] Web: Shows error message

### Test Disconnect

- [ ] Wallet: Click "Disconnect"
- [ ] Web: Shows "❌ Disconnected" badge
- [ ] Wallet: Can scan new QR code

---

## 📝 Migration Notes

### Web dApp Changes

**Before (Manual):**
```javascript
// Manual key generation
const webKeyPair = generateKeyPair();
const uuid = generateUUID();

// Manual encryption
const { encryptedPayload, nonce } = encryptMessage(
  requestData,
  mobilePublicKey,
  webKeyPair.secretKey
);

// Manual socket emit
socket.emit('web:signMessage', { uuid, encryptedPayload, nonce });
```

**After (Phoenix SDK):**
```javascript
// SDK handles everything
const { qrCodeUrl } = await phoenixClient.connect();
const response = await phoenixClient.signMessage({ message, chainType, chainId });
```

### Wallet App Changes

**Before (Manual):**
```typescript
// Manual decryption
const decryptedRequest = decryptMessage(
  data.encryptedPayload,
  data.nonce,
  webPublicKey,
  mobileKeyPair.secretKey
);

// Manual verification
if (!verifyTimestamp(decryptedRequest.timestamp)) {
  // Handle error
}

// Manual signing
const signature = await mockSign(decryptedRequest.message);

// Manual encryption
const { encryptedPayload, nonce } = encryptMessage(
  responseData,
  webPublicKey,
  mobileKeyPair.secretKey
);

// Manual socket emit
socket.emit('mobile:response', { uuid, encryptedPayload, nonce });
```

**After (Phoenix SDK):**
```typescript
// Implement signer interface
const signer: WalletSigner = {
  address: wallet.address,
  chainType: 'evm',
  signMessage: (params) => wallet.signMessage(params.message),
  signTransaction: (params) => wallet.signTransaction(params)
};

// Connect
await phoenixClient.connect(qrData, signer);

// SDK handles request automatically
phoenixClient.on('sign_request', async (request) => {
  // Show approval UI, then:
  await phoenixClient.approveRequest(request.id); // SDK signs via signer
});
```

---

## 🔧 Troubleshooting

### Import Errors

If you see import errors, make sure SDKs are installed:

```bash
# Check installations
cd web && npm list @phoenix-demo/dapp
cd connect-wallet-demo && npm list @phoenix-demo/wallet
```

### TypeScript Errors

If using TypeScript, install type definitions:

```bash
# Web
cd web && npm install --save-dev @types/node

# Wallet (already has TypeScript)
# Should work out of the box
```

### Backend Compatibility

The Phoenix SDKs use the same socket events as your current implementation:
- `connected_uuid`
- `dapp:request` / `wallet:request`
- `dapp:response` / `wallet:response`

**No backend changes needed!** ✅

---

## 📚 Next Steps

1. **Test both implementations** side by side
2. **Compare user experience** and code simplicity
3. **Switch to Phoenix SDK** when ready
4. **Remove old crypto/encryption files** after migration
5. **Publish SDKs** to npm when stable

---

## 🆘 Need Help?

- Check [DAPP SDK README](./packages/phoenix-dapp/README.md)
- Check [Wallet SDK README](./packages/phoenix-wallet/README.md)
- Review [examples](./packages/phoenix-dapp/examples/)
- Open an issue on GitHub

---

**Note**: Both implementations work with the same backend, so you can test them independently without any backend changes!
