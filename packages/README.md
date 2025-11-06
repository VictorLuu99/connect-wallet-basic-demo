# Phoenix SDK Packages

This directory contains the Phoenix WalletConnect protocol SDKs.

## Packages

### [@vincenttaylorlab3/phoenix-dapp](./phoenix-dapp)
SDK for dApp developers to integrate WalletConnect-style connections.

**Installation:**
```bash
npm install @vincenttaylorlab3/phoenix-dapp
```

**Features:**
- QR code generation for wallet connections
- End-to-end encryption (TweetNaCl)
- SignMessage and SignTransaction requests
- EventEmitter3-based events
- TypeScript support

### [@vincenttaylorlab3/phoenix-wallet](./phoenix-wallet)
SDK for wallet developers to implement WalletConnect protocol.

**Installation:**
```bash
npm install @vincenttaylorlab3/phoenix-wallet
```

**Features:**
- QR code scanning support
- WalletSigner interface for custom wallets
- Automatic request handling
- React Native compatible
- TypeScript support

## Development

### Building Both Packages

```bash
# Build both SDKs
cd phoenix-dapp && npm run build
cd ../phoenix-wallet && npm run build

# Or use the build script
./build-all.sh
```

### Publishing to NPM

#### Interactive Publishing (Recommended)

```bash
# Run the interactive publish script
./publish-sdk.sh
```

This script will:
1. ✅ Check npm authentication
2. ✅ Prompt for version bump (patch/minor/major/prerelease)
3. ✅ Build both packages
4. ✅ Run dry-run tests
5. ✅ Show what will be published
6. ✅ Publish with confirmation
7. ✅ Verify publications

#### Quick Publishing

If you've already bumped versions manually:

```bash
./quick-publish.sh
```

#### Manual Publishing

```bash
# phoenix-dapp
cd phoenix-dapp
npm version patch  # or minor/major
npm run build
npm publish --access public

# phoenix-wallet
cd phoenix-wallet
npm version patch  # or minor/major
npm run build
npm publish --access public
```

### Version Management

Both packages should maintain the same version number for consistency.

**Semantic Versioning:**
- `patch`: Bug fixes (0.1.0 → 0.1.1)
- `minor`: New features, backward compatible (0.1.0 → 0.2.0)
- `major`: Breaking changes (0.1.0 → 1.0.0)
- `prerelease`: Pre-release versions (0.1.0 → 0.1.1-beta.0)

**Update versions:**
```bash
npm version patch
npm version minor
npm version major
npm version prerelease --preid=beta
```

## Documentation

- **[PUBLISHING_GUIDE.md](./PUBLISHING_GUIDE.md)** - Complete publishing guide
- **[phoenix-dapp/README.md](./phoenix-dapp/README.md)** - dApp SDK documentation
- **[phoenix-wallet/README.md](./phoenix-wallet/README.md)** - Wallet SDK documentation
- **[phoenix-dapp/CHANGELOG.md](./phoenix-dapp/CHANGELOG.md)** - dApp SDK changelog
- **[phoenix-wallet/CHANGELOG.md](./phoenix-wallet/CHANGELOG.md)** - Wallet SDK changelog

## Scripts

| Script | Description |
|--------|-------------|
| `publish-sdk.sh` | Interactive publishing with version bump prompts |
| `quick-publish.sh` | Quick publish without prompts (use current versions) |
| `build-all.sh` | Build both packages |
| `clean-all.sh` | Clean build artifacts from both packages |

## Package Structure

```
packages/
├── phoenix-dapp/              # dApp SDK
│   ├── src/                   # TypeScript source
│   ├── dist/                  # Built output (JS + declarations)
│   ├── package.json
│   ├── tsconfig.json
│   ├── README.md
│   ├── CHANGELOG.md
│   └── LICENSE
│
├── phoenix-wallet/            # Wallet SDK
│   ├── src/                   # TypeScript source
│   ├── dist/                  # Built output (JS + declarations)
│   ├── package.json
│   ├── tsconfig.json
│   ├── README.md
│   ├── CHANGELOG.md
│   └── LICENSE
│
├── PUBLISHING_GUIDE.md        # Complete publishing guide
├── publish-sdk.sh             # Interactive publish script
├── quick-publish.sh           # Quick publish script
└── README.md                  # This file
```

## NPM Links

- [@vincenttaylorlab3/phoenix-dapp](https://www.npmjs.com/package/@vincenttaylorlab3/phoenix-dapp)
- [@vincenttaylorlab3/phoenix-wallet](https://www.npmjs.com/package/@vincenttaylorlab3/phoenix-wallet)

## Support

For issues and questions:
- Check the [PUBLISHING_GUIDE.md](./PUBLISHING_GUIDE.md) troubleshooting section
- Review individual package READMEs
- Check npm documentation: https://docs.npmjs.com/

## License

Both packages are MIT licensed. See LICENSE files in individual packages.
