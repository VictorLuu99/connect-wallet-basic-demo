import { SessionToken, ChainType } from '../types/index.js';
import { WalletSigner } from '../types/signer.js';

/**
 * Create session token signed by wallet's blockchain private key
 *
 * Message format: "${sessionId}:${walletAddress}:${chainType}:${appUrl}:${serverUrl}:${dappPublicKey}:${timestamp}"
 *
 * @param sessionId - UUID from QR code connection
 * @param walletAddress - Wallet's blockchain address
 * @param chainType - Chain type (evm, solana, etc.)
 * @param serverUrl - Backend relay server URL
 * @param dappPublicKey - dApp's encryption public key (base64)
 * @param signer - WalletSigner instance for signing
 * @param appUrl - Optional dApp app URL
 * @returns SessionToken with signature
 */
export async function createSessionToken(
  sessionId: string,
  walletAddress: string,
  chainType: ChainType,
  serverUrl: string,
  dappPublicKey: string,
  signer: WalletSigner,
  appUrl?: string
): Promise<SessionToken> {
  const timestamp = Date.now();

  // Create message to sign
  // Format: sessionId:address:chain:appUrl:serverUrl:pubKey:timestamp
  const message = `${sessionId}:${walletAddress}:${chainType}:${appUrl || ''}:${serverUrl}:${dappPublicKey}:${timestamp}`;

  // Sign with wallet's blockchain private key (NOT encryption key)
  const signature = await signer.signMessage({ message });

  // Return complete session token
  return {
    sessionId,
    walletAddress,
    chainType,
    appUrl,
    serverUrl,
    dappPublicKey,
    timestamp,
    signature
  };
}

/**
 * Validate session token matches current session parameters
 *
 * NOTE: This does NOT verify the signature (wallet already created it).
 * This only validates that the token's parameters match the current session.
 *
 * Checks:
 * - sessionId matches current session UUID
 * - walletAddress matches current session address
 * - chainType matches current session chain
 * - serverUrl matches stored server URL
 * - dappPublicKey matches peer's public key
 * - timestamp is within 5-minute window (replay protection)
 *
 * @param token - SessionToken from sign request
 * @param currentSession - Current session state
 * @param currentServerUrl - Stored server URL
 * @param currentDappPublicKey - Stored dApp public key
 * @returns true if valid, false otherwise
 */
export function validateSessionToken(
  token: SessionToken,
  currentSession: {
    uuid: string;
    address: string;
    chainType: ChainType;
  },
  currentServerUrl: string,
  currentDappPublicKey: string
): boolean {
  // Check session ID matches
  if (token.sessionId !== currentSession.uuid) {
    console.error('[SessionToken] Validation failed: sessionId mismatch');
    return false;
  }

  // Check wallet address matches (case-insensitive for EVM)
  const tokenAddress = token.walletAddress.toLowerCase();
  const sessionAddress = currentSession.address.toLowerCase();
  if (tokenAddress !== sessionAddress) {
    console.error('[SessionToken] Validation failed: address mismatch');
    return false;
  }

  // Check chain type matches
  if (token.chainType !== currentSession.chainType) {
    console.error('[SessionToken] Validation failed: chainType mismatch');
    return false;
  }

  // Check server URL matches
  if (token.serverUrl !== currentServerUrl) {
    console.error('[SessionToken] Validation failed: serverUrl mismatch');
    return false;
  }

  // Check dApp public key matches
  if (token.dappPublicKey !== currentDappPublicKey) {
    console.error('[SessionToken] Validation failed: dappPublicKey mismatch');
    return false;
  }

  // Check timestamp freshness (5-minute window)
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes in milliseconds
  if (now - token.timestamp > maxAge) {
    console.error('[SessionToken] Validation failed: token expired');
    return false;
  }

  return true;
}
