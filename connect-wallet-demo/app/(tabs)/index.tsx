/**
 * WalletConnect Demo - Main Wallet Screen (E2E Encrypted)
 *
 * Chức năng chính:
 * - Scan QR code từ web app để lấy UUID và webPublicKey
 * - Generate ephemeral key pair for E2E encryption
 * - Kết nối với backend qua Socket.io (stateless relay)
 * - Nhận encrypted requests từ web, decrypt với TweetNaCl
 * - Hiển thị popup để user approve/reject
 * - Encrypt responses và gửi về web qua backend relay
 *
 * Security: Zero-trust architecture - backend cannot read messages
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { io, Socket } from 'socket.io-client';
import * as Crypto from 'expo-crypto';

// E2E Encryption utilities
import {
  generateKeyPair,
  encryptMessage,
  decryptMessage,
  verifyTimestamp,
  publicKeyToBase64,
  base64ToPublicKey,
  type KeyPair
} from '../../crypto/encryption';

export default function WalletConnectScreen() {
  // State quản lý QR scanner
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);

  // State quản lý kết nối
  const [socket, setSocket] = useState<Socket | null>(null);
  const [uuid, setUuid] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  // E2E Encryption state
  const [mobileKeyPair, setMobileKeyPair] = useState<KeyPair | null>(null);
  const [webPublicKey, setWebPublicKey] = useState<Uint8Array | null>(null);

  // State quản lý request từ web app
  const [pendingRequest, setPendingRequest] = useState<any>(null);

  // Mock wallet data (trong production sẽ dùng thật)
  const [walletAddress] = useState('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0');
  const [balance] = useState('1.5 ETH');

  /**
   * Effect: Đăng ký socket event listeners với E2E encryption
   */
  useEffect(() => {
    if (!socket) return;

    // Nhận encrypted sign message request từ web
    socket.on('mobile:signRequest', (data: any) => {
      console.log('✍️  Received encrypted sign request');

      if (!mobileKeyPair || !webPublicKey) {
        console.error('❌ Encryption keys not initialized');
        Alert.alert('Error', 'Encryption not initialized');
        return;
      }

      try {
        // Decrypt request
        const decryptedRequest = decryptMessage(
          data.encryptedPayload,
          data.nonce,
          webPublicKey,
          mobileKeyPair.secretKey
        );

        console.log('✅ Decrypted sign request:', decryptedRequest);

        // Verify timestamp for replay protection
        if (!verifyTimestamp(decryptedRequest.timestamp)) {
          Alert.alert('Security Error', 'Request expired - possible replay attack');
          return;
        }

        setPendingRequest(decryptedRequest);
      } catch (error) {
        console.error('❌ Failed to decrypt sign request:', error);
        Alert.alert('Error', 'Failed to decrypt request');
      }
    });

    // Nhận encrypted transaction request từ web
    socket.on('mobile:transactionRequest', (data: any) => {
      console.log('💸 Received encrypted transaction request');

      if (!mobileKeyPair || !webPublicKey) {
        console.error('❌ Encryption keys not initialized');
        Alert.alert('Error', 'Encryption not initialized');
        return;
      }

      try {
        // Decrypt request
        const decryptedRequest = decryptMessage(
          data.encryptedPayload,
          data.nonce,
          webPublicKey,
          mobileKeyPair.secretKey
        );

        console.log('✅ Decrypted transaction request:', decryptedRequest);

        // Verify timestamp for replay protection
        if (!verifyTimestamp(decryptedRequest.timestamp)) {
          Alert.alert('Security Error', 'Request expired - possible replay attack');
          return;
        }

        setPendingRequest(decryptedRequest);
      } catch (error) {
        console.error('❌ Failed to decrypt transaction request:', error);
        Alert.alert('Error', 'Failed to decrypt request');
      }
    });

    // Xử lý lỗi
    socket.on('error', (error: any) => {
      console.error('❌ Socket error:', error);
      Alert.alert('Error', error.message || 'Connection error');
    });

    // Xử lý disconnect
    socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      setConnected(false);
    });

    // Cleanup
    return () => {
      socket.off('mobile:signRequest');
      socket.off('mobile:transactionRequest');
      socket.off('error');
      socket.off('disconnect');
    };
  }, [socket, mobileKeyPair, webPublicKey]);

  /**
   * Xử lý kết quả scan QR code với E2E encryption
   */
  const handleBarCodeScanned = async (result: any) => {
    setScanning(false);

    try {
      // Parse QR data - format: { uuid, serverUrl, webPublicKey }
      const qrData = JSON.parse(result.data);
      const { uuid: scannedUuid, serverUrl: scannedServerUrl, webPublicKey: webPubKeyBase64 } = qrData;

      if (!scannedUuid || !scannedServerUrl || !webPubKeyBase64) {
        Alert.alert('Error', 'Invalid QR code format - missing uuid, serverUrl, or webPublicKey');
        return;
      }

      console.log('📱 Scanned QR code:', { uuid: scannedUuid, serverUrl: scannedServerUrl });

      // 1. Parse web's public key from QR code
      const webPubKey = base64ToPublicKey(webPubKeyBase64);
      setWebPublicKey(webPubKey);

      // 2. Generate mobile's ephemeral key pair for E2E encryption
      const keyPair = generateKeyPair();
      setMobileKeyPair(keyPair);

      console.log('🔐 Generated mobile key pair');
      console.log('🔐 Parsed web public key from QR');

      // 3. Kết nối đến backend
      connectToBackend(scannedUuid, scannedServerUrl, keyPair);
    } catch (error) {
      console.error('❌ Failed to process QR code:', error);
      Alert.alert('Error', 'Failed to process QR code');
    }
  };

  const FakeScan = async () => {
    setScanning(false); 

    try {
      // Parse QR data - format: { uuid, serverUrl, webPublicKey }
      const qrData =   {"uuid":"c2ec77bb-cf7a-44f1-a4a5-670429472d22","serverUrl":"http://localhost:3001","webPublicKey":"F5bYqgTh+OmbNU/DqDrmdOLtfG3p6mShXP2Xz5pyyxU="}
      const { uuid: scannedUuid, serverUrl: scannedServerUrl, webPublicKey: webPubKeyBase64 } = qrData

      if (!scannedUuid || !scannedServerUrl || !webPubKeyBase64) {
        Alert.alert('Error', 'Invalid QR code format - missing uuid, serverUrl, or webPublicKey');
        return;
      }

      console.log('📱 Scanned QR code:', { uuid: scannedUuid, serverUrl: scannedServerUrl });

      // 1. Parse web's public key from QR code
      const webPubKey = base64ToPublicKey(webPubKeyBase64);
      setWebPublicKey(webPubKey);

      // 2. Generate mobile's ephemeral key pair for E2E encryption
      const keyPair = generateKeyPair();
      setMobileKeyPair(keyPair);

      console.log('🔐 Generated mobile key pair');
      console.log('🔐 Parsed web public key from QR');

      // 3. Kết nối đến backend
      connectToBackend(scannedUuid, scannedServerUrl, keyPair);
    } catch (error) {
      console.error('❌ Failed to process QR code:', error);
      Alert.alert('Error', 'Failed to process QR code');
    }
  };

  /**
   * Kết nối đến backend server và broadcast mobilePublicKey
   * Zero-trust E2E encryption pattern
   */
  const connectToBackend = (scannedUuid: string, scannedServerUrl: string, keyPair: KeyPair) => {
    console.log('🔗 UUID:', scannedUuid);
    console.log('🔗 Connecting to backend:', scannedServerUrl);

    // Tạo socket connection
    const newSocket = io(scannedServerUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to backend relay server');

      // Join room by UUID
      newSocket.emit('join-room', { uuid: scannedUuid });

      // Broadcast mobile's public key to room (web will receive this)
      const mobilePublicKeyBase64 = publicKeyToBase64(keyPair.publicKey);
      newSocket.emit('connected_uuid', {
        uuid: scannedUuid,
        mobilePublicKey: mobilePublicKeyBase64
      });

      console.log('📡 Broadcasted mobile public key to room');

      // Mark as connected
      setConnected(true);
      Alert.alert('Success', 'Connected to Web App with E2E encryption!');
    });

    setSocket(newSocket);
    setUuid(scannedUuid);
  };

  /**
   * Format amount for display
   */
  const formatAmount = (amount: string, decimals?: number): string => {
    if (!amount || amount === '0') return '0';
    if (decimals) {
      const divisor = BigInt(10 ** decimals);
      const amountBigInt = BigInt(amount);
      const whole = amountBigInt / divisor;
      const fraction = amountBigInt % divisor;
      return `${whole}.${fraction.toString().padStart(decimals, '0')}`;
    }
    return amount;
  };

  /**
   * Format Wei to ETH
   */
  const formatWeiToEth = (wei: string): string => {
    try {
      const weiBigInt = BigInt(wei);
      const eth = Number(weiBigInt) / 1e18;
      return eth.toFixed(6);
    } catch {
      return wei;
    }
  };

  /**
   * Truncate address for display
   */
  const truncateAddress = (address: string): string => {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  /**
   * Xử lý approve request với E2E encryption
   */
  const handleApprove = async () => {
    if (!pendingRequest || !socket || !mobileKeyPair || !webPublicKey || !uuid) return;

    const { requestId, type, transactionType } = pendingRequest;
    let result: any = {};

    try {
      if (type === 'signMessage') {
        // Mock: Ký message (trong production dùng private key thật)
        const { message } = pendingRequest;
        const signature = await mockSignMessage(message);
        result = { signature, message };
      } else if (type === 'sendTransaction' || transactionType) {
        // Handle all transaction types
        const txType = transactionType || 'nativeTransfer';

        // Generate mock transaction hash
        const txHash = await mockSendTransaction(
          pendingRequest.to || pendingRequest.contractAddress || '',
          pendingRequest.amount || pendingRequest.value || '0'
        );

        // Include all transaction fields in result
        result = {
          txHash,
          transactionType: txType,
          ...pendingRequest,
          from: walletAddress
        };
      }

      // Create response object
      const response = {
        requestId,
        type: type || 'sendTransaction',
        approved: true,
        result,
        timestamp: Date.now()
      };

      // Encrypt response before sending
      const { encryptedPayload, nonce } = encryptMessage(
        response,
        webPublicKey,
        mobileKeyPair.secretKey
      );

      // Send encrypted response to backend (backend will relay to web)
      socket.emit('mobile:response', {
        uuid,
        encryptedPayload,
        nonce,
        timestamp: Date.now()
      });

      console.log('✅ Sent encrypted approval response');
      Alert.alert('Success', `${type || transactionType || 'Transaction'} approved successfully!`);
      setPendingRequest(null);
    } catch (error) {
      console.error('❌ Failed to process request:', error);
      Alert.alert('Error', 'Failed to process request');
    }
  };

  /**
   * Xử lý reject request với E2E encryption
   */
  const handleReject = () => {
    if (!pendingRequest || !socket || !mobileKeyPair || !webPublicKey || !uuid) return;

    const { requestId, type } = pendingRequest;

    try {
      // Create rejection response
      const response = {
        requestId,
        type,
        approved: false,
        result: { reason: 'User rejected' },
        timestamp: Date.now()
      };

      // Encrypt response before sending
      const { encryptedPayload, nonce } = encryptMessage(
        response,
        webPublicKey,
        mobileKeyPair.secretKey
      );

      // Send encrypted rejection to backend (backend will relay to web)
      socket.emit('mobile:response', {
        uuid,
        encryptedPayload,
        nonce,
        timestamp: Date.now()
      });

      console.log('✅ Sent encrypted rejection response');
      Alert.alert('Rejected', `${type} rejected`);
      setPendingRequest(null);
    } catch (error) {
      console.error('❌ Failed to send rejection:', error);
      Alert.alert('Error', 'Failed to send rejection');
    }
  };


  /**
   * Mock: Ký message bằng crypto (giả lập)
   */
  const mockSignMessage = async (message: string) => {
    // Trong production: sử dụng private key thật để ký
    // Ở đây chỉ mock bằng hash
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${message}-${walletAddress}-${Date.now()}`
    );
    return `0x${hash}`;
  };

  /**
   * Mock: Gửi transaction (giả lập)
   */
  const mockSendTransaction = async (to: string, amount: string) => {
    // Trong production: gửi transaction thật lên blockchain
    // Ở đây chỉ mock transaction hash
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${to}-${amount}-${walletAddress}-${Date.now()}`
    );
    return `0x${hash}`;
  };

  /**
   * Disconnect khỏi session
   */
  const handleDisconnect = () => {
    if (socket) {
      socket.close();
      setSocket(null);
    }
    setUuid(null);
    setConnected(false);
    setPendingRequest(null);
    setMobileKeyPair(null);
    setWebPublicKey(null);
  };

  /**
   * Render transaction type badge
   */
  const renderTransactionTypeBadge = (txType: string) => {
    const badges: { [key: string]: { icon: string; color: string; label: string } } = {
      nativeTransfer: { icon: '💸', color: '#667eea', label: 'Native Transfer' },
      erc20Transfer: { icon: '🪙', color: '#28a745', label: 'ERC20 Transfer' },
      erc721Transfer: { icon: '🖼️', color: '#ffc107', label: 'NFT Transfer' },
      tokenApproval: { icon: '✅', color: '#17a2b8', label: 'Token Approval' },
      contractCall: { icon: '⚙️', color: '#dc3545', label: 'Contract Call' }
    };

    const badge = badges[txType] || { icon: '💸', color: '#667eea', label: 'Transaction' };
    
    return (
      <View style={[styles.typeBadge, { backgroundColor: badge.color + '20' }]}>
        <Text style={[styles.typeBadgeText, { color: badge.color }]}>
          {badge.icon} {badge.label}
        </Text>
      </View>
    );
  };

  /**
   * Render transaction details based on type
   */
  const renderTransactionDetails = () => {
    const { type, transactionType, message } = pendingRequest;

    if (type === 'signMessage') {
      return (
        <>
          <Text style={styles.label}>Message:</Text>
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        </>
      );
    }

    const txType = transactionType || 'nativeTransfer';

    switch (txType) {
      case 'nativeTransfer':
        return (
          <>
            {renderTransactionTypeBadge(txType)}
            <View style={styles.txDetail}>
              <Text style={styles.label}>From:</Text>
              <Text style={styles.value}>{truncateAddress(walletAddress)}</Text>
            </View>
            <View style={styles.txDetail}>
              <Text style={styles.label}>To:</Text>
              <Text style={styles.value}>{truncateAddress(pendingRequest.to)}</Text>
            </View>
            <View style={styles.txDetail}>
              <Text style={styles.label}>Amount:</Text>
              <Text style={styles.value}>{formatWeiToEth(pendingRequest.value || '0')} ETH</Text>
            </View>
            {pendingRequest.chainId && (
              <View style={styles.txDetail}>
                <Text style={styles.label}>Chain ID:</Text>
                <Text style={styles.value}>{pendingRequest.chainId}</Text>
              </View>
            )}
          </>
        );

      case 'erc20Transfer':
        return (
          <>
            {renderTransactionTypeBadge(txType)}
            <View style={styles.txDetail}>
              <Text style={styles.label}>Token:</Text>
              <Text style={styles.value}>
                {pendingRequest.tokenSymbol || truncateAddress(pendingRequest.tokenAddress || '')}
              </Text>
            </View>
            <View style={styles.txDetail}>
              <Text style={styles.label}>From:</Text>
              <Text style={styles.value}>{truncateAddress(walletAddress)}</Text>
            </View>
            <View style={styles.txDetail}>
              <Text style={styles.label}>To:</Text>
              <Text style={styles.value}>{truncateAddress(pendingRequest.recipient || '')}</Text>
            </View>
            <View style={styles.txDetail}>
              <Text style={styles.label}>Amount:</Text>
              <Text style={styles.value}>
                {formatAmount(pendingRequest.amount || '0', pendingRequest.tokenDecimals || 18)}
                {' '}
                {pendingRequest.tokenSymbol || 'tokens'}
              </Text>
            </View>
            {pendingRequest.chainId && (
              <View style={styles.txDetail}>
                <Text style={styles.label}>Chain ID:</Text>
                <Text style={styles.value}>{pendingRequest.chainId}</Text>
              </View>
            )}
          </>
        );

      case 'erc721Transfer':
        return (
          <>
            {renderTransactionTypeBadge(txType)}
            <View style={styles.txDetail}>
              <Text style={styles.label}>NFT Contract:</Text>
              <Text style={styles.value}>{truncateAddress(pendingRequest.tokenAddress || '')}</Text>
            </View>
            <View style={styles.txDetail}>
              <Text style={styles.label}>Token ID:</Text>
              <Text style={styles.value}>{pendingRequest.tokenId}</Text>
            </View>
            <View style={styles.txDetail}>
              <Text style={styles.label}>From:</Text>
              <Text style={styles.value}>
                {truncateAddress(pendingRequest.from || walletAddress)}
              </Text>
            </View>
            <View style={styles.txDetail}>
              <Text style={styles.label}>To:</Text>
              <Text style={styles.value}>{truncateAddress(pendingRequest.recipient || '')}</Text>
            </View>
            {pendingRequest.chainId && (
              <View style={styles.txDetail}>
                <Text style={styles.label}>Chain ID:</Text>
                <Text style={styles.value}>{pendingRequest.chainId}</Text>
              </View>
            )}
          </>
        );

      case 'tokenApproval':
        const approvalAmount = pendingRequest.amount;
        const isUnlimited = approvalAmount && (
          approvalAmount === '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' ||
          BigInt(approvalAmount) === BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
        );
        
        return (
          <>
            {renderTransactionTypeBadge(txType)}
            <View style={styles.txDetail}>
              <Text style={styles.label}>Token:</Text>
              <Text style={styles.value}>
                {pendingRequest.tokenSymbol || truncateAddress(pendingRequest.tokenAddress || '')}
              </Text>
            </View>
            <View style={styles.txDetail}>
              <Text style={styles.label}>Spender:</Text>
              <Text style={styles.value}>{truncateAddress(pendingRequest.spender || '')}</Text>
            </View>
            <View style={styles.txDetail}>
              <Text style={styles.label}>Amount:</Text>
              <Text style={[styles.value, isUnlimited && styles.unlimitedText]}>
                {isUnlimited 
                  ? 'Unlimited' 
                  : formatAmount(approvalAmount || '0', pendingRequest.tokenDecimals || 18)
                }
                {' '}
                {!isUnlimited && (pendingRequest.tokenSymbol || 'tokens')}
              </Text>
            </View>
            {pendingRequest.chainId && (
              <View style={styles.txDetail}>
                <Text style={styles.label}>Chain ID:</Text>
                <Text style={styles.value}>{pendingRequest.chainId}</Text>
              </View>
            )}
          </>
        );

      case 'contractCall':
        const dataPreview = pendingRequest.data 
          ? `${pendingRequest.data.slice(0, 10)}...${pendingRequest.data.slice(-8)}`
          : 'N/A';
        
        return (
          <>
            {renderTransactionTypeBadge(txType)}
            {pendingRequest.functionName && (
              <View style={styles.txDetail}>
                <Text style={styles.label}>Function:</Text>
                <Text style={styles.value}>{pendingRequest.functionName}</Text>
              </View>
            )}
            <View style={styles.txDetail}>
              <Text style={styles.label}>Contract:</Text>
              <Text style={styles.value}>{truncateAddress(pendingRequest.contractAddress || '')}</Text>
            </View>
            <View style={styles.txDetail}>
              <Text style={styles.label}>Call Data:</Text>
              <Text style={[styles.value, styles.monoText]}>{dataPreview}</Text>
            </View>
            {pendingRequest.value && pendingRequest.value !== '0' && (
              <View style={styles.txDetail}>
                <Text style={styles.label}>Value:</Text>
                <Text style={styles.value}>{formatWeiToEth(pendingRequest.value)} ETH</Text>
              </View>
            )}
            {pendingRequest.chainId && (
              <View style={styles.txDetail}>
                <Text style={styles.label}>Chain ID:</Text>
                <Text style={styles.value}>{pendingRequest.chainId}</Text>
              </View>
            )}
          </>
        );

      default:
        return (
          <>
            <Text style={styles.label}>Transaction Type:</Text>
            <Text style={styles.value}>{txType}</Text>
            <Text style={styles.label}>Details:</Text>
            <Text style={styles.value}>{JSON.stringify(pendingRequest, null, 2)}</Text>
          </>
        );
    }
  };

  /**
   * Render permission modal (deprecated - signature now generated before join)
   * Keeping for backward compatibility if needed
   * 
   * NOTE: Following WalletConnect v2.0 pattern, permission signature is now
   * generated automatically after QR scan, before emitting mobile:join.
   * No permission modal needed anymore.
   */
  const renderPermissionModal = () => {
    // Permission signature is now generated automatically after QR scan
    // No need for permission modal anymore (following WalletConnect v2.0 pattern)
    return null;
  };

  /**
   * Render approval modal
   */
  const renderApprovalModal = () => {
    if (!pendingRequest) return null;

    const { type, transactionType } = pendingRequest;
    const txType = transactionType || (type === 'sendTransaction' ? 'nativeTransfer' : null);

    return (
      <Modal
        visible={true}
        transparent={true}
        animationType="slide"
        onRequestClose={handleReject}
      >
        <View style={styles.modalOverlay}>
          <ScrollView 
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalScrollContent}
          >
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>
                {type === 'signMessage' ? '✍️ Sign Message' : '💸 Transaction Request'}
              </Text>

              <View style={styles.modalContent}>
                {renderTransactionDetails()}
                
                {/* Gas Info */}
                {(pendingRequest.gasPrice || pendingRequest.gasLimit) && (
                  <>
                    <View style={styles.separator} />
                    <Text style={styles.sectionTitle}>Gas Settings</Text>
                    {pendingRequest.gasPrice && (
                      <View style={styles.txDetail}>
                        <Text style={styles.label}>Gas Price:</Text>
                        <Text style={styles.value}>{pendingRequest.gasPrice} Gwei</Text>
                      </View>
                    )}
                    {pendingRequest.gasLimit && (
                      <View style={styles.txDetail}>
                        <Text style={styles.label}>Gas Limit:</Text>
                        <Text style={styles.value}>{pendingRequest.gasLimit}</Text>
                      </View>
                    )}
                  </>
                )}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnReject]}
                  onPress={handleReject}
                >
                  <Text style={styles.btnText}>❌ Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnApprove]}
                  onPress={handleApprove}
                >
                  <Text style={styles.btnText}>✅ Approve</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  /**
   * Render QR scanner
   */
  if (scanning) {
    return (
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />
        <View style={styles.scannerOverlay}>
          <Text style={styles.scannerText}>Scan QR Code from Web App</Text>
          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary]}
            onPress={() => setScanning(false)}
          >
            <Text style={styles.btnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /**
   * Main UI
   */
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>🔗 WalletConnect Demo</Text>
          <Text style={styles.subtitle}>Mobile Wallet</Text>
        </View>

        {/* Wallet Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💼 Wallet Info</Text>
          <View style={styles.walletInfo}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.address}>{walletAddress}</Text>
          </View>
          <View style={styles.walletInfo}>
            <Text style={styles.label}>Balance:</Text>
            <Text style={styles.balance}>{balance}</Text>
          </View>
        </View>

        {/* Connection Status */}
        {connected ? (
          <View style={[styles.card, styles.connectedCard]}>
            <Text style={styles.cardTitle}>✅ Connected (E2E Encrypted)</Text>
            <Text style={styles.connectedText}>
              Room: {uuid?.slice(0, 8)}...
            </Text>
            <Text style={[styles.connectedText, { fontSize: 12, marginTop: 5 }]}>
              🔐 Zero-trust encryption active
            </Text>
            <TouchableOpacity
              style={[styles.btn, styles.btnDanger]}
              onPress={handleDisconnect}
            >
              <Text style={styles.btnText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📱 Connection</Text>
            <Text style={styles.instruction}>
              Scan QR code from web app to connect
            </Text>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={FakeScan}
            >
              <Text style={styles.btnText}>📸 Scan QR Code</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Permission Modal */}
      {renderPermissionModal()}
      
      {/* Approval Modal */}
      {renderApprovalModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#f0f0f0',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  connectedCard: {
    backgroundColor: '#d4edda',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  walletInfo: {
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  address: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
  },
  balance: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
  },
  connectedText: {
    fontSize: 14,
    color: '#155724',
    marginBottom: 15,
    fontFamily: 'monospace',
  },
  instruction: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  btn: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: '#667eea',
  },
  btnSecondary: {
    backgroundColor: '#6c757d',
    marginTop: 20,
  },
  btnDanger: {
    backgroundColor: '#dc3545',
  },
  btnApprove: {
    backgroundColor: '#28a745',
    flex: 1,
    marginLeft: 10,
  },
  btnReject: {
    backgroundColor: '#dc3545',
    flex: 1,
    marginRight: 10,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scannerText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  modalContent: {
    marginBottom: 25,
  },
  messageBox: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  messageText: {
    fontSize: 14,
    color: '#333',
  },
  txDetail: {
    marginBottom: 15,
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
    marginTop: 5,
  },
  modalActions: {
    flexDirection: 'row',
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  typeBadge: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 15,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  unlimitedText: {
    color: '#dc3545',
    fontWeight: '600',
  },
  monoText: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
});
