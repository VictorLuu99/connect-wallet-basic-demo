/**
 * React Example - Phoenix DAPP SDK
 *
 * This example shows how to integrate Phoenix DAPP SDK
 * into a React application
 */

import React, { useState, useEffect } from 'react';
import { PhoenixDappClient, SignResponse } from '@phoenix/dapp';
import { QRCodeSVG } from 'qrcode.react'; // or any QR code library

// Initialize client (do this once, outside component or in context)
const phoenixClient = new PhoenixDappClient({
  serverUrl: 'wss://relay.phoenix.io',
  reconnect: true,
});

export function ConnectWalletExample() {
  const [uri, setUri] = useState<string>('');
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState('Hello from dApp!');
  const [signature, setSignature] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Setup event listeners
    phoenixClient.on('session_connected', (session) => {
      console.log('Wallet connected:', session);
      setConnected(true);
      setUri(''); // Clear URI
    });

    phoenixClient.on('session_disconnected', () => {
      console.log('Wallet disconnected');
      setConnected(false);
    });

    phoenixClient.on('request_response', (response: SignResponse) => {
      console.log('Response received:', response);
    });

    phoenixClient.on('error', (error) => {
      console.error('Phoenix error:', error);
      alert(`Error: ${error.message}`);
      setLoading(false);
    });

    // Cleanup on unmount
    return () => {
      phoenixClient.disconnect();
    };
  }, []);

  const handleConnect = async () => {
    try {
      setLoading(true);
      const { uri } = await phoenixClient.connect();

      console.log('Connection URI:', uri);
      setUri(uri);
    } catch (error) {
      console.error('Failed to connect:', error);
      alert('Failed to generate connection URI');
    } finally {
      setLoading(false);
    }
  };

  const handleSignMessage = async () => {
    try {
      setLoading(true);

      const response = await phoenixClient.signMessage({
        message,
        chainType: 'evm',
        chainId: '1', // Ethereum mainnet
      });

      if (response.status === 'success') {
        setSignature(response.result?.signature || '');
        alert('Message signed successfully!');
      } else {
        alert(`Signing failed: ${response.error}`);
      }
    } catch (error) {
      console.error('Failed to sign:', error);
      alert('Failed to sign message');
    } finally {
      setLoading(false);
    }
  };

  const handleSignTransaction = async () => {
    try {
      setLoading(true);

      const response = await phoenixClient.signTransaction({
        transaction: {
          to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
          value: '100000000000000000', // 0.1 ETH in wei
          data: '0x',
        },
        chainType: 'evm',
        chainId: '1',
      });

      if (response.status === 'success') {
        alert(`Transaction sent!\nHash: ${response.result?.txHash}`);
      } else {
        alert(`Transaction failed: ${response.error}`);
      }
    } catch (error) {
      console.error('Failed to send transaction:', error);
      alert('Failed to send transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    phoenixClient.disconnect();
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Phoenix DAPP Example</h1>

      {!connected ? (
        <div>
          <h2>Connect Wallet</h2>
          <button onClick={handleConnect} disabled={loading}>
            {loading ? 'Generating URI...' : 'Connect Wallet'}
          </button>

          {uri && (
            <div style={{ marginTop: '20px' }}>
              <p>Scan this QR code with your wallet:</p>
              <QRCodeSVG value={uri} size={300} level="M" />
              <p style={{ fontSize: '12px', color: '#666' }}>
                Waiting for wallet connection...
              </p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <h2>✅ Wallet Connected</h2>
          <button onClick={handleDisconnect} style={{ marginBottom: '20px' }}>
            Disconnect
          </button>

          <div style={{ marginBottom: '20px' }}>
            <h3>Sign Message</h3>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
              placeholder="Enter message to sign"
            />
            <button onClick={handleSignMessage} disabled={loading}>
              {loading ? 'Signing...' : 'Sign Message'}
            </button>

            {signature && (
              <div style={{ marginTop: '10px' }}>
                <strong>Signature:</strong>
                <pre style={{
                  background: '#f5f5f5',
                  padding: '10px',
                  overflow: 'auto',
                  fontSize: '12px'
                }}>
                  {signature}
                </pre>
              </div>
            )}
          </div>

          <div>
            <h3>Send Transaction</h3>
            <p>Send 0.1 ETH to test address</p>
            <button onClick={handleSignTransaction} disabled={loading}>
              {loading ? 'Sending...' : 'Send Transaction'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConnectWalletExample;
