/**
 * WalletConnect Demo - Wallet App using Phoenix Wallet SDK
 *
 * Refactored to use @vincenttaylorlab3/phoenix-wallet SDK (published on npm)
 * All encryption, session management handled by SDK
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
// Import polyfill FIRST - must be before SDK imports
import '@/crypto-polyfill';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  PhoenixWalletClient, 
  WalletSigner, 
  SignRequest, 
  Session,
  AsyncStorageAdapter,
  decodePayload,
// } from '@vincenttaylorlab3/phoenix-wallet';
} from '@phoenix-demo/wallet';



// Mock wallet signer implementation
// Payloads are automatically decoded from JSON strings by SDK
class MockWalletSigner implements WalletSigner {
  address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
  chainType = 'evm' as const;

  // params is already decoded from JSON string
  async signMessage(params: any): Promise<string> {
    const message = typeof params === 'string' ? params : params.message || params;
    console.log('🔏 Signing message:', message);
    // In production, use actual wallet signing logic
    return `0xmock_signature_${Date.now()}_for_${String(message).substring(0, 10)}`;
  }

  // params is already decoded from JSON string
  async signTransaction(params: any): Promise<string> {
    console.log('🔏 Signing transaction:', params);
    // In production, sign transaction
    // Example: const signedTx = await wallet.signTransaction(params);
    return `0xmock_tx_signature_${Date.now()}`;
  }

  // Optional: For batch signing (e.g., Solana)
  async signAllTransactions(transactions: any[]): Promise<string[]> {
    console.log('🔏 Signing batch transactions:', transactions.length);
    // In production, sign all transactions
    return transactions.map((_, idx) => `0xmock_batch_sig_${Date.now()}_${idx}`);
  }

  // Optional: For direct send (e.g., EVM)
  async sendTransaction(params: any): Promise<string> {
    console.log('🔏 Sending transaction:', params);
    // In production, sign and broadcast immediately
    // Example: const txHash = await provider.sendTransaction(signedTx);
    return `0xmock_tx_hash_${Date.now()}`;
  }
}

export default function Index() {
  // QR Scanner state
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);

  // Connection state
  const [connected, setConnected] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const isAutoReconnectingRef = useRef(false);

  // Request state
  const [pendingRequest, setPendingRequest] = useState<SignRequest | null>(null);

  // Mock wallet data
  const [walletAddress] = useState('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0');
  const [balance] = useState('1.5 ETH');

  // Wallet signer instance
  const [signer] = useState(() => new MockWalletSigner());

  // Phoenix Wallet Client instance with AsyncStorage for session persistence
  const [phoenixClient] = useState(() => new PhoenixWalletClient({
    storage: new AsyncStorageAdapter(AsyncStorage),
    enablePersistence: true, // Auto-restore session on reload
  }));

  /**
   * Setup Phoenix SDK event listeners and check for restored session
   */
  useEffect(() => {
    // Check if session was restored on mount and auto-reconnect
    const checkSession = async () => {
      try {
        // CRITICAL: Wait for SDK to finish loading from storage
        await phoenixClient.waitForInitialization();
        
        const hasStored = await phoenixClient.hasStoredSession();
        if (hasStored) {
          const currentSession = phoenixClient.getSession();
          if (currentSession && currentSession.connected === false) {
            console.log('📦 Stored session found, auto-reconnecting...');
            isAutoReconnectingRef.current = true;
            // Auto-reconnect on reload (similar to web app behavior)
            try {
              await phoenixClient.reconnectWithSigner(signer);
              console.log('✅ Auto-reconnected successfully');
            } catch (error: any) {
              console.warn('⚠️ Auto-reconnect failed:', error.message);
              isAutoReconnectingRef.current = false;
              // Don't show alert on auto-reconnect failure - user can manually reconnect
            }
          } else if (currentSession?.connected) {
            // Session already connected (shouldn't happen after reload, but handle it)
            console.log('✅ Session already connected');
            setConnected(true);
            setSession(currentSession);
          }
        }
      } catch (error: any) {
        console.warn('⚠️ Failed to check/restore session:', error.message);
      }
    };
    checkSession();

    // Session restored (from storage)
    phoenixClient.on('session_restored', (sessionData) => {
      console.log('📦 Session restored:', sessionData);
      // User can call reconnectWithSigner() to fully reconnect
    });

    // Session connected
    phoenixClient.on('session_connected', (sessionData) => {
      console.log('✅ Connected to dApp:', sessionData);
      const wasAutoReconnecting = isAutoReconnectingRef.current;
      setConnected(true);
      setSession(sessionData);
      isAutoReconnectingRef.current = false;
      // Only show alert if this is a new connection (not auto-reconnect)
      if (!wasAutoReconnecting) {
        Alert.alert('Success', 'Connected to dApp!');
      }
    });

    // Session disconnected
    phoenixClient.on('session_disconnected', () => {
      console.log('❌ Disconnected from dApp');
      // Don't update state if we're in the middle of restoring a session
      // The session_connected event will update the state if reconnection succeeds
      const currentSession = phoenixClient.getSession();
      if (!currentSession || !currentSession.connected) {
        setConnected(false);
        setSession(null);
        setPendingRequest(null);
      } else {
        console.log('[React] Ignoring disconnect event - session is still connected');
      }
    });

    // Sign request received
    phoenixClient.on('sign_request', (request: SignRequest) => {
      console.log('📝 Sign request received:', request.type);
      setPendingRequest(request);
    });

    // Request approved
    phoenixClient.on('request_approved', (requestId) => {
      console.log('✅ Request approved:', requestId);
      setPendingRequest(null);
    });

    // Request rejected
    phoenixClient.on('request_rejected', (requestId) => {
      console.log('❌ Request rejected:', requestId);
      setPendingRequest(null);
    });

    // Error
    phoenixClient.on('error', (error) => {
      console.error('❌ Phoenix error:', error);
      Alert.alert('Error', error.message);
    });

    // Cleanup
    return () => {
      phoenixClient.disconnect();
    };
  }, [phoenixClient]);

  /**
   * Handle QR Code scan
   */
  const handleQRScanned = async ({ data }: { data: string }) => {
    setScanning(false);

    try {
      console.log('📱 QR Scanned:', data);
      console.log('signer:', signer);

      // Parse the scanned QR to get UUID
      const phoenixData = JSON.parse(data.replace('phoenix:', ''));
      const scannedUUID = phoenixData.uuid;

      // Check if already connected to a different session
      const currentSession = phoenixClient.getSession();
      if (currentSession && currentSession.uuid !== scannedUUID) {
        console.log('[Wallet] Different UUID detected, disconnecting old session first');
        phoenixClient.disconnect();
      }

      // Connect using Phoenix SDK
      await phoenixClient.connect(data, signer);

      console.log('🔗 Connected to dApp');
    } catch (error: any) {
      console.error('Failed to connect:', error);
      Alert.alert('Connection Failed', error.message);
    }
  };

  /**
   * Approve sign request
   */
  const handleApprove = async () => {
    if (!pendingRequest) return;

    try {
      await phoenixClient.approveRequest(pendingRequest.id);
      Alert.alert('Success', 'Request approved!');
    } catch (error: any) {
      console.error('Failed to approve:', error);
      Alert.alert('Error', error.message);
    }
  };

  /**
   * Reject sign request
   */
  const handleReject = async () => {
    if (!pendingRequest) return;

    try {
      await phoenixClient.rejectRequest(pendingRequest.id, 'User rejected');
      Alert.alert('Rejected', 'Request rejected');
    } catch (error: any) {
      console.error('Failed to reject:', error);
      Alert.alert('Error', error.message);
    }
  };

  /**
   * Disconnect from dApp
   */
  const handleDisconnect = () => {
    phoenixClient.disconnect();
  };

  /**
   * Start QR scanning
   */
  const startScanning = async () => {
    // if (!permission?.granted) {
    //   const { granted } = await requestPermission();
    //   if (!granted) {
    //     Alert.alert('Permission Denied', 'Camera permission is required to scan QR codes');
    //     return;
    //   }
    // }
    // setScanning(true);
    // Test data - Phoenix URI format: phoenix:{JSON}
    const phoenixURI = `phoenix:{"version":"1","uuid":"75a4c0fd-8350-4dc3-8f5a-55f4ae7f9b2b","serverUrl":"http://localhost:3001","publicKey":"svtQ5MqDUw++lN9xbennvnPhM5CXdqqTN2jJgE95/yQ="}`
    handleQRScanned({ data: phoenixURI });
  };

  /**
   * Render approval modal
   */
  const renderApprovalModal = () => {
    if (!pendingRequest) return null;

    // Decode payload from JSON string
    let decodedPayload: any;
    try {
      decodedPayload = decodePayload(pendingRequest.payload);
    } catch (error) {
      console.error('Failed to decode payload:', error);
      decodedPayload = { error: 'Failed to decode payload' };
    }

    const isMessage = pendingRequest.type === 'sign_message';
    const isBatch = pendingRequest.type === 'sign_all_transactions';
    const isSend = pendingRequest.type === 'send_transaction';

    const getTitle = () => {
      if (isMessage) return '✍️ Sign Message';
      if (isBatch) return '📦 Sign All Transactions';
      if (isSend) return '💸 Send Transaction';
      return '✍️ Sign Transaction';
    };

    return (
      <Modal visible={true} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{getTitle()}</Text>

            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Chain:</Text>
                <Text style={styles.value}>
                  {pendingRequest.chainType.toUpperCase()} ({pendingRequest.chainId})
                </Text>
              </View>

              {isMessage ? (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.label}>Message:</Text>
                    <Text style={styles.value}>
                      {decodedPayload.message || decodedPayload}
                    </Text>
                  </View>
                </>
              ) : isBatch ? (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.label}>Transactions:</Text>
                    <Text style={styles.value}>
                      {Array.isArray(decodedPayload.transactions) 
                        ? `${decodedPayload.transactions.length} transactions`
                        : 'Invalid batch'}
                    </Text>
                  </View>
                  {Array.isArray(decodedPayload.transactions) && decodedPayload.transactions.map((tx: any, idx: number) => (
                    <View key={idx} style={styles.detailRow}>
                      <Text style={styles.label}>Tx {idx + 1}:</Text>
                      <Text style={styles.valueSmall}>
                        {tx.to || 'N/A'} - {tx.value || '0'} Wei
                      </Text>
                    </View>
                  ))}
                </>
              ) : (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.label}>To:</Text>
                    <Text style={styles.valueSmall}>{decodedPayload.to || 'N/A'}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.label}>Amount:</Text>
                    <Text style={styles.value}>
                      {decodedPayload.value || '0'} Wei
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.label}>From:</Text>
                    <Text style={styles.valueSmall}>{walletAddress}</Text>
                  </View>
                </>
              )}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.button, styles.rejectButton]} onPress={handleReject}>
                <Text style={styles.buttonText}>❌ Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.approveButton]} onPress={handleApprove}>
                <Text style={styles.buttonText}>✅ Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>🔗 Phoenix Wallet</Text>
          <Text style={styles.subtitle}>Using @phoenix-demo/wallet SDK</Text>
          <View style={styles.statusBadge}>
            {connected ? (
              <Text style={styles.statusConnected}>✅ Connected</Text>
            ) : (
              <Text style={styles.statusDisconnected}>❌ Disconnected</Text>
            )}
          </View>
        </View>

        {/* Wallet Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💳 Wallet Info</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address:</Text>
            <Text style={styles.infoValue}>{walletAddress.substring(0, 10)}...</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Balance:</Text>
            <Text style={styles.infoValue}>{balance}</Text>
          </View>
        </View>

        {/* Actions */}
        {!connected ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📱 Connect to dApp</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={startScanning}>
              <Text style={styles.buttonText}>Scan QR Code</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>ℹ️ Session Info</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>UUID:</Text>
              <Text style={styles.infoValueSmall}>{session?.uuid?.substring(0, 12)}...</Text>
            </View>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleDisconnect}>
              <Text style={styles.buttonText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* QR Scanner Modal */}
      {scanning && (
        <Modal visible={true} animationType="slide">
          <SafeAreaView style={styles.scannerContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              onBarcodeScanned={handleQRScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            />
            <TouchableOpacity style={styles.cancelButton} onPress={() => setScanning(false)}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </Modal>
      )}

      {/* Approval Modal */}
      {renderApprovalModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  statusConnected: {
    color: '#22c55e',
    fontWeight: '600',
  },
  statusDisconnected: {
    color: '#ef4444',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoValueSmall: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cancelButton: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  detailsContainer: {
    marginBottom: 24,
  },
  detailRow: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
  },
  valueSmall: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  approveButton: {
    backgroundColor: '#22c55e',
  },
});
