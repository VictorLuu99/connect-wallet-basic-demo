# Changelog

All notable changes to @phoenix-demo/wallet will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-11-06

### Added
- Initial release of Phoenix Wallet SDK
- PhoenixWalletClient for WalletConnect-style connections
- WalletSigner interface for custom wallet implementations
- End-to-end encryption using TweetNaCl (Curve25519 + XSalsa20-Poly1305)
- QR code scanning support for dApp connections
- Automatic request signing with approveRequest method
- EventEmitter3-based event system for React Native compatibility
- Multi-chain protocol support (EVM, Solana)
- TypeScript declarations and source maps
- React Native Metro bundler compatibility
- Comprehensive API documentation

### Features
- Zero-trust relay architecture (backend cannot decrypt)
- Ephemeral key pairs for forward secrecy
- Replay protection with timestamp verification
- Socket.io-based real-time communication
- 52% code reduction vs manual implementation
- PRNG polyfill guide for React Native
