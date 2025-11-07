/**
 * WalletConnect Demo - Web App using Phoenix DAPP SDK
 *
 * Refactored to use @vincenttaylorlab3/phoenix-dapp SDK (published on npm)
 * All encryption, connection management handled by SDK
 */

import { useState, useEffect } from 'react';
// import { PhoenixDappClient } from '@phoenix-demo/dapp';
import { PhoenixDappClient } from '@vincenttaylorlab3/phoenix-dapp';
import { QRCodeSVG } from 'qrcode.react';
import './index.css';

// URL of backend relay server
const BACKEND_URL = 'http://localhost:3001';

// Initialize Phoenix SDK client (do this once)
// Session persistence is enabled by default
const phoenixClient = new PhoenixDappClient({
  serverUrl: BACKEND_URL,
  reconnect: true,
  enablePersistence: true, // Auto-restore session on reload
});

function App() {
  // Connection state
  const [uri, setUri] = useState('');
  const [connected, setConnected] = useState(false);
  const [session, setSession] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Action state
  const [message, setMessage] = useState('Hello from Web App!');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);

  // Transaction form state
  const [transactionForm, setTransactionForm] = useState({
    to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    value: '100000000000000000', // 0.1 ETH in wei
    data: '0x',
  });

  // Batch transactions state (for Solana demo)
  const [batchTransactions, setBatchTransactions] = useState([
    { to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0', value: '100000000000000000' },
    { to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0', value: '200000000000000000' },
  ]);

  /**
   * Setup Phoenix SDK event listeners and check for restored session
   */
  useEffect(() => {
    // Check if session was restored on mount
    const checkSession = async () => {
      const currentSession = phoenixClient.getSession();
      if (currentSession?.connected) {
        console.log('✅ Session restored:', currentSession);
        setConnected(true);
        setSession(currentSession);
        setUri('');
      }
    };
    checkSession();

    // Session connected
    phoenixClient.on('session_connected', (sessionData) => {
      console.log('✅ Wallet connected:', sessionData);
      setConnected(true);
      setSession(sessionData);
      setUri(''); // Clear URI
      setErrorMessage('');
    });

    // Session disconnected
    phoenixClient.on('session_disconnected', () => {
      console.log('❌ Wallet disconnected');
      setConnected(false);
      setSession(null);
      setUri('');
    });

    // Request response
    phoenixClient.on('request_response', (responseData) => {
      console.log('📬 Response received:', responseData);
      setLoading(false);

      if (responseData.status === 'success') {
        setResponse(responseData.result);
        setErrorMessage('');
      } else {
        setErrorMessage(responseData.error || 'Request failed');
        setResponse(null);
      }
    });

    // Error
    phoenixClient.on('error', (error) => {
      console.error('❌ Phoenix error:', error);
      setErrorMessage(error.message);
      setLoading(false);
    });

    // Cleanup on unmount
    return () => {
      phoenixClient.disconnect();
    };
  }, []);

  /**
   * Connect Wallet - Generate QR code
   */
  const handleConnectWallet = async () => {
    try {
      setErrorMessage('');
      setLoading(true);

      const result = await phoenixClient.connect();

      setUri(result.uri);

      console.log('🔗 Connection URI:', result.uri);
      console.log('📱 Waiting for wallet to scan QR...');

      setLoading(false);
    } catch (error) {
      console.error('Failed to connect:', error);
      setErrorMessage(error.message);
      setLoading(false);
    }
  };

  /**
   * Sign Message
   */
  const handleSignMessage = async () => {
    try {
      setErrorMessage('');
      setResponse(null);
      setLoading(true);

      const response = await phoenixClient.signMessage({
        message,
        chainType: 'evm',
        chainId: '1', // Ethereum mainnet
      });

      console.log('✅ Message signed:', response);
      // Response will be handled by event listener
    } catch (error) {
      console.error('Failed to sign message:', error);
      setErrorMessage(error.message);
      setLoading(false);
    }
  };

  /**
   * Sign Transaction (returns signature, does not broadcast)
   */
  const handleSignTransaction = async () => {
    try {
      setErrorMessage('');
      setResponse(null);
      setLoading(true);

      const response = await phoenixClient.signTransaction({
        transaction: transactionForm,
        chainType: 'evm',
        chainId: '1', // Ethereum mainnet
      });

      console.log('✅ Transaction signed:', response);
      // Response will be handled by event listener
    } catch (error) {
      console.error('Failed to sign transaction:', error);
      setErrorMessage(error.message);
      setLoading(false);
    }
  };

  /**
   * Send Transaction (signs and broadcasts immediately, e.g., EVM)
   */
  const handleSendTransaction = async () => {
    try {
      setErrorMessage('');
      setResponse(null);
      setLoading(true);

      const response = await phoenixClient.sendTransaction({
        transaction: transactionForm,
        chainType: 'evm',
        chainId: '1', // Ethereum mainnet
      });

      console.log('✅ Transaction sent:', response);
      // Response will be handled by event listener
    } catch (error) {
      console.error('Failed to send transaction:', error);
      setErrorMessage(error.message);
      setLoading(false);
    }
  };

  /**
   * Sign All Transactions (batch signing, e.g., Solana)
   */
  const handleSignAllTransactions = async () => {
    try {
      setErrorMessage('');
      setResponse(null);
      setLoading(true);

      const response = await phoenixClient.signAllTransactions({
        transactions: batchTransactions,
        chainType: 'solana',
        chainId: 'mainnet-beta',
      });

      console.log('✅ Batch transactions signed:', response);
      // Response will be handled by event listener
    } catch (error) {
      console.error('Failed to sign batch transactions:', error);
      setErrorMessage(error.message);
      setLoading(false);
    }
  };

  /**
   * Disconnect
   */
  const handleDisconnect = () => {
    phoenixClient.disconnect();
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🔗 WalletConnect Demo (Phoenix SDK)</h1>
        <p className="subtitle">Web App using @phoenix-demo/dapp SDK</p>
        <div className="status-badge">
          {connected ? (
            <span className="badge badge-success">✅ Connected</span>
          ) : uri ? (
            <span className="badge badge-warning">⏳ Pending</span>
          ) : (
            <span className="badge badge-error">❌ Disconnected</span>
          )}
        </div>
      </header>

      <main className="main-content">
        {/* Error Display */}
        {errorMessage && (
          <div className="alert alert-error">
            <strong>Error:</strong> {errorMessage}
          </div>
        )}

        {/* Connection Section */}
        {!connected ? (
          <section className="card">
            <h2>📱 Connect Wallet</h2>
            <p>Scan QR code with your wallet app to connect</p>

            <button
              onClick={handleConnectWallet}
              disabled={loading || uri}
              className="btn btn-primary"
            >
              {loading ? 'Generating URI...' : uri ? 'Waiting for scan...' : 'Connect Wallet'}
            </button>

            {uri && (
              <div className="qr-container">
                <QRCodeSVG value={uri} size={300} level="M" />
                <p className="hint">Scan this QR code with your wallet</p>
              </div>
            )}
          </section>
        ) : (
          <>
            {/* Session Info */}
            <section className="card">
              <h2>ℹ️ Session Info</h2>
              <div className="info-grid">
                <div><strong>UUID:</strong> {session?.uuid}</div>
                <div><strong>Address:</strong> {session?.address || 'N/A'}</div>
                <div><strong>Chain:</strong> {session?.chainType || 'N/A'}</div>
              </div>
              <button onClick={handleDisconnect} className="btn btn-secondary">
                Disconnect
              </button>
            </section>

            {/* Sign Message Section */}
            <section className="card">
              <h2>✍️ Sign Message</h2>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter message to sign"
                className="input"
                disabled={loading}
              />
              <button
                onClick={handleSignMessage}
                disabled={loading || !message}
                className="btn btn-primary"
              >
                {loading ? 'Signing...' : 'Sign Message'}
              </button>

              {response?.signature && (
                <div className="result">
                  <h3>✅ Signature:</h3>
                  <code>{response.signature}</code>
                </div>
              )}
            </section>

            {/* Sign Transaction Section */}
            <section className="card">
              <h2>✍️ Sign Transaction</h2>
              <div className="form-group">
                <label>To Address:</label>
                <input
                  type="text"
                  value={transactionForm.to}
                  onChange={(e) => setTransactionForm({ ...transactionForm, to: e.target.value })}
                  placeholder="0x..."
                  className="input"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Value (Wei):</label>
                <input
                  type="text"
                  value={transactionForm.value}
                  onChange={(e) => setTransactionForm({ ...transactionForm, value: e.target.value })}
                  placeholder="100000000000000000 (0.1 ETH)"
                  className="input"
                  disabled={loading}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  onClick={handleSignTransaction}
                  disabled={loading || !transactionForm.to}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  {loading ? 'Signing...' : 'Sign Transaction'}
                </button>
                <button
                  onClick={handleSendTransaction}
                  disabled={loading || !transactionForm.to}
                  className="btn btn-primary"
                  style={{ flex: 1, backgroundColor: '#10b981' }}
                >
                  {loading ? 'Sending...' : 'Send Transaction'}
                </button>
              </div>

              {response?.signature && (
                <div className="result">
                  <h3>✅ Signature:</h3>
                  <code>{response.signature}</code>
                </div>
              )}

              {response?.txHash && (
                <div className="result">
                  <h3>✅ Transaction Hash:</h3>
                  <code>{response.txHash}</code>
                </div>
              )}
            </section>

            {/* Batch Signing Section (Solana demo) */}
            <section className="card">
              <h2>📦 Sign All Transactions (Batch)</h2>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                Demo: Sign multiple transactions at once (e.g., Solana)
              </p>
              <button
                onClick={handleSignAllTransactions}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? 'Signing...' : 'Sign All Transactions'}
              </button>

              {response?.signatures && Array.isArray(response.signatures) && (
                <div className="result">
                  <h3>✅ Signatures ({response.signatures.length}):</h3>
                  {response.signatures.map((sig, idx) => (
                    <code key={idx} style={{ display: 'block', marginBottom: '5px' }}>
                      {idx + 1}. {sig}
                    </code>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="footer">
        <p>🔐 E2E Encrypted | Powered by Phoenix SDK</p>
      </footer>
    </div>
  );
}

export default App;
