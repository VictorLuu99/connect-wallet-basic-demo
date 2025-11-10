import { EventEmitter } from 'eventemitter3';
import {
  PhoenixWalletConfig,
  PhoenixWalletEvents,
  WalletSigner,
  Session,
  SignRequest,
  PhoenixURI,
} from './types';
import { QRParser } from './core/QRParser';
import { SOCKET_EVENTS } from './utils/constants';
import { SessionStorage } from './utils/sessionStorage';
import { getDefaultStorageAdapter } from './utils/storage';
import { createSessionToken } from './utils/sessionToken.js';
import { DappSession } from './core/DappSession';

/**
 * Phoenix Wallet Client
 * Main SDK for wallet developers to handle dApp connection requests
 * Supports multiple simultaneous dApp connections
 */
export class PhoenixWalletClient extends EventEmitter<PhoenixWalletEvents> {
  private sessions: Map<string, DappSession> = new Map();
  private config: Required<PhoenixWalletConfig> & { storage: import('./utils/storage').StorageAdapter; enablePersistence: boolean };
  private sessionStorage: SessionStorage;
  private initializationPromise: Promise<void>;
  private initialized: boolean = false;

  constructor(config?: PhoenixWalletConfig) {
    super();

    const storage = config?.storage || getDefaultStorageAdapter();
    const enablePersistence = config?.enablePersistence !== false;

    this.config = {
      reconnect: config?.reconnect ?? true,
      reconnectAttempts: config?.reconnectAttempts ?? 5,
      reconnectDelay: config?.reconnectDelay ?? 2000,
      storage,
      enablePersistence,
    };

    this.sessionStorage = new SessionStorage(storage, enablePersistence);

    // Initialize and restore sessions - store promise for waitForInitialization()
    this.initializationPromise = this.initialize();
  }

  /**
   * Initialize client and restore sessions if available
   */
  private async initialize(): Promise<void> {
    try {
      await this.restoreSessions();
      this.initialized = true;
      console.log('[Phoenix Wallet] Client initialized');
    } catch (error) {
      console.warn('[Phoenix Wallet] Failed to restore sessions during initialization:', error);
      this.initialized = true; // Mark as initialized even if restore failed
    }
  }

  /**
   * Wait for client initialization to complete
   * This should be called before checking session status after page reload
   */
  async waitForInitialization(): Promise<void> {
    await this.initializationPromise;
  }

  /**
   * Check if client has completed initialization
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Connect to dApp by scanning QR code
   * Creates a new session instance for this connection
   * @returns sessionUuid for tracking this connection
   */
  async connect(qrData: string, signer: WalletSigner): Promise<string> {
    // Parse QR code
    console.log('[Phoenix Wallet] Parsing QR code:', qrData);
    const connectionData: PhoenixURI = QRParser.parseURI(qrData);
    console.log('[Phoenix Wallet] Connection data:', connectionData);

    // Check if session already exists for this UUID
    if (this.sessions.has(connectionData.uuid)) {
      const existingSession = this.sessions.get(connectionData.uuid)!;
      if (existingSession.isConnected()) {
        console.log('[Phoenix Wallet] Session already connected for UUID:', connectionData.uuid);
        return connectionData.uuid;
      }
      // Remove disconnected session to allow reconnection
      existingSession.disconnect();
      existingSession.removeAllListeners();
      this.sessions.delete(connectionData.uuid);
    }

    // Create sessionToken IMMEDIATELY (signed by wallet's blockchain private key)
    console.log('[Phoenix Wallet] Creating sessionToken...');
    const sessionToken = await createSessionToken(
      connectionData.uuid,
      signer.address,
      signer.chainType,
      connectionData.serverUrl,
      connectionData.publicKey, // dApp's public key
      signer,
      connectionData.appUrl
    );
    console.log('[Phoenix Wallet] SessionToken created and signed');

    // Create new DappSession instance
    const dappSession = new DappSession(
      connectionData.uuid,
      connectionData.serverUrl,
      connectionData.publicKey,
      sessionToken,
      signer
    );

    // Set up event forwarding from DappSession to PhoenixWalletClient
    this.setupSessionEventHandlers(dappSession);

    // Store session
    this.sessions.set(connectionData.uuid, dappSession);

    // Save session to storage
    const session = dappSession.getSession();
    await this.sessionStorage.saveSession(session, connectionData.serverUrl, dappSession.getEncryption(), connectionData.uuid).catch((error) => {
      console.warn('[Phoenix Wallet] Failed to save session:', error);
    });

    // Connect to socket server
    await dappSession.connect({
      reconnect: this.config.reconnect,
      reconnectAttempts: this.config.reconnectAttempts,
      reconnectDelay: this.config.reconnectDelay,
    });

    return connectionData.uuid;
  }

