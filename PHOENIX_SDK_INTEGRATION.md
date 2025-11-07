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
- ❌ No QR code generation (SDK returns URI, app generates QR)
- ❌ No session persistence logic
- ✅ Just use `phoenixClient.connect()`, `phoenixClient.signMessage()`
- ✅ Session automatically persisted and restored on reload
- ✅ Multi-chain support with generic payloads

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
- ❌ No session persistence logic
- ✅ Implement `WalletSigner` interface (payloads auto-decoded)
- ✅ Use `phoenixClient.connect(qrData, signer)`
- ✅ Call `phoenixClient.approveRequest()` or `rejectRequest()`
- ✅ Session automatically persisted and restored on reload
- ✅ Support batch signing and direct send

---

## 🎯 Benefits of Phoenix SDK

### For dApp Developers

1. **Simpler API**: Clean methods for all operations
   ```typescript
   await phoenixClient.connect();                    // Generate URI
   await phoenixClient.signMessage({...});           // Sign message
   await phoenixClient.signTransaction({...});       // Sign transaction
   await phoenixClient.signAllTransactions({...});   // Batch signing (Solana)
   await phoenixClient.sendTransaction({...});       // Direct send (EVM)
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
     // Payloads are automatically decoded from JSON strings
     signMessage(params: any) { 
       return myWallet.sign(params.message || params); 
     }
     signTransaction(params: any) { 
       return myWallet.signTx(params); 
     }
     // Optional: For batch signing (Solana)
     signAllTransactions(transactions: any[]) {
       return myWallet.signAll(transactions);
     }
     // Optional: For direct send (EVM)
     sendTransaction(params: any) {
       return myWallet.send(params);
     }
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

- [ ] Web: Enter transaction details → Click "Sign Transaction"
- [ ] Wallet: Approval modal shows transaction details
- [ ] Wallet: Click "Approve"
- [ ] Web: Displays transaction signature

### Test Batch Signing (Solana)

- [ ] Web: Call `signAllTransactions()` with array of transactions
- [ ] Wallet: Approval modal shows batch transactions
- [ ] Wallet: Click "Approve"
- [ ] Web: Displays array of signatures

### Test Direct Send (EVM)

- [ ] Web: Call `sendTransaction()` with transaction
- [ ] Wallet: Approval modal shows transaction
- [ ] Wallet: Click "Approve"
- [ ] Web: Displays transaction hash (broadcasted)

### Test Session Persistence

- [ ] Web: Connect wallet → Reload page → Session restored automatically
- [ ] Wallet: Connect to dApp → Reload app → Session restored (call `reconnectWithSigner`)

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
const { uri } = await phoenixClient.connect();
// Generate QR code from URI using your preferred library
import { QRCodeSVG } from 'qrcode.react';
<QRCodeSVG value={uri} size={300} />

// Sign message (payload auto-encoded)
const response = await phoenixClient.signMessage({ 
  message, // Can be string or object
  chainType, 
  chainId 
});

// Session automatically persisted - restored on reload
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
// Implement signer interface (payloads auto-decoded)
const signer: WalletSigner = {
  address: wallet.address,
  chainType: 'evm',
  // params is already decoded from JSON string
  signMessage: (params: any) => wallet.signMessage(params.message || params),
  signTransaction: (params: any) => wallet.signTransaction(params),
  // Optional methods
  signAllTransactions: (transactions: any[]) => wallet.signAll(transactions),
  sendTransaction: (params: any) => wallet.sendTransaction(params),
};

// Connect
await phoenixClient.connect(qrData, signer);

// SDK handles request automatically
phoenixClient.on('sign_request', async (request) => {
  // Show approval UI, then:
  await phoenixClient.approveRequest(request.id); // SDK signs via signer
});

// Session automatically persisted - restored on reload
phoenixClient.on('session_restored', async (session) => {
  await phoenixClient.reconnectWithSigner(signer);
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

## 🆕 New Features

### Multi-Chain Support
- **Generic Payloads**: Payloads are JSON-encoded strings, supporting any blockchain
- **Chain-Specific Types**: Convenience types for EVM and Solana available
- **Flexible Signing**: Support for batch signing (Solana) and direct send (EVM)

### Session Persistence
- **Auto-Restore**: Sessions automatically restored on page/app reload
- **Storage Adapters**: Support for localStorage (web) and AsyncStorage (React Native)
- **Auto-Reconnect**: Automatically reconnects if session was connected

### New Methods
- `signAllTransactions()` - Batch signing for Solana
- `sendTransaction()` - Direct send for EVM
- `reconnectWithSigner()` - Reconnect to stored session
- `hasStoredSession()` - Check for stored session

## 📚 Next Steps

1. **Test both implementations** side by side
2. **Compare user experience** and code simplicity
3. **Switch to Phoenix SDK** when ready
4. **Remove old crypto/encryption files** after migration
5. **Test session persistence** on reload
6. **Test multi-chain features** (batch signing, direct send)
7. **Publish SDKs** to npm when stable

---

## 🆘 Need Help?

- Check [DAPP SDK README](./packages/phoenix-dapp/README.md)
- Check [Wallet SDK README](./packages/phoenix-wallet/README.md)
- Review [examples](./packages/phoenix-dapp/examples/)
- Open an issue on GitHub

---

**Note**: Both implementations work with the same backend, so you can test them independently without any backend changes!
