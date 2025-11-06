/**
 * React Native Example - Phoenix Wallet SDK
 *
 * This example shows how to integrate Phoenix Wallet SDK
 * into a React Native wallet application
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Modal } from 'react-native';
import { PhoenixWalletClient, WalletSigner, SignRequest } from '@phoenix/wallet';
// Assuming you have a QR scanner library
// import { BarCodeScanner } from 'expo-barcode-scanner';

// Example: Your wallet's signer implementation
class MyWalletSigner implements WalletSigner {
  address: string;
  chainType: 'evm' | 'solana';
  private privateKey: string;

  constructor(address: string, privateKey: string, chainType: 'evm' | 'solana') {
    this.address = address;
    this.privateKey = privateKey;
    this.chainType = chainType;
  }

  async signMessage(params: { message: string }): Promise<string> {
    // Your actual signing logic here
    // This is just a placeholder
    console.log('Signing message:', params.message);

    // Example: Use ethers or @solana/web3.js
    // const signature = await wallet.signMessage(params.message);
    // return signature;

    return 'mock_signature_' + Date.now();
  }

  async signTransaction(params: any): Promise<string> {
    // Your actual transaction signing and broadcasting logic
    console.log('Signing transaction:', params);

    // Example: Sign and broadcast transaction
    // const tx = await wallet.signTransaction(params);
    // const txHash = await provider.sendTransaction(tx);
    // return txHash;

    return 'mock_tx_hash_' + Date.now();
  }
}

export function WalletExample() {
  const [client] = useState(() => new PhoenixWalletClient());
  const [scanning, setScanning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<SignRequest | null>(null);

  // Your wallet's signer (initialize with actual wallet data)
  const [signer] = useState(() => new MyWalletSigner(
    '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    'your_private_key_here',
    'evm'
  ));

  useEffect(() => {
    // Setup event listeners
    client.on('session_connected', (session) => {
      console.log('Connected to dApp:', session);
      setConnected(true);
    });

    client.on('session_disconnected', () => {
      console.log('Disconnected from dApp');
      setConnected(false);
      setPendingRequest(null);
    });

    client.on('sign_request', (request: SignRequest) => {
      console.log('Sign request received:', request);
      setPendingRequest(request);
    });

    client.on('request_approved', (requestId) => {
      console.log('Request approved:', requestId);
    });

    client.on('error', (error) => {
      console.error('Phoenix error:', error);
      alert(error.message);
    });

    // Cleanup
    return () => {
      client.disconnect();
    };
  }, [client]);

  const handleScanQR = async () => {
    setScanning(true);

    // In real app, you would use a QR scanner library
    // For this example, we'll use a mock QR data
    // const { status } = await BarCodeScanner.requestPermissionsAsync();
    // if (status === 'granted') {
    //   setScanning(true);
    // }
  };

  const handleQRScanned = async (qrData: string) => {
    setScanning(false);

    try {
      await client.connect(qrData, signer);
    } catch (error) {
      console.error('Connection failed:', error);
      alert('Failed to connect to dApp');
    }
  };

  const handleApprove = async () => {
    if (!pendingRequest) return;

    try {
      await client.approveRequest(pendingRequest.id);
      setPendingRequest(null);
      alert('Request approved successfully!');
    } catch (error) {
      console.error('Failed to approve:', error);
      alert('Failed to approve request');
    }
  };

  const handleReject = async () => {
    if (!pendingRequest) return;

    try {
      await client.rejectRequest(pendingRequest.id, 'User rejected');
      setPendingRequest(null);
      alert('Request rejected');
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  };

  const handleDisconnect = () => {
    client.disconnect();
  };

  const renderApprovalDialog = () => {
    if (!pendingRequest) return null;

    const isMessage = pendingRequest.type === 'sign_message';
    const payload = pendingRequest.payload as any;

    return (
      <Modal visible={true} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {isMessage ? 'Sign Message' : 'Sign Transaction'}
            </Text>

            <View style={styles.detailsContainer}>
              <Text style={styles.label}>Chain:</Text>
              <Text style={styles.value}>
                {pendingRequest.chainType.toUpperCase()} ({pendingRequest.chainId})
              </Text>

              {isMessage ? (
                <>
                  <Text style={styles.label}>Message:</Text>
                  <Text style={styles.value}>{payload.message}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.label}>To:</Text>
                  <Text style={styles.value}>{payload.to}</Text>

                  <Text style={styles.label}>Amount:</Text>
                  <Text style={styles.value}>{payload.value}</Text>

                  <Text style={styles.label}>From:</Text>
                  <Text style={styles.value}>{signer.address}</Text>
                </>
              )}
            </View>

            <View style={styles.buttonRow}>
              <Button title="Reject" onPress={handleReject} color="#ff4444" />
              <Button title="Approve" onPress={handleApprove} color="#44ff44" />
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Phoenix Wallet Example</Text>

      <View style={styles.walletInfo}>
        <Text style={styles.label}>Wallet Address:</Text>
        <Text style={styles.address}>{signer.address}</Text>
        <Text style={styles.label}>Chain: {signer.chainType.toUpperCase()}</Text>
      </View>

      {!connected ? (
        <View style={styles.section}>
          <Text style={styles.subtitle}>Connect to dApp</Text>
          <Button title="Scan QR Code" onPress={handleScanQR} />

          {/* QR Scanner would go here */}
          {scanning && (
            <View style={styles.scanner}>
              <Text>QR Scanner would be here</Text>
              <Text style={styles.hint}>
                In production, use BarCodeScanner or similar
              </Text>
              {/* Example mock connection for testing */}
              <Button
                title="Mock Connection (Dev Only)"
                onPress={() => handleQRScanned('phoenix:{"version":"1","uuid":"test-uuid","serverUrl":"wss://relay.phoenix.io","publicKey":"mock_key"}')}
              />
            </View>
          )}
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.connected}>✅ Connected to dApp</Text>
          <Text style={styles.hint}>Waiting for sign requests...</Text>
          <Button title="Disconnect" onPress={handleDisconnect} color="#ff4444" />
        </View>
      )}

      {renderApprovalDialog()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  walletInfo: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  value: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
  },
  address: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  connected: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#44ff44',
    marginBottom: 10,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginVertical: 10,
  },
  scanner: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#eee',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  detailsContainer: {
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});

export default WalletExample;
