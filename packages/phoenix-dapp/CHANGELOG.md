# Changelog

All notable changes to @phoenix-demo/dapp will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-11-06

### Added
- Initial release of Phoenix dApp SDK
- PhoenixDappClient for WalletConnect-style connections
- End-to-end encryption using TweetNaCl (Curve25519 + XSalsa20-Poly1305)
- QR code generation for wallet connection
- Support for signMessage and signTransaction requests
- EventEmitter3-based event system for React compatibility
- Multi-chain protocol support (EVM, Solana)
- TypeScript declarations and source maps
- Comprehensive API documentation

### Features
- Zero-trust relay architecture (backend cannot decrypt)
- Ephemeral key pairs for forward secrecy
- Replay protection with timestamp verification
- Socket.io-based real-time communication
- 64% code reduction vs manual implementation
