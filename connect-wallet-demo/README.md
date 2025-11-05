# 🔗 WalletConnect Demo Mobile App

Expo Router app with integrated WalletConnect-like functionality for scanning QR codes and approving blockchain transactions.

## 📱 What This Does

This mobile app acts as a **crypto wallet** that:
- Scans QR codes from a web app
- Connects to backend via Socket.io
- Approves/rejects sign message requests
- Approves/rejects send transaction requests
- Uses mock crypto operations for demonstration

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the App

```bash
npm start
```

### 3. Run on Device

- **iOS**: Press `i` or run `npm run ios`
- **Android**: Press `a` or run `npm run android`
- **Expo Go**: Scan the QR code with Expo Go app

## 📦 Added Features

This project has been integrated with WalletConnect demo functionality:

✅ **expo-camera** (~16.0.10) - QR code scanning
✅ **expo-crypto** (~14.0.1) - Mock cryptographic operations
✅ **socket.io-client** (^4.6.1) - Real-time communication

## 🎯 How It Works

1. **Start Backend** (`../backend`): `npm start`
2. **Start Web App** (`../web`): `npm run dev`
3. **Start Mobile App**: `npm start`
4. **Web**: Click "Connect Wallet" → QR code appears
5. **Mobile**: Click "Scan QR Code" → Scan from web browser
6. **Connected**: Mobile receives requests from web app
7. **Approve/Reject**: User sees popup and makes choice
8. **Result**: Web app receives response

## 📂 Main Changes

### Updated Files

**`app/(tabs)/index.tsx`** - Replaced with WalletConnect screen featuring:
- QR code scanner
- Wallet info display
- Socket.io connection management
- Approval/reject modal UI
- Mock crypto operations

**`package.json`** - Added dependencies:
```json
{
  "expo-camera": "~16.0.10",
  "expo-crypto": "~14.0.1",
  "socket.io-client": "^4.6.1"
}
```

**`app.json`** - Added camera permissions:
```json
{
  "plugins": [
    ["expo-camera", {
      "cameraPermission": "Allow camera access for QR scanning"
    }]
  ],
  "ios": {
    "infoPlist": {
      "NSCameraUsageDescription": "..."
    }
  }
}
```

## 🔧 Testing the Complete Flow

### Setup All Components

```bash
# Terminal 1 - Backend
cd ../backend
npm install
npm start

# Terminal 2 - Web
cd ../web
npm install
npm run dev

# Terminal 3 - Mobile
cd ../connect-wallet-demo
npm install
npm start
```

### Test Flow

1. Open web app: `http://localhost:3000`
2. Click "Connect Wallet" on web
3. Click "Scan QR Code" on mobile
4. Point camera at QR code on web
5. Mobile shows "Connected to Web App!"
6. On web: Enter message → "Sign Message"
7. Mobile: Popup appears → Click "Approve"
8. Web: Shows signature
9. On web: Enter address & amount → "Send Transaction"
10. Mobile: Popup appears → Click "Approve"
11. Web: Shows transaction hash

## 🔐 Mock Wallet

The app uses mock wallet operations for demo purposes:

**Wallet Address**: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0`
**Balance**: `1.5 ETH` (fake)

**Sign Message**: Generates SHA256 hash as mock signature
**Send Transaction**: Generates SHA256 hash as mock transaction hash

⚠️ **Not for production!** Replace with real wallet integration.

## 📱 Camera Permissions

### iOS
- Permission requested automatically
- Grant in Settings → Expo Go → Camera if denied

### Android
- Permission requested automatically
- Grant when prompted

### Emulator/Simulator
- Camera **doesn't work** on emulators/simulators
- Must use **physical device** for QR scanning

## 🚨 Troubleshooting

### "PlatformConstants not found" Error

If you see TurboModule errors:

```bash
# Clear everything
rm -rf node_modules package-lock.json .expo
npm cache clean --force
npm install

# Clear Expo cache
npx expo start --clear
```

### Camera Not Working

1. Use physical device (not simulator)
2. Grant camera permission
3. Update Expo Go app to latest version
4. Good lighting conditions

### Connection Issues

1. Backend must be running: `curl http://localhost:3001/health`
2. Same WiFi network (mobile + computer)
3. Use computer's local IP in web app if needed
4. Check firewall allows port 3001

## 🏗️ Project Structure

```
connect-wallet-demo/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx        # ⭐ WalletConnect main screen
│   │   ├── explore.tsx      # Original explore tab
│   │   └── _layout.tsx      # Tab navigation
│   ├── _layout.tsx          # Root layout
│   └── modal.tsx            # Modal example
├── components/              # Reusable components
├── app.json                 # ⭐ Updated with camera plugin
└── package.json             # ⭐ Updated with dependencies
```

## 🎨 Customization

### Change Wallet Address/Balance

Edit in `app/(tabs)/index.tsx`:

```typescript
const [walletAddress] = useState('YOUR_ADDRESS');
const [balance] = useState('YOUR_BALANCE');
```

### Change Theme Colors

Edit styles in `app/(tabs)/index.tsx`:

```typescript
backgroundColor: '#667eea',  // Primary color
btnPrimary: { backgroundColor: '#667eea' },
```

## 📚 Learn More

- **Original Expo Router docs**: [See below](#original-expo-documentation)
- **WalletConnect demo**: See `../README.md` in root folder
- **Troubleshooting**: See `../TROUBLESHOOTING.md`
- **iOS specific**: See `../mobile/IOS_FIX_GUIDE.md`

## ✅ Success Checklist

Before reporting issues:

- [ ] `npm install` completed successfully
- [ ] Backend running at port 3001
- [ ] Web app running at port 3000
- [ ] Camera permission granted
- [ ] Using physical device (not emulator)
- [ ] Same WiFi network
- [ ] Latest Expo Go app installed
- [ ] QR code scan successful
- [ ] Socket connection established

---

## Original Expo Documentation

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

### Original Getting Started

1. Install dependencies: `npm install`
2. Start the app: `npx expo start`
3. Open in Expo Go, iOS simulator, or Android emulator

### Original Features

- File-based routing with Expo Router
- TypeScript support
- Bottom tab navigation
- Themed components

### Learn More

- [Expo documentation](https://docs.expo.dev/)
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/)
- [Expo on GitHub](https://github.com/expo/expo)
- [Discord community](https://chat.expo.dev)

---

**🔗 WalletConnect Demo** | Built with Expo SDK 54 | React 19 | TypeScript 5.9
