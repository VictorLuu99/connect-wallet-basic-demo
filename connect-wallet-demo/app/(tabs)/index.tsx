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

  // Connection state - support multiple sessions
  const [sessions, setSessions] = useState<Map<string, Session>>(new Map());
  const [pendingRequests, setPendingRequests] = useState<Map<string, SignRequest>>(new Map());
  const isAutoReconnectingRef = useRef<Set<string>>(new Set());

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
   * Setup Phoenix SDK event listeners and check for restored sessions
   */
  useEffect(() => {
    // Check if sessions were restored on mount and auto-reconnect
    const checkSessions = async () => {
      try {
        // CRITICAL: Wait for SDK to finish loading from storage
        await phoenixClient.waitForInitialization();
        
        const hasStored = await phoenixClient.hasStoredSession();
        if (hasStored) {
          // Try to reconnect stored sessions
          try {
            // Reconnect first stored session (can be extended to reconnect all)
            await phoenixClient.reconnectWithSigner(signer);
            console.log('✅ Auto-reconnected successfully');
          } catch (error: any) {
            console.warn('⚠️ Auto-reconnect failed:', error.message);
            // Don't show alert on auto-reconnect failure - user can manually reconnect
          }
        }
      } catch (error: any) {
        console.warn('⚠️ Failed to check/restore sessions:', error.message);
      }
    };
    checkSessions();

    // Session restored (from storage)
    phoenixClient.on('session_restored', (sessionData: Session, sessionUuid: string) => {
      console.log('📦 Session restored:', sessionUuid, sessionData);
      setSessions((prev) => {
        const next = new Map(prev);
        next.set(sessionUuid, sessionData);
        return next;
      });
    });

    // Session connected
    phoenixClient.on('session_connected', (sessionData: Session, sessionUuid: string) => {
      console.log('✅ Connected to dApp:', sessionUuid, sessionData);
      const wasAutoReconnecting = isAutoReconnectingRef.current.has(sessionUuid);
      
      setSessions((prev) => {
        const next = new Map(prev);
        next.set(sessionUuid, sessionData);
        return next;
      });
      
      isAutoReconnectingRef.current.delete(sessionUuid);
      
      // Only show alert if this is a new connection (not auto-reconnect)
      if (!wasAutoReconnecting) {
        Alert.alert('Success', `Connected to dApp! (${sessionUuid.substring(0, 8)}...)`);
      }
    });

    // Session disconnected
    phoenixClient.on('session_disconnected', (sessionUuid: string) => {
      console.log('❌ Disconnected from dApp:', sessionUuid);
      setSessions((prev) => {
        const next = new Map(prev);
        next.delete(sessionUuid);
        return next;
      });
      setPendingRequests((prev) => {
        const next = new Map(prev);
        next.delete(sessionUuid);
        return next;
      });
    });

    // Sign request received
    phoenixClient.on('sign_request', (request: SignRequest, sessionUuid: string) => {
      console.log('📝 Sign request received:', request.type, 'from session:', sessionUuid);
      setPendingRequests((prev) => {
        const next = new Map(prev);
        next.set(sessionUuid, request);
        return next;
      });
    });

    // Request approved
    phoenixClient.on('request_approved', (requestId: string, sessionUuid: string) => {
      console.log('✅ Request approved:', requestId, 'from session:', sessionUuid);
      setPendingRequests((prev) => {
        const next = new Map(prev);
        next.delete(sessionUuid);
        return next;
      });
    });

    // Request rejected
    phoenixClient.on('request_rejected', (requestId: string, sessionUuid: string) => {
      console.log('❌ Request rejected:', requestId, 'from session:', sessionUuid);
      setPendingRequests((prev) => {
        const next = new Map(prev);
        next.delete(sessionUuid);
        return next;
      });
    });

    // Error
    phoenixClient.on('error', (error: Error, sessionUuid?: string) => {
      console.error('❌ Phoenix error:', error, sessionUuid ? `(session: ${sessionUuid})` : '');
      Alert.alert('Error', error.message);
    });

    // Cleanup
    return () => {
      phoenixClient.disconnectAll();
    };
  }, [phoenixClient, signer]);

  /**
   * Handle QR Code scan
   */
  const handleQRScanned = async ({ data }: { data: string }) => {
    setScanning(false);

    try {
      console.log('📱 QR Scanned:', data);
      console.log('signer:', signer);

      // Parse the scanned QR to get UUID (supports both old JSON and new query param format)
      let scannedUUID: string;
      if (data.startsWith('phoenix://connect?')) {
        // New format: phoenix://connect?version=1&uuid=xxx&...
        const url = new URL(data);
        scannedUUID = url.searchParams.get('uuid') || '';
      } else {
        // Legacy format: phoenix:{JSON}
        const phoenixData = JSON.parse(data.replace('phoenix:', ''));
        scannedUUID = phoenixData.uuid;
      }

      // Connect using Phoenix SDK (SDK handles parsing internally)
      // SDK now supports multiple simultaneous connections
      const sessionUuid = await phoenixClient.connect(data, signer);

      console.log('🔗 Connected to dApp with session:', sessionUuid);
    } catch (error: any) {
      console.error('Failed to connect:', error);
      Alert.alert('Connection Failed', error.message);
    }
  };

  /**
   * Approve sign request
   */
  const handleApprove = async (sessionUuid: string) => {
    const request = pendingRequests.get(sessionUuid);
    if (!request) return;

    try {
      await phoenixClient.approveRequest(request.id, sessionUuid);
      Alert.alert('Success', 'Request approved!');
    } catch (error: any) {
      console.error('Failed to approve:', error);
      Alert.alert('Error', error.message);
    }
  };

  /**
   * Reject sign request
   */
  const handleReject = async (sessionUuid: string) => {
    const request = pendingRequests.get(sessionUuid);
    if (!request) return;

    try {
      await phoenixClient.rejectRequest(request.id, 'User rejected', sessionUuid);
      Alert.alert('Rejected', 'Request rejected');
    } catch (error: any) {
      console.error('Failed to reject:', error);
      Alert.alert('Error', error.message);
    }
  };

  /**
   * Disconnect from specific dApp
   */
  const handleDisconnect = (sessionUuid: string) => {
    phoenixClient.disconnect(sessionUuid);
  };

  /**
   * Disconnect all dApps
   */
  const handleDisconnectAll = () => {
    phoenixClient.disconnectAll();
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
    const phoenixURI = `phoenix://connect?version=1&uuid=bac054dc-0425-44e1-9627-5d2608bdeb2b&serverUrl=http%3A%2F%2Flocalhost%3A3001&publicKey=H8gEY814buTL%2FOw0RKI%2FmwNlTC0iOkfpftQraFCTCUI%3D`
    handleQRScanned({ data: phoenixURI });
  };

    /**
   * Start QR scanning
   */
    const startScanning2 = async () => {
      // if (!permission?.granted) {
      //   const { granted } = await requestPermission();
      //   if (!granted) {
      //     Alert.alert('Permission Denied', 'Camera permission is required to scan QR codes');
      //     return;
      //   }
      // }
      // setScanning(true);
      // Test data - Phoenix URI format: phoenix:{JSON}
      const phoenixURI = `phoenix://connect?version=1&uuid=b00ce54a-0934-4f72-92f0-8f3dd0ebf376&serverUrl=http%3A%2F%2Flocalhost%3A3001&publicKey=ZIBLKkSIpa18LV4qkBlR5m5Pm%2F29M3j3R5U%2B4%2BgF8g8%3D`
      handleQRScanned({ data: phoenixURI });
    };

  /**
   * Render approval modal for a specific session
   */
  const renderApprovalModal = (sessionUuid: string) => {
    const pendingRequest = pendingRequests.get(sessionUuid);
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
              <TouchableOpacity style={[styles.button, styles.rejectButton]} onPress={() => handleReject(sessionUuid)}>
                <Text style={styles.buttonText}>❌ Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.approveButton]} onPress={() => handleApprove(sessionUuid)}>
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
            {sessions.size > 0 ? (
              <Text style={styles.statusConnected}>✅ {sessions.size} dApp{sessions.size > 1 ? 's' : ''} Connected</Text>
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
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📱 Connect to dApp</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={startScanning}>
            <Text style={styles.buttonText}>Scan QR Code</Text>
          </TouchableOpacity>
        </View>

             {/* Actions */}
             <View style={styles.card}>
          <Text style={styles.cardTitle}>📱 Connect to dApp</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={startScanning2}>
            <Text style={styles.buttonText}>Scan QR Code</Text>
          </TouchableOpacity>
        </View>

        {/* Connected Sessions List */}
        {sessions.size > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔗 Connected dApps ({sessions.size})</Text>
            {Array.from(sessions.entries()).map(([sessionUuid, session]) => (
              <View key={sessionUuid} style={styles.sessionItem}>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionUuid}>UUID: {sessionUuid.substring(0, 12)}...</Text>
                  <Text style={styles.sessionChain}>{session.chainType?.toUpperCase()} - {session.chainId || 'N/A'}</Text>
                  {pendingRequests.has(sessionUuid) && (
                    <Text style={styles.pendingRequest}>⚠️ Pending Request</Text>
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.disconnectButton} 
                  onPress={() => handleDisconnect(sessionUuid)}
                >
                  <Text style={styles.disconnectButtonText}>Disconnect</Text>
                </TouchableOpacity>
              </View>
            ))}
            {sessions.size > 1 && (
              <TouchableOpacity style={styles.secondaryButton} onPress={handleDisconnectAll}>
                <Text style={styles.buttonText}>Disconnect All</Text>
              </TouchableOpacity>
            )}
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

      {/* Approval Modals - one per session with pending request */}
      {Array.from(pendingRequests.keys()).map((sessionUuid) => (
        <View key={sessionUuid}>
          {renderApprovalModal(sessionUuid)}
        </View>
      ))}
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
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionUuid: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  sessionChain: {
    fontSize: 12,
    color: '#666',
  },
  pendingRequest: {
    fontSize: 12,
    color: '#f59e0b',
    marginTop: 4,
    fontWeight: '600',
  },
  disconnectButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  disconnectButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
