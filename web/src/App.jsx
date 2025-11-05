/**
 * WalletConnect Demo - Web App with E2E Encryption
 *
 * Zero-Trust Architecture:
 * - Generates ephemeral key pair (TweetNaCl Curve25519)
 * - Creates UUID client-side (no backend REST API)
 * - All messages encrypted end-to-end (backend cannot decrypt)
 * - Backend acts as dumb relay for encrypted blobs
 */

import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import './index.css';
import { validateAndBuildTransaction } from './utils/transactionBuilder.js';
import {
  generateKeyPair,
  encryptMessage,
  decryptMessage,
  verifyTimestamp,
  publicKeyToBase64,
  base64ToPublicKey,
  generateUUID
} from './crypto/encryption.js';

// URL of backend relay server
const BACKEND_URL = 'http://localhost:3001';

// Transaction types
const TRANSACTION_TYPES = [
  { value: 'nativeTransfer', label: 'Native Transfer (ETH/BNB)' },
  { value: 'erc20Transfer', label: 'ERC20 Token Transfer' },
  { value: 'erc721Transfer', label: 'ERC721 NFT Transfer' },
  { value: 'tokenApproval', label: 'Token Approval' },
  { value: 'contractCall', label: 'Smart Contract Call' }
];

// Chain IDs
const CHAIN_IDS = [
  { value: '1', label: 'Ethereum Mainnet' },
  { value: '56', label: 'BSC' },
  { value: '137', label: 'Polygon' },
  { value: '5', label: 'Goerli Testnet' },
  { value: '97', label: 'BSC Testnet' }
];

