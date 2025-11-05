# ⚡ Quick Start Guide

Get the WalletConnect Demo running in 5 minutes!

## 📋 Prerequisites

- ✅ Node.js 18 or higher
- ✅ npm or yarn
- ✅ Mobile device with Expo Go app installed
  - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
  - [Android Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

## 🚀 Installation (5 steps)

### Step 1: Install Backend (30 seconds)

```bash
cd backend
npm install
```

### Step 2: Install Web App (30 seconds)

```bash
cd ../web
npm install
```

### Step 3: Install Mobile App (1 minute)

```bash
cd ../connect-wallet-demo
npm install
```

### Step 4: Start All Services (Open 3 terminals)

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```
✅ Wait for: `Backend server running on port 3001`

**Terminal 2 - Web App:**
```bash
cd web
npm run dev
```
✅ Wait for: `Local: http://localhost:3000/`

**Terminal 3 - Mobile App:**
```bash
cd connect-wallet-demo
npm start
```
✅ Wait for: QR code appears in terminal

### Step 5: Open Apps

1. **Web**: Open browser → `http://localhost:3000`
2. **Mobile**: Open Expo Go → Scan QR from Terminal 3

## 🎯 Test the Flow (2 minutes)

### 1. Connect Wallet
- **Web**: Click "Connect Wallet" button
- **Result**: QR code appears on web page

### 2. Scan QR Code
- **Mobile**: Click "Scan QR Code" button
- **Action**: Scan the QR code from web page
- **Result**: Mobile shows "Connected to Web App!"

### 3. Sign Message
- **Web**: Enter message → Click "Sign Message"
- **Mobile**: Popup appears → Click "Approve"
- **Result**: Web shows signature response

### 4. Send Transaction
- **Web**: Enter address & amount → Click "Send Transaction"
- **Mobile**: Popup appears with details → Click "Approve"
- **Result**: Web shows transaction hash

## ✅ Success Checklist

After completing the quick start, you should see:

- [ ] Backend console: "Backend server running on port 3001"
- [ ] Web browser: WalletConnect Demo page at localhost:3000
- [ ] Mobile app: Wallet info with address and balance
- [ ] Connection: "Connected" status in both apps
- [ ] Sign message: Signature displayed in web app
- [ ] Send transaction: Transaction hash displayed in web app

## 🚨 Common Issues

### Backend port already in use
```bash
# Kill existing process
lsof -ti:3001 | xargs kill -9
```

### Mobile can't connect
1. Ensure computer and phone on **same WiFi**
2. Update web/src/App.jsx:
```javascript
const BACKEND_URL = 'http://YOUR_COMPUTER_IP:3001';
```
3. Find your IP:
```bash
# macOS/Linux
ifconfig | grep "inet "

# Windows
ipconfig
```

### Camera permission denied
- iOS: Settings → Expo Go → Camera → Enable
- Android: Settings → Apps → Expo Go → Permissions → Camera → Allow

### Module not found errors
```bash
# In each directory (backend, web, connect-wallet-demo)
rm -rf node_modules package-lock.json
npm install
```

## 🔍 Quick Debug

Check if everything is running:

```bash
# Backend health
curl http://localhost:3001/health

# Should return:
# {"status":"ok","sessions":0,"timestamp":...}
```

## 📚 Next Steps

- Read [README.md](./README.md) for detailed documentation
- See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues
- Check individual component READMEs:
  - [backend/README.md](./backend/README.md)
  - [web/README.md](./web/README.md)
  - [connect-wallet-demo/README.md](./connect-wallet-demo/README.md)

## 💡 Tips

1. **Network Testing**: Use your computer's local IP for mobile testing
2. **Firewall**: Allow Node.js through your firewall
3. **Cache Issues**: Run `npx expo start --clear` to clear mobile cache
4. **Browser DevTools**: Open console to see detailed logs
5. **Expo DevTools**: Press 'j' in mobile terminal to open debugger

## 🎓 Understanding the Flow

```
┌─────────┐         ┌─────────┐         ┌─────────┐
│   Web   │◄───────►│ Backend │◄───────►│ Mobile  │
└─────────┘         └─────────┘         └─────────┘
     │                    │                    │
     │ 1. Create Session  │                    │
     │───────────────────►│                    │
     │                    │                    │
     │ 2. Show QR Code    │                    │
     │◄───────────────────│                    │
     │                    │                    │
     │                    │ 3. Scan QR         │
     │                    │◄───────────────────│
     │                    │                    │
     │ 4. Connected!      │ 4. Connected!      │
     │◄───────────────────│───────────────────►│
     │                    │                    │
     │ 5. Sign Request    │                    │
     │───────────────────►│ 6. Show Popup      │
     │                    │───────────────────►│
     │                    │                    │
     │                    │ 7. User Approves   │
     │                    │◄───────────────────│
     │                    │                    │
     │ 8. Response        │                    │
     │◄───────────────────│                    │
```

## ⏱️ Estimated Time

- **Installation**: 2 minutes
- **Starting services**: 1 minute
- **Testing flow**: 2 minutes
- **Total**: ~5 minutes

Happy coding! 🚀