  /**
   * Set up event handlers to forward events from DappSession to PhoenixWalletClient
   */
  private setupSessionEventHandlers(dappSession: DappSession): void {
    const sessionUuid = dappSession.getUuid();

    dappSession.on('session_connected', (session) => {
      // Save connected session
      this.sessionStorage.saveSession(session, dappSession.getServerUrl(), dappSession.getEncryption(), sessionUuid).catch((error) => {
        console.warn('[Phoenix Wallet] Failed to save connected session:', error);
      });
      this.emit('session_connected', session, sessionUuid);
    });

    dappSession.on('session_disconnected', () => {
      // Update session state
      const session = dappSession.getSession();
      session.connected = false;
      this.emit('session_disconnected', sessionUuid);
    });

    dappSession.on('sign_request', (request) => {
      this.emit('sign_request', request, sessionUuid);
    });

    dappSession.on('error', (error) => {
      this.emit('error', error, sessionUuid);
    });
  }

  /**
   * Approve pending request
   * @param requestId - Request ID to approve
   * @param sessionUuid - Optional session UUID (uses first active session if not provided)
   */
  async approveRequest(requestId: string, sessionUuid?: string): Promise<void> {
    const session = this.getSessionInstance(sessionUuid);
    if (!session) {
      throw new Error('No active session found');
    }

    await session.approveRequest(requestId);
    this.emit('request_approved', requestId, session.getUuid());
  }

  /**
   * Reject pending request
   * @param requestId - Request ID to reject
   * @param reason - Optional rejection reason
   * @param sessionUuid - Optional session UUID (uses first active session if not provided)
   */
  async rejectRequest(requestId: string, reason?: string, sessionUuid?: string): Promise<void> {
    const session = this.getSessionInstance(sessionUuid);
    if (!session) {
      throw new Error('No active session found');
    }

    await session.rejectRequest(requestId, reason);
    this.emit('request_rejected', requestId, session.getUuid());
  }

  /**
   * Disconnect from dApp
   * @param sessionUuid - Optional session UUID (disconnects all if not provided)
   */
  disconnect(sessionUuid?: string): void {
    if (sessionUuid) {
      // Disconnect specific session
      const session = this.sessions.get(sessionUuid);
      if (session) {
        session.disconnect();
        session.removeAllListeners();
        this.sessions.delete(sessionUuid);
        // Clear from storage
        this.sessionStorage.clearSession(sessionUuid).catch((error) => {
          console.warn('[Phoenix Wallet] Failed to clear session from storage:', error);
        });
      }
    } else {
      // Disconnect all sessions
      this.disconnectAll();
    }
  }

  /**
   * Disconnect all sessions
   */
  disconnectAll(): void {
    for (const [uuid, session] of this.sessions.entries()) {
      session.disconnect();
      session.removeAllListeners();
      this.sessionStorage.clearSession(uuid).catch((error) => {
        console.warn('[Phoenix Wallet] Failed to clear session from storage:', error);
      });
    }
    this.sessions.clear();
  }

  /**
   * Get current session (backward compatibility)
   * @param sessionUuid - Optional session UUID (returns first active session if not provided)
   */
  getSession(sessionUuid?: string): Session | undefined {
    const session = this.getSessionInstance(sessionUuid);
    return session?.getSession();
  }

  /**
   * Get session by UUID
   */
  getSessionByUuid(uuid: string): Session | undefined {
    const session = this.sessions.get(uuid);
    return session?.getSession();
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): Session[] {
    return Array.from(this.sessions.values())
      .map((session) => session.getSession())
      .filter((session) => session.connected);
  }

  /**
   * Get pending request
   * @param sessionUuid - Optional session UUID (uses first active session if not provided)
   */
  getPendingRequest(sessionUuid?: string): SignRequest | undefined {
    const session = this.getSessionInstance(sessionUuid);
    return session?.getPendingRequest();
  }