function App() {
  // Connection state
  const [socket, setSocket] = useState(null);
  const [uuid, setUuid] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected | pending | connected
  const [errorMessage, setErrorMessage] = useState('');

  // E2E Encryption state
  const [webKeyPair, setWebKeyPair] = useState(null); // { publicKey, secretKey }
  const [mobilePublicKey, setMobilePublicKey] = useState(null); // Mobile's public key

  // Action state
  const [message, setMessage] = useState('Hello from Web App!');
  const [pendingRequest, setPendingRequest] = useState(null);
  const [response, setResponse] = useState(null);

  // Transaction form state
  const [transactionType, setTransactionType] = useState('nativeTransfer');
  const [transactionForm, setTransactionForm] = useState({
    // Native Transfer
    to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    amount: '0.1',
    value: '',
    // Token Transfer
    tokenAddress: '',
    tokenSymbol: '',
    tokenDecimals: '18',
    recipient: '',
    // ERC721
    tokenId: '',
    from: '',
    // Approval
    spender: '',
    // Contract Call
    contractAddress: '',
    functionName: '',
    data: '',
    // Common
    chainId: '1',
    gasPrice: '',
    gasLimit: '',
    nonce: '',
    maxFeePerGas: '',
    maxPriorityFeePerGas: ''
  });

  /**
   * Connect Wallet - Generate keys, create UUID, display QR
   */
  const handleConnectWallet = () => {
    try {
      setErrorMessage('');
      setResponse(null);

      // 1. Generate ephemeral key pair
      const keyPair = generateKeyPair();
      setWebKeyPair(keyPair);
      console.log("keyPair: ", keyPair);

      // 2. Generate UUID client-side (no backend call)
      const newUuid = generateUUID();
      setUuid(newUuid);

      console.log("newUuid: ", newUuid);

      // 3. Connect to backend relay server
      const newSocket = io(BACKEND_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });

      newSocket.on('connect', () => {
        console.log('✅ Connected to backend relay');

        // Join room with UUID
        newSocket.emit('join-room', { uuid: newUuid });
      });

      newSocket.on('disconnect', () => {
        console.log('❌ Disconnected from backend');
        setConnectionStatus('disconnected');
      });

      newSocket.on('error', (error) => {
        console.error('❌ Socket error:', error);
        setErrorMessage(error.message || 'Connection error');
      });

      // Listen for mobile connection (connected_uuid event)
      newSocket.on('connected_uuid', (data) => {
        console.log('📱 Mobile connected:', data);

        try {
          // Extract mobile's public key
          const mobilePubKey = base64ToPublicKey(data.mobilePublicKey);
          setMobilePublicKey(mobilePubKey);

          console.log("mobilePubKey: ", mobilePubKey);

          // Join room (now that mobile is connected)
          newSocket.emit('join-room', { uuid: newUuid });

          setConnectionStatus('connected');
          setErrorMessage('');
        } catch (error) {
          console.error('❌ Failed to process mobile public key:', error);
          setErrorMessage('Failed to establish secure connection');
        }
      });

      // Note: Socket event handler will be registered in useEffect
      // to ensure it uses the latest handleEncryptedResponse callback

      setSocket(newSocket);
      setConnectionStatus('pending');

      console.log('🔗 Connection initialized with UUID:', newUuid);
    } catch (error) {
      console.error('❌ Failed to initialize connection:', error);
      setErrorMessage('Failed to initialize connection. Please try again.');
    }
  };

  /**
   * Handle encrypted response from mobile
   * Memoized with useCallback to ensure latest key values are used
   */
  const handleEncryptedResponse = useCallback((data) => {
    try {
      const { encryptedPayload, nonce } = data;

      if (!webKeyPair || !mobilePublicKey) {
        console.error('❌ Missing encryption keys', { webKeyPair: !!webKeyPair, mobilePublicKey: !!mobilePublicKey });
        return;
      }

      // Decrypt response
      const decrypted = decryptMessage(
        encryptedPayload,
        nonce,
        mobilePublicKey,
        webKeyPair.secretKey
      );

      console.log('📥 Decrypted response:', decrypted);

      // Verify timestamp (replay protection)
      if (!verifyTimestamp(decrypted.timestamp)) {
        console.error('❌ Response expired');
        setErrorMessage('Response expired - possible replay attack');
        return;
      }

      setPendingRequest(null);
      setResponse(decrypted);
    } catch (error) {
      console.error('❌ Failed to decrypt response:', error);
      setErrorMessage('Failed to decrypt response - invalid signature');
    }
  }, [webKeyPair, mobilePublicKey]);

  /**
   * Register socket event handler for encrypted responses
   * This ensures the handler always uses the latest callback with current key values
   */
  useEffect(() => {
    if (!socket || !handleEncryptedResponse) return;

    // Remove any existing handler to avoid duplicates
    socket.off('web:response');
    
    // Register handler with latest callback
    socket.on('web:response', handleEncryptedResponse);

    // Cleanup on unmount or when dependencies change
    return () => {
      socket.off('web:response', handleEncryptedResponse);
    };
  }, [socket, handleEncryptedResponse]);

  /**
   * Sign Message - Encrypt and send to mobile
   */
  const handleSignMessage = () => {
    if (!socket || connectionStatus !== 'connected') {
      setErrorMessage('Mobile wallet not connected');
      return;
    }

    if (!webKeyPair || !mobilePublicKey) {
      setErrorMessage('Encryption not ready');
      return;
    }

    try {
      const requestId = `sign-${Date.now()}`;

      // Create request payload
      const request = {
        requestId,
        type: 'signMessage',
        message,
        timestamp: Date.now()
      };

      // Encrypt request with mobile's public key
      const { encryptedPayload, nonce } = encryptMessage(
        request,
        mobilePublicKey,
        webKeyPair.secretKey
      );

      setPendingRequest({ type: 'signMessage', requestId });
      setResponse(null);

      // Send encrypted message to backend (backend cannot decrypt)
      socket.emit('web:signMessage', {
        uuid,
        encryptedPayload,
        nonce,
        timestamp: Date.now()
      });

      console.log('✍️  Sent encrypted sign message request:', requestId);
    } catch (error) {
      console.error('❌ Failed to send sign message:', error);
      setErrorMessage('Failed to encrypt and send message');
    }
  };

  /**
   * Update transaction form field
   */
  const updateTransactionForm = (field, value) => {
    setTransactionForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Send Transaction - Encrypt and send to mobile
   */
  const handleSendTransaction = () => {
    if (!socket || connectionStatus !== 'connected') {
      setErrorMessage('Mobile wallet not connected');
      return;
    }

    if (!webKeyPair || !mobilePublicKey) {
      setErrorMessage('Encryption not ready');
      return;
    }

    try {
      // Build and validate transaction
      const transaction = validateAndBuildTransaction(transactionType, transactionForm);

      const requestId = transaction.requestId;

      // Create request payload
      const request = {
        ...transaction,
        type: 'sendTransaction',
        timestamp: Date.now()
      };

      // Encrypt request with mobile's public key
      const { encryptedPayload, nonce } = encryptMessage(
        request,
        mobilePublicKey,
        webKeyPair.secretKey
      );

      setPendingRequest({ type: 'sendTransaction', requestId, transactionType });
      setResponse(null);
      setErrorMessage('');

      // Send encrypted transaction to backend (backend cannot decrypt)
      socket.emit('web:sendTransaction', {
        uuid,
        encryptedPayload,
        nonce,
        timestamp: Date.now()
      });

      console.log('💸 Sent encrypted transaction request:', requestId);
    } catch (error) {
      console.error('❌ Transaction error:', error);
      setErrorMessage(error.message || 'Failed to send transaction');
    }
  };

  /**
   * Reset connection - create new session
   */
  const handleReset = () => {
    if (socket) {
      socket.close();
    }

    setSocket(null);
    setUuid(null);
    setWebKeyPair(null);
    setMobilePublicKey(null);
    setConnectionStatus('disconnected');
    setErrorMessage('');
    setResponse(null);
    setPendingRequest(null);
    setTransactionType('nativeTransfer');
    setTransactionForm({
      to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      amount: '0.1',
      value: '',
      tokenAddress: '',
      tokenSymbol: '',
      tokenDecimals: '18',
      recipient: '',
      tokenId: '',
      from: '',
      spender: '',
      contractAddress: '',
      functionName: '',
      data: '',
      chainId: '1',
      gasPrice: '',
      gasLimit: '',
      nonce: '',
      maxFeePerGas: '',
      maxPriorityFeePerGas: ''
    });
  };

  /**
   * Render status message
   */
  const renderStatus = () => {
    if (errorMessage) {
      return <div className="status error">❌ {errorMessage}</div>;
    }

    switch (connectionStatus) {
      case 'pending':
        return (
          <div className="status pending">
            ⏳ Waiting for mobile wallet to scan QR code...
          </div>
        );
      case 'connected':
        return (
          <div className="status connected">
            ✅ Mobile wallet connected! 🔒 End-to-end encrypted
          </div>
        );
      default:
        return null;
    }
  };

  /**
   * Render QR code section
   */
  const renderQRCode = () => {
    if (!uuid || connectionStatus === 'connected' || !webKeyPair) return null;

    // QR code contains: uuid, serverUrl, webPublicKey (for E2E encryption)
    const qrData = JSON.stringify({
      uuid,
      serverUrl: BACKEND_URL,
      webPublicKey: publicKeyToBase64(webKeyPair.publicKey)
    });

    console.log("qrData: ", qrData);

    return (
      <div className="qr-section">
        <h3>📱 Scan with Mobile Wallet</h3>
        <div className="qr-code">
          <QRCodeSVG value={qrData} size={200} level="H" />
        </div>
        <p style={{ marginTop: '15px', color: '#666', fontSize: '14px' }}>
          Session UUID: <code>{uuid.slice(0, 8)}...</code>
        </p>
        <p style={{ marginTop: '5px', color: '#28a745', fontSize: '12px' }}>
          🔒 End-to-end encrypted with TweetNaCl (Curve25519)
        </p>
      </div>
    );
  };

  /**
   * Render transaction type selector
   */
  const renderTransactionTypeSelector = () => {
    return (
      <div className="input-group">
        <label>Transaction Type:</label>
        <select
          value={transactionType}
          onChange={(e) => setTransactionType(e.target.value)}
          className="select-input"
        >
          {TRANSACTION_TYPES.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>
    );
  };

  /**
   * Render dynamic form fields based on transaction type
   */
  const renderTransactionForm = () => {
    const fields = [];

    // Common: Chain ID
    fields.push(
      <div key="chainId" className="input-group">
        <label>Chain ID:</label>
        <select
          value={transactionForm.chainId}
          onChange={(e) => updateTransactionForm('chainId', e.target.value)}
          className="select-input"
        >
          {CHAIN_IDS.map(chain => (
            <option key={chain.value} value={chain.value}>
              {chain.label}
            </option>
          ))}
        </select>
      </div>
    );

    // Native Transfer
    if (transactionType === 'nativeTransfer') {
      fields.push(
        <div key="to" className="input-group">
          <label>Recipient Address:</label>
          <input
            type="text"
            value={transactionForm.to}
            onChange={(e) => updateTransactionForm('to', e.target.value)}
            placeholder="0x..."
          />
        </div>,
        <div key="amount" className="input-group">
          <label>Amount (ETH):</label>
          <input
            type="text"
            value={transactionForm.amount}
            onChange={(e) => updateTransactionForm('amount', e.target.value)}
            placeholder="0.1"
          />
        </div>
      );
    }

    // ERC20 Transfer
    if (transactionType === 'erc20Transfer') {
      fields.push(
        <div key="tokenAddress" className="input-group">
          <label>Token Address:</label>
          <input
            type="text"
            value={transactionForm.tokenAddress}
            onChange={(e) => updateTransactionForm('tokenAddress', e.target.value)}
            placeholder="0x..."
          />
        </div>,
        <div key="tokenSymbol" className="input-group">
          <label>Token Symbol (optional):</label>
          <input
            type="text"
            value={transactionForm.tokenSymbol}
            onChange={(e) => updateTransactionForm('tokenSymbol', e.target.value)}
            placeholder="USDT"
          />
        </div>,
        <div key="recipient" className="input-group">
          <label>Recipient Address:</label>
          <input
            type="text"
            value={transactionForm.recipient}
            onChange={(e) => updateTransactionForm('recipient', e.target.value)}
            placeholder="0x..."
          />
        </div>,
        <div key="amount" className="input-group">
          <label>Token Amount:</label>
          <input
            type="text"
            value={transactionForm.amount}
            onChange={(e) => updateTransactionForm('amount', e.target.value)}
            placeholder="1000000000000000000"
          />
          <small style={{ color: '#666', fontSize: '12px' }}>Amount in smallest unit (e.g., Wei for 18 decimals)</small>
        </div>
      );
    }

    // ERC721 Transfer
    if (transactionType === 'erc721Transfer') {
      fields.push(
        <div key="tokenAddress" className="input-group">
          <label>Token Contract Address:</label>
          <input
            type="text"
            value={transactionForm.tokenAddress}
            onChange={(e) => updateTransactionForm('tokenAddress', e.target.value)}
            placeholder="0x..."
          />
        </div>,
        <div key="from" className="input-group">
          <label>From Address (optional):</label>
          <input
            type="text"
            value={transactionForm.from}
            onChange={(e) => updateTransactionForm('from', e.target.value)}
            placeholder="0x... (defaults to wallet)"
          />
        </div>,
        <div key="recipient" className="input-group">
          <label>Recipient Address:</label>
          <input
            type="text"
            value={transactionForm.recipient}
            onChange={(e) => updateTransactionForm('recipient', e.target.value)}
            placeholder="0x..."
          />
        </div>,
        <div key="tokenId" className="input-group">
          <label>Token ID:</label>
          <input
            type="text"
            value={transactionForm.tokenId}
            onChange={(e) => updateTransactionForm('tokenId', e.target.value)}
            placeholder="123"
          />
        </div>
      );
    }

    // Token Approval
    if (transactionType === 'tokenApproval') {
      fields.push(
        <div key="tokenAddress" className="input-group">
          <label>Token Address:</label>
          <input
            type="text"
            value={transactionForm.tokenAddress}
            onChange={(e) => updateTransactionForm('tokenAddress', e.target.value)}
            placeholder="0x..."
          />
        </div>,
        <div key="tokenSymbol" className="input-group">
          <label>Token Symbol (optional):</label>
          <input
            type="text"
            value={transactionForm.tokenSymbol}
            onChange={(e) => updateTransactionForm('tokenSymbol', e.target.value)}
            placeholder="USDT"
          />
        </div>,
        <div key="spender" className="input-group">
          <label>Spender Address:</label>
          <input
            type="text"
            value={transactionForm.spender}
            onChange={(e) => updateTransactionForm('spender', e.target.value)}
            placeholder="0x..."
          />
        </div>,
        <div key="amount" className="input-group">
          <label>Approval Amount:</label>
          <input
            type="text"
            value={transactionForm.amount}
            onChange={(e) => updateTransactionForm('amount', e.target.value)}
            placeholder="0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff (unlimited)"
          />
          <small style={{ color: '#666', fontSize: '12px' }}>Leave empty or use max value for unlimited approval</small>
        </div>
      );
    }

    // Contract Call
    if (transactionType === 'contractCall') {
      fields.push(
        <div key="contractAddress" className="input-group">
          <label>Contract Address:</label>
          <input
            type="text"
            value={transactionForm.contractAddress}
            onChange={(e) => updateTransactionForm('contractAddress', e.target.value)}
            placeholder="0x..."
          />
        </div>,
        <div key="functionName" className="input-group">
          <label>Function Name (optional, for display):</label>
          <input
            type="text"
            value={transactionForm.functionName}
            onChange={(e) => updateTransactionForm('functionName', e.target.value)}
            placeholder="deposit, withdraw, etc."
          />
        </div>,
        <div key="data" className="input-group">
          <label>Call Data (hex):</label>
          <textarea
            value={transactionForm.data}
            onChange={(e) => updateTransactionForm('data', e.target.value)}
            placeholder="0x..."
            rows={3}
          />
        </div>,
        <div key="value" className="input-group">
          <label>Value (Wei, optional):</label>
          <input
            type="text"
            value={transactionForm.value}
            onChange={(e) => updateTransactionForm('value', e.target.value)}
            placeholder="0"
          />
        </div>
      );
    }

    // Common optional fields
    fields.push(
      <div key="gasPrice" className="input-group">
        <label>Gas Price (Gwei, optional):</label>
        <input
          type="text"
          value={transactionForm.gasPrice}
          onChange={(e) => updateTransactionForm('gasPrice', e.target.value)}
          placeholder="20"
        />
      </div>,
      <div key="gasLimit" className="input-group">
        <label>Gas Limit (optional):</label>
        <input
          type="text"
          value={transactionForm.gasLimit}
          onChange={(e) => updateTransactionForm('gasLimit', e.target.value)}
          placeholder="21000"
        />
      </div>,
      <div key="nonce" className="input-group">
        <label>Nonce (optional):</label>
        <input
          type="number"
          value={transactionForm.nonce}
          onChange={(e) => updateTransactionForm('nonce', e.target.value)}
          placeholder="Auto"
        />
      </div>
    );

    return fields;
  };

  /**
   * Render action buttons
   */
  const renderActions = () => {
    if (connectionStatus !== 'connected') return null;

    return (
      <div className="actions">
        <div className="input-group">
          <label>Message to Sign:</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter message to sign"
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={handleSignMessage}
          disabled={!!pendingRequest}
        >
          {pendingRequest?.type === 'signMessage' ? (
            <>
              <span className="loading"></span>
              Waiting for approval...
            </>
          ) : (
            '✍️ Sign Message'
          )}
        </button>

        <div style={{ marginTop: '30px', paddingTop: '30px', borderTop: '2px solid #e0e0e0' }}>
          <h3 style={{ marginBottom: '20px', color: '#333' }}>💸 Send Transaction</h3>

          {renderTransactionTypeSelector()}
          {renderTransactionForm()}

          <button
            className="btn btn-primary"
            onClick={handleSendTransaction}
            disabled={!!pendingRequest}
            style={{ marginTop: '20px' }}
          >
            {pendingRequest?.type === 'sendTransaction' ? (
              <>
                <span className="loading"></span>
                Waiting for approval...
              </>
            ) : (
              '💸 Send Transaction'
            )}
          </button>
        </div>
      </div>
    );
  };

  /**
   * Render response from mobile app
   */
  const renderResponse = () => {
    if (!response) return null;

    return (
      <div className="response">
        <h4>
          {response.approved ? '✅ Request Approved' : '❌ Request Rejected'}
        </h4>
        <pre>{JSON.stringify(response, null, 2)}</pre>
      </div>
    );
  };

  return (
    <div className="app">
      <div className="container">
        <div className="header">
          <h1>🔗 WalletConnect Demo</h1>
          <p>Web Application (E2E Encrypted)</p>
        </div>

        {renderStatus()}

        {!uuid ? (
          <button className="btn btn-primary" onClick={handleConnectWallet}>
            🔗 Connect Wallet
          </button>
        ) : (
          <>
            {renderQRCode()}
            {renderActions()}
            {renderResponse()}
            <button
              className="btn btn-secondary"
              onClick={handleReset}
              style={{ marginTop: '20px' }}
            >
              🔄 New Connection
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
