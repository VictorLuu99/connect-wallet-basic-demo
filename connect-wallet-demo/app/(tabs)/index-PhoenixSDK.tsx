/**
 * WalletConnect Demo - Wallet App using Phoenix Wallet SDK
 *
 * Refactored to use @phoenix-demo/wallet SDK
 * All encryption, session management handled by SDK
 */

import React, { useState, useEffect } from 'react';
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
import { PhoenixWalletClient, WalletSigner, SignRequest, Session } from '@phoenix-demo/wallet';
// Mock wallet signer implementation
class MockWalletSigner implements WalletSigner {
  address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
  chainType = 'evm' as const;

  async signMessage(params: { message: string }): Promise<string> {
    console.log('🔏 Signing message:', params.message);
    // In production, use actual wallet signing logic
    // Example: await wallet.signMessage(params.message);
    return `0xmock_signature_${Date.now()}_for_${params.message.substring(0, 10)}`;
  }

  async signTransaction(params: any): Promise<string> {
    console.log('🔏 Signing transaction:', params);
    // In production, sign and broadcast transaction
    // Example:
    // const signedTx = await wallet.signTransaction(params);
    // const txHash = await provider.sendTransaction(signedTx);
    // return txHash;
    return `0xmock_tx_hash_${Date.now()}`;
  }
}

export default function IndexPhoenixSDK() {
  // QR Scanner state
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);

  // Connection state
  const [connected, setConnected] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  // Request state
  const [pendingRequest, setPendingRequest] = useState<SignRequest | null>(null);

  // Mock wallet data
  const [walletAddress] = useState('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0');
  const [balance] = useState('1.5 ETH');

  // Wallet signer instance
  const [signer] = useState(() => new MockWalletSigner());

  // Phoenix Wallet Client instance
  const [phoenixClient] = useState(() => new PhoenixWalletClient());

  /**
   * Setup Phoenix SDK event listeners
   */
  useEffect(() => {
    // Session connected
    phoenixClient.on('session_connected', (sessionData) => {
      console.log('✅ Connected to dApp:', sessionData);
      setConnected(true);
      setSession(sessionData);
      Alert.alert('Success', 'Connected to dApp!');
    });

    // Session disconnected
    phoenixClient.on('session_disconnected', () => {
      console.log('❌ Disconnected from dApp');
      setConnected(false);
      setSession(null);
      setPendingRequest(null);
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
    const phoenixURI = `phoenix:{"version":"1","uuid":"a30652dd-cf33-4753-b4a3-18049b28d202","serverUrl":"http://localhost:3001","publicKey":"6kxzvSY9ElJiPvTvIrPgt1BVJtbxdH035HOuipiyzCk="}`
    handleQRScanned({ data: phoenixURI });
  };

  /**
   * Render approval modal
   */
  const renderApprovalModal = () => {
    if (!pendingRequest) return null;

    const isMessage = pendingRequest.type === 'sign_message';
    const payload = pendingRequest.payload as any;

    return (
      <Modal visible={true} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {isMessage ? '✍️ Sign Message' : '💸 Sign Transaction'}
            </Text>

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
                    <Text style={styles.value}>{payload.message}</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.label}>To:</Text>
                    <Text style={styles.valueSmall}>{payload.to}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.label}>Amount:</Text>
                    <Text style={styles.value}>{payload.value} Wei</Text>
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