  /**
   * Check if connected
   * @param sessionUuid - Optional session UUID (checks if any session is connected if not provided)
   */
  isConnected(sessionUuid?: string): boolean {
    if (sessionUuid) {
      const session = this.sessions.get(sessionUuid);
      return session?.isConnected() ?? false;
    }
    // Check if any session is connected
    return Array.from(this.sessions.values()).some((session) => session.isConnected());
  }

  /**
   * Get session instance by UUID or first active session
   */
  private getSessionInstance(sessionUuid?: string): DappSession | undefined {
    if (sessionUuid) {
      return this.sessions.get(sessionUuid);
    }
    // Return first connected session (backward compatibility)
    for (const session of this.sessions.values()) {
      if (session.isConnected()) {
        return session;
      }
    }
    // If no connected session, return first session
    return this.sessions.values().next().value;
  }

  /**
   * Restore sessions from storage
   */
  private async restoreSessions(): Promise<void> {
    const storedSessions = await this.sessionStorage.loadSessions();
    if (!storedSessions || storedSessions.size === 0) {
      console.log('[Phoenix Wallet] No stored sessions found');
      return;
    }

    console.log(`[Phoenix Wallet] Found ${storedSessions.size} stored session(s), restoring...`);

    // Restore sessions (but don't reconnect yet - need signer)
    for (const [uuid, storedData] of storedSessions.entries()) {
      const encryption = this.sessionStorage.restoreEncryption(storedData);
      const session: Session = {
      ...storedData.session,
        connected: false, // Always mark as not connected after restore
    };

    console.log('[Phoenix Wallet] Session restored from storage:', {
        uuid: session.uuid,
      wasConnected: storedData.session.connected,
      hasPeerPublicKey: !!storedData.peerPublicKey,
    });

      // Emit event so user knows they can reconnect
      if (storedData.session.connected && storedData.peerPublicKey) {
        this.emit('session_restored', session, uuid);
      }
    }
  }

  /**
   * Reconnect to existing session with signer
   * This can be called after restoreSession() to fully reconnect
   * @param signer - Wallet signer
   * @param sessionUuid - Optional session UUID (reconnects first restored session if not provided)
   */
  async reconnectWithSigner(signer: WalletSigner, sessionUuid?: string): Promise<void> {
    const storedSessions = await this.sessionStorage.loadSessions();
    if (!storedSessions || storedSessions.size === 0) {
      throw new Error('No stored sessions to reconnect');
    }

    // Find session to reconnect
    let targetUuid = sessionUuid;
    if (!targetUuid) {
      // Use first stored session
      targetUuid = storedSessions.keys().next().value;
    }

    const storedData = storedSessions.get(targetUuid!);
    if (!storedData) {
      throw new Error('Stored session not found');
    }

    // Verify signer matches stored session
    if (storedData.session.address !== signer.address || storedData.session.chainType !== signer.chainType) {
      throw new Error('Signer does not match stored session');
    }

    // Restore encryption
    const encryption = this.sessionStorage.restoreEncryption(storedData);
    const peerPublicKey = storedData.peerPublicKey;
    if (!peerPublicKey || !storedData.session.sessionToken) {
      throw new Error('Invalid stored session data');
    }

    // Create DappSession instance with restored encryption
    const dappSession = new DappSession(
      targetUuid!,
      storedData.serverUrl,
      peerPublicKey,
      storedData.session.sessionToken,
      signer,
      encryption // Pass restored encryption to preserve key pair
    );

    // Set up event handlers
    this.setupSessionEventHandlers(dappSession);

    // Store session
    this.sessions.set(targetUuid!, dappSession);

    try {
      // Set reconnecting flag
      dappSession.setReconnecting(true);

      // Reconnect socket
      await dappSession.reconnect({
        reconnect: this.config.reconnect,
        reconnectAttempts: this.config.reconnectAttempts,
        reconnectDelay: this.config.reconnectDelay,
      });

      // Clear reconnecting flag
      dappSession.setReconnecting(false);
    } catch (error) {
      dappSession.setReconnecting(false);
      throw error;
    }
  }

  /**
   * Check if there's a stored session that can be restored
   */
  async hasStoredSession(): Promise<boolean> {
    const storedSessions = await this.sessionStorage.loadSessions();
    return storedSessions !== null && storedSessions.size > 0;
  }
}
