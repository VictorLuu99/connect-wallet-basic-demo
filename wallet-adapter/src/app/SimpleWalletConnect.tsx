import { useTokenContract } from '@/hooks/useTokenContract';
import {
  AccountBalanceWallet,
  CheckCircle,
  ContentCopy,
  Error as ErrorIcon,
  Info,
  Send,
  Sync,
  Token,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { Transaction as TransactionSui } from '@mysten/sui/transactions';
import { ChainType, useWalletConnectors } from '@phoenix-wallet/core';
import { EvmTransaction } from '@phoenix-wallet/evm';
import { SolanaTransaction } from '@phoenix-wallet/solana';
import { useWallet } from '@/hooks/useWallet';
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { ethers } from 'ethers';
import React, { useEffect, useState } from 'react';
import { ConnectorItem } from './ConnectorItem';
import { APTOS_COIN } from '@aptos-labs/ts-sdk';
import { useClientWallet } from './ClientWalletProvider';
import { WalletAccount } from '@phoenix-wallet/sui';

export const SimpleWalletConnect: React.FC = () => {
  const { connectors, chainConfigs } = useWalletConnectors();
  const { isWalletReady } = useClientWallet();
  const [selectedConnectorId, setSelectedConnectorId] = useState<string>('');
  const [selectedChainId, setSelectedChainId] = useState<string>('');
  const [message, setMessage] = useState<string>('Hello Web3!');
  const [transactionData, setTransactionData] = useState<{
    to: string;
    value: string;
    data: string;
  }>({
    to: '',
    value: '0',
    data: '0x',
  });

  const [dataAptosSendTransaction, setDataAptosSendTransaction] = useState<{
    to: string;
    value: string;
  }>({
    to: '',
    value: '0',
  });

  const [rawTransaction, setRawTransaction] = useState<string>('');
  const [signature, setSignature] = useState<string>('');
  const [operationResult, setOperationResult] = useState<{
    type: string;
    data: string;
    error?: string;
  } | null>(null);
  const [useVersionedTransaction, setUseVersionedTransaction] = useState<boolean>(false);

  // Token contract states
  const [tokenAddress, setTokenAddress] = useState<string>('');
  const [tokenRecipient, setTokenRecipient] = useState<string>('');
  const [tokenAmount, setTokenAmount] = useState<string>('');
  const [tokenInfo, setTokenInfo] = useState<{
    symbol: string;
    decimals: number;
    totalSupply: string;
    balance: string;
  } | null>(null);

  const { wallet, isConnected, address, chainId, switchChain, getWallet } = useWallet(selectedConnectorId);

  // Initialize token contract
  const { getContract } = useTokenContract({
    contractAddress: tokenAddress,
    chainId: chainId || '',
    wallet: wallet,
  });

  const [walletBalance, setWalletBalance] = useState<{
    amount: string;
    uiAmount: string;
    decimals: number;
    symbol: string;
    name: string;
  } | null>(null);

  // Add switch chain handler
  const handleSwitchChain = async () => {
    if (!wallet || !selectedChainId) return;

    try {
      setOperationResult({ type: 'loading', data: 'Switching chain...' });
      // For EVM chains, we'll switch to the selected chain
      if (wallet.chain.chainType === ChainType.EVM) {
        await switchChain(selectedChainId);
        console.log('chain switched successfully');
        console.log('wallet switch chain', getWallet());
        const selectedChain = chainConfigs.find((chain) => chain.id === selectedChainId);
        setOperationResult({
          type: 'success',
          data: `Chain switched successfully to ${selectedChain?.name || 'Unknown'}!`,
        });
      } else {
        setOperationResult({
          type: 'error',
          data: 'Chain switching is only supported for EVM chains',
        });
      }
      // Refresh wallet balance after chain switch
      await fetchWalletBalance();
    } catch (error: any) {
      setOperationResult({
        type: 'error',
        data: 'Failed to switch chain',
        error: error.message,
      });
    }
  };

  // Fetch wallet balance when wallet is connected
  useEffect(() => {
    if (wallet && isConnected) {
      fetchWalletBalance();
    } else {
      setWalletBalance(null);
    }
  }, [wallet, isConnected, address]);

  const fetchWalletBalance = async () => {
    if (!wallet) return;

    try {
      const balance = await wallet.getBalance();
      setWalletBalance(balance);
    } catch (error: any) {
      console.error('Failed to fetch wallet balance:', error);
      setOperationResult({
        type: 'error',
        data: 'Failed to fetch wallet balance',
        error: error.message,
      });
    }
  };

  const handleConnectorSelect = (connectorId: string) => {
    setSelectedConnectorId(connectorId);
    setOperationResult(null);
    setTokenInfo(null);
  };

  const handleSignMessage = async () => {
    if (!wallet || !message) return;

    try {
      setOperationResult({ type: 'loading', data: 'Signing message...' });
      if (isSuiStandard) {
        const account = wallet.walletClient.getAccounts().find((account: WalletAccount) => account.address === address);
        if (!account) {
          throw new Error('Account not found');
        }
        const signedMessage = await wallet.signMessage({
          message: new TextEncoder().encode(message),
          account: account,
        } as any);
        setOperationResult({
          type: 'success',
          data: `Message signed successfully! Signature: ${signedMessage}`,
        });
      } else {
        const signature = await wallet.signMessage(message);
        setOperationResult({
          type: 'success',
          data: `Message signed successfully! Signature: ${signature}`,
        });
      }
    } catch (error: any) {
      setOperationResult({
        type: 'error',
        data: 'Failed to sign message',
        error: error.message,
      });
    }
  };

  const createSolanaTransaction = async (): Promise<SolanaTransaction> => {
    if (!address) {
      throw new Error('Wallet address is not available');
    }

    const fromPublicKey = new PublicKey(address);
    const toPublicKey = new PublicKey(transactionData.to);
    const valueInLamports = Math.floor(parseFloat(transactionData.value) * 1000000000); // Convert SOL to lamports
    const connection = wallet?.chain.provider as Connection;
    const recentBlockhash = await connection.getLatestBlockhash();

    if (useVersionedTransaction) {
      // Create a versioned transaction
      const instruction = SystemProgram.transfer({
        fromPubkey: fromPublicKey,
        toPubkey: toPublicKey,
        lamports: valueInLamports,
      });

      const messageV0 = new TransactionMessage({
        payerKey: fromPublicKey,
        recentBlockhash: recentBlockhash.blockhash,
        instructions: [instruction],
      }).compileToV0Message();

      return new VersionedTransaction(messageV0);
    } else {
      // Create a legacy transaction
      const transaction = new Transaction();
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: fromPublicKey,
          toPubkey: toPublicKey,
          lamports: valueInLamports,
        })
      );
      transaction.feePayer = fromPublicKey;
      transaction.recentBlockhash = recentBlockhash.blockhash;
      transaction.lastValidBlockHeight = recentBlockhash.lastValidBlockHeight;

      return transaction;
    }
  };

  const handleSignAndSubmitTransaction = async () => {
    if (!wallet || !dataAptosSendTransaction.to) return;
    try {
      setOperationResult({ type: 'loading', data: 'Signing transaction...' });

      // Handle different wallet types
      if (isAptos) {
        const signedTx = await wallet.sendTransaction({
          payload: {
            function: '0x1::coin::transfer',
            typeArguments: [APTOS_COIN],
            functionArguments: [dataAptosSendTransaction.to, (Number(dataAptosSendTransaction.value) * 1e8).toString()],
          },
        });
        setOperationResult({
          type: 'success',
          data: `Transaction signed successfully! Signed TX: ${signedTx}`,
        });
        return;
      }
    } catch (error: any) {
      setOperationResult({
        type: 'error',
        data: 'Failed to sign transaction',
        error: error.message,
      });
    }
  };

  const handleSignTransaction = async () => {
    if (!wallet || !transactionData.to) return;

    try {
      setOperationResult({ type: 'loading', data: 'Signing transaction...' });

      // Handle different wallet types
      if (isAptos) {
        const txn = await wallet.chain.provider.transaction.build.simple({
          sender: address,
          data: {
            function: '0x1::coin::transfer',
            typeArguments: [APTOS_COIN],
            functionArguments: [transactionData.to, (Number(transactionData.value) * 1e8).toString()],
          },
        });
        const signedTx = await wallet.signTransaction(txn);

        setOperationResult({
          type: 'success',
          data: `Transaction signed successfully! Signed TX: ${JSON.stringify(signedTx)}`,
        });
        return;
      }

      if (selectedConnectorId.includes('solana')) {
        const transaction = await createSolanaTransaction();
        const signedTx = await wallet.signTransaction(transaction);
        setOperationResult({
          type: 'success',
          data: `Transaction signed successfully! Signed TX: ${JSON.stringify(signedTx)}`,
        });
        setRawTransaction(typeof signedTx === 'string' ? signedTx : JSON.stringify(signedTx));
      } else if (selectedConnectorId.includes('sui')) {
        console.log('creating transaction transfer sui');
        // create transaction transfer sui
        const transaction = new TransactionSui();
        const account = wallet.walletClient.getAccounts().find((account: WalletAccount) => account.address === address);

        if (!account) {
          throw new Error('Account not found');
        }
        const amountInBase = ethers.parseUnits(transactionData.value, 9);
        const recipientAddress = transactionData.to;
        const [coin] = transaction.splitCoins(transaction.gas, [transaction.pure.u64(amountInBase)]);
        transaction.transferObjects([coin], transaction.pure.address(recipientAddress));

        const signedTx = await wallet.signTransaction({
          transaction: transaction,
          account: account,
          chain: wallet.chain.id,
        });
        setOperationResult({
          type: 'success',
          data: `Transaction signed successfully! Signed TX: ${(signedTx as any).transaction}. Signature: ${(signedTx as any).signature}`,
        });
      } else {
        // EVM transaction
        const transaction: EvmTransaction = {
          to: transactionData.to,
          value: transactionData.value,
          data: transactionData.data,
        };
        const signedTx = await wallet.signTransaction(transaction);
        setOperationResult({
          type: 'success',
          data: `Transaction signed successfully! Signed TX: ${JSON.stringify(signedTx)}`,
        });
        setRawTransaction(typeof signedTx === 'string' ? signedTx : JSON.stringify(signedTx));
      }
    } catch (error: any) {
      console.log('error', { error });

      setOperationResult({
        type: 'error',
        data: 'Failed to sign transaction',
        error: error.message,
      });
    }
  };

  const handleSignAllTransactions = async () => {
    if (!wallet || !transactionData.to || !selectedConnectorId.includes('solana')) return;

    try {
      setOperationResult({ type: 'loading', data: 'Signing multiple transactions...' });

      // Create multiple Solana transactions
      const transaction1 = await createSolanaTransaction();
      const transaction2 = await createSolanaTransaction();

      const signedTxs = await wallet.signAllTransactions([transaction1, transaction2]);
      const firstTx = typeof signedTxs[0] === 'string' ? signedTxs[0] : JSON.stringify(signedTxs[0]);
      setOperationResult({
        type: 'success',
        data: `Multiple transactions signed successfully! First TX: ${firstTx.slice(0, 30)}...`,
      });
    } catch (error: any) {
      setOperationResult({
        type: 'error',
        data: 'Failed to sign multiple transactions',
        error: error.message,
      });
    }
  };

  const handleSendTransaction = async () => {
    if (!wallet || !transactionData.to) return;

    try {
      setOperationResult({ type: 'loading', data: 'Sending transaction...' });

      if (selectedConnectorId.includes('solana')) {
        const transaction = await createSolanaTransaction();
        const txHash = await wallet.sendTransaction(transaction);
        setOperationResult({
          type: 'success',
          data: `Transaction sent successfully! TX Hash: ${txHash}`,
        });
      } else if (selectedConnectorId.includes('sui')) {
        // create transaction transfer sui
        const transaction = new TransactionSui();
        const account = wallet.walletClient.getAccounts().find((account: WalletAccount) => account.address === address);
        if (!account) {
          throw new Error('Account not found');
        }
        const recipientAddress = transactionData.to;
        const amountInBase = ethers.parseUnits(transactionData.value, 9);
        const [coin] = transaction.splitCoins(transaction.gas, [transaction.pure.u64(amountInBase)]);
        transaction.transferObjects([coin], transaction.pure.address(recipientAddress));
        const txHash = await wallet.sendTransaction({
          transaction: transaction,
          account: account,
          chain: wallet.chain.id,
        });
        setOperationResult({
          type: 'success',
          data: `Transaction sent successfully! TX Hash: ${txHash}`,
        });
      } else {
        // EVM transaction
        const transaction: EvmTransaction = {
          to: transactionData.to,
          value: transactionData.value,
          data: transactionData.data,
        };
        const txHash = await wallet.sendTransaction(transaction);
        setOperationResult({
          type: 'success',
          data: `Transaction sent successfully! TX Hash: ${txHash}`,
        });
      }
    } catch (error: any) {
      setOperationResult({
        type: 'error',
        data: 'Failed to send transaction',
        error: error.message,
      });
    }
  };

  const handleSendRawTransaction = async () => {
    if (!wallet || !rawTransaction) return;

    try {
      setOperationResult({ type: 'loading', data: 'Sending raw transaction...' });
      let txHash;
      if (isSui) {
        txHash = await wallet.sendRawTransaction({ transaction: rawTransaction, signature: signature });
      } else {
        txHash = await wallet.sendRawTransaction(rawTransaction);
      }
      setOperationResult({
        type: 'success',
        data: `Raw transaction sent successfully! TX Hash: ${txHash}`,
      });
    } catch (error: any) {
      setOperationResult({
        type: 'error',
        data: 'Failed to send raw transaction',
        error: error.message,
      });
    }
  };

  // Token Contract Functions
  const handleGetTokenInfo = async () => {
    const tokenContract = getContract();
    if (!tokenContract || !address) return;
    console.log(tokenContract, address);

    try {
      setOperationResult({ type: 'loading', data: 'Fetching token information...' });

      const [symbol, decimals, totalSupply, balance] = await Promise.all([
        tokenContract.getSymbol(),
        tokenContract.getDecimals(),
        tokenContract.getTotalSupply(),
        tokenContract.getBalance(address),
      ]);

      console.log('token info', symbol, decimals, totalSupply, balance);

      setTokenInfo({
        symbol,
        decimals,
        totalSupply,
        balance: balance.uiAmount,
      });

      setOperationResult({
        type: 'success',
        data: `Token information fetched successfully!`,
      });
    } catch (error: any) {
      console.error(error);
      setOperationResult({
        type: 'error',
        data: 'Failed to fetch token information',
        error: error.message,
      });
    }
  };

  const handleTransferToken = async () => {
    const tokenContract = getContract();
    if (!tokenContract || !tokenRecipient || !tokenAmount) return;

    try {
      setOperationResult({ type: 'loading', data: 'Transferring tokens...' });

      // Get token decimals to calculate the correct amount
      const decimals = await tokenContract.getDecimals();
      const amountInSmallestUnit = ethers.parseUnits(tokenAmount, decimals).toString();

      // Perform the transfer
      const response = await tokenContract.transfer(tokenRecipient, amountInSmallestUnit);
      setOperationResult({
        type: 'Transaction submitted',
        data: `Transaction submitted! TX Hash: ${response.txHash}`,
      });
      // Wait for transaction confirmation
      await response.wait();

      setOperationResult({
        type: 'success',
        data: `Tokens transferred successfully! TX Hash: ${response.txHash}`,
      });

      // Update token balance after transfer
      if (address) {
        const balance = await tokenContract.getBalance(address);
        setTokenInfo((prev) => (prev ? { ...prev, balance: balance.uiAmount } : null));
      }
    } catch (error: any) {
      console.error(error);
      setOperationResult({
        type: 'error',
        data: 'Failed to transfer tokens',
        error: error.message,
      });
    }
  };

  // Determine if the selected connector is Solana
  const isSolana = wallet?.chain?.chainType === ChainType.SOLANA;
  const isSui = wallet?.chain?.chainType === ChainType.SUI;
  const isAptos = wallet?.chain?.chainType === ChainType.APTOS;
  const isSuiStandard = wallet?.chain?.chainType === ChainType.SUI;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
        Phoenix Wallet Demo
      </Typography>

      {/* Wallet Connector Selection */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          <AccountBalanceWallet sx={{ mr: 1, verticalAlign: 'middle' }} />
          Select Wallet Connector
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, justifyContent: 'center' }}>
          {!isWalletReady ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                Loading wallet connectors...
              </Typography>
            </Box>
          ) : (
            connectors.map((connector) => (
              <Card
                key={connector.id}
                variant="outlined"
                onClick={() => handleConnectorSelect(connector.id)}
                sx={{
                  width: 160,
                  height: 160,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  borderWidth: selectedConnectorId === connector.id ? 2 : 1,
                  borderColor: selectedConnectorId === connector.id ? 'primary.main' : 'divider',
                  boxShadow: selectedConnectorId === connector.id ? 4 : 1,
                  bgcolor: selectedConnectorId === connector.id ? 'primary.light' : 'background.paper',
                  color: selectedConnectorId === connector.id ? 'primary.contrastText' : 'text.primary',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 3,
                  },
                }}
              >
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    p: 1,
                    mb: 2,
                  }}
                >
                  {connector.logo ? (
                    <Box
                      component="img"
                      src={connector.logo}
                      alt={`${connector.name} logo`}
                      sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <AccountBalanceWallet fontSize="large" color="primary" />
                  )}
                </Box>
                <Typography variant="subtitle1" fontWeight={selectedConnectorId === connector.id ? 'bold' : 'normal'}>
                  {connector.name}
                </Typography>
                <Chip
                  label={connector.chainType}
                  size="small"
                  color={connector.chainType === ChainType.EVM ? 'secondary' : 'info'}
                  sx={{ mt: 1, opacity: 0.9 }}
                />
              </Card>
            ))
          )}
        </Box>

        {selectedConnectorId && <ConnectorItem connectorId={selectedConnectorId} />}
      </Paper>

      {/* Wallet Operations */}
      {isConnected && wallet && (
        <Stack spacing={3}>
          {/* Wallet Info */}
          <Card elevation={3}>
            <CardHeader
              title={
                <Typography variant="h6">
                  <AccountBalanceWallet sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Wallet Info
                </Typography>
              }
            />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Address
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body1" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                      {address}
                    </Typography>
                    <Button
                      size="small"
                      sx={{ ml: 1 }}
                      onClick={() => {
                        navigator.clipboard.writeText(address || '');
                      }}
                    >
                      <ContentCopy fontSize="small" />
                    </Button>
                  </Box>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Chain ID
                  </Typography>
                  <Typography variant="body1" fontFamily="monospace">
                    {chainId}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Wallet Balance</Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  {wallet?.chain?.chainType === ChainType.EVM && (
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel id="chain-select-label">Chain</InputLabel>
                      <Select
                        labelId="chain-select-label"
                        value={selectedChainId}
                        label="Chain"
                        onChange={(e) => setSelectedChainId(e.target.value)}
                      >
                        {chainConfigs
                          .filter((chain) => chain.chainType === ChainType.EVM)
                          .map((chain) => (
                            <MenuItem key={chain.id} value={chain.id}>
                              {chain.name}
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                  )}
                  <Button variant="outlined" size="small" startIcon={<Sync />} onClick={fetchWalletBalance}>
                    Refresh
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AccountBalanceWallet />}
                    onClick={handleSwitchChain}
                    disabled={!selectedChainId || selectedChainId === chainId}
                  >
                    Switch Chain
                  </Button>
                </Box>
              </Box>

              {walletBalance ? (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body1">
                    <strong>{walletBalance.name}:</strong>{' '}
                    <Typography component="span" fontFamily="monospace">
                      {walletBalance.uiAmount} {walletBalance.symbol}
                    </Typography>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Raw amount: {walletBalance.amount} (decimals: {walletBalance.decimals})
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Click refresh to load balance
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Token Contract Section */}
          <Card elevation={3}>
            <CardHeader
              title={
                <Typography variant="h6">
                  <Token sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Token Contract
                </Typography>
              }
            />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 2 }}>
                <Box sx={{ flex: '1 1 auto' }}>
                  <TextField
                    fullWidth
                    label="Token Address"
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                    placeholder={
                      isSolana
                        ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
                        : '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
                    }
                    variant="outlined"
                    margin="normal"
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    onClick={handleGetTokenInfo}
                    disabled={!tokenAddress}
                    sx={{ mt: { xs: 0, md: 2 } }}
                  >
                    Get Token Info
                  </Button>
                </Box>
              </Box>

              {tokenInfo && (
                <Paper sx={{ mt: 3, p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Token Information
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ minWidth: '45%' }}>
                      <Typography variant="body2">
                        <strong>Symbol:</strong> {tokenInfo.symbol}
                      </Typography>
                    </Box>
                    <Box sx={{ minWidth: '45%' }}>
                      <Typography variant="body2">
                        <strong>Decimals:</strong> {tokenInfo.decimals}
                      </Typography>
                    </Box>
                    <Box sx={{ minWidth: '45%' }}>
                      <Typography variant="body2">
                        <strong>Total Supply:</strong> {tokenInfo.totalSupply}
                      </Typography>
                    </Box>
                    <Box sx={{ minWidth: '45%' }}>
                      <Typography variant="body2">
                        <strong>Your Balance:</strong> {tokenInfo.balance}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              )}

              <Box sx={{ mt: 4 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Transfer Tokens
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="Recipient Address"
                    value={tokenRecipient}
                    onChange={(e) => setTokenRecipient(e.target.value)}
                    placeholder={isSolana ? '5YNmS1R9nNSCDzb5a7mMJ1dwK9uHeAAF4CerVnwgX5r' : '0x1234...5678'}
                    variant="outlined"
                  />
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
                    <TextField
                      fullWidth
                      label="Amount"
                      value={tokenAmount}
                      onChange={(e) => setTokenAmount(e.target.value)}
                      placeholder="1.0"
                      type="number"
                      variant="outlined"
                      InputProps={{
                        endAdornment: tokenInfo && <InputAdornment position="end">{tokenInfo.symbol}</InputAdornment>,
                      }}
                    />
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      startIcon={<Send />}
                      onClick={handleTransferToken}
                      disabled={!tokenRecipient || !tokenAmount || !getContract()}
                      sx={{ minWidth: { md: '200px' } }}
                    >
                      Transfer Tokens
                    </Button>
                  </Box>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          {/* Operations Cards */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
            {/* Sign Message */}
            <Card elevation={3} sx={{ flex: 1 }}>
              <CardHeader title={<Typography variant="h6">Sign Message</Typography>} />
              <CardContent>
                <TextField
                  fullWidth
                  label="Message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  multiline
                  rows={2}
                  placeholder="Enter your message here..."
                  variant="outlined"
                  margin="normal"
                />
                <Button fullWidth variant="contained" color="primary" onClick={handleSignMessage} sx={{ mt: 2 }}>
                  Sign Message
                </Button>
              </CardContent>
            </Card>

            {/* Sign Transaction */}
            <Card elevation={3} sx={{ flex: 1 }}>
              <CardHeader title={<Typography variant="h6">Sign Transaction</Typography>} />
              <CardContent>
                <TextField
                  fullWidth
                  label={isSolana ? 'To Address (Solana Public Key)' : 'To Address'}
                  value={transactionData.to}
                  onChange={(e) => setTransactionData((prev) => ({ ...prev, to: e.target.value }))}
                  placeholder={isSolana ? '5YNmS1R9nNSCDzb5a7mMJ1dwK9uHeAAF4CerVnwgX5r' : '0xabc...def'}
                  variant="outlined"
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label={isSolana ? 'Value (in SOL)' : 'Value (in wei)'}
                  value={transactionData.value}
                  onChange={(e) => setTransactionData((prev) => ({ ...prev, value: e.target.value }))}
                  placeholder={isSolana ? '0.01' : '1000000000000000'}
                  variant="outlined"
                  margin="normal"
                />
                {!isSolana && !isAptos && (
                  <TextField
                    fullWidth
                    label="Data"
                    value={transactionData.data}
                    onChange={(e) => setTransactionData((prev) => ({ ...prev, data: e.target.value }))}
                    placeholder="0x0123456789abcdef"
                    variant="outlined"
                    margin="normal"
                  />
                )}
                {isSolana && !isAptos && (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={useVersionedTransaction}
                        onChange={() => setUseVersionedTransaction(!useVersionedTransaction)}
                      />
                    }
                    label="Use Versioned Transaction"
                    sx={{ mt: 1 }}
                  />
                )}
                <Button fullWidth variant="contained" color="primary" onClick={handleSignTransaction} sx={{ mt: 2 }}>
                  Sign Transaction
                </Button>
              </CardContent>
            </Card>
            {isAptos && (
              <Card elevation={3} sx={{ flex: 1 }}>
                <CardHeader
                  title={<Typography variant="h6">Sign and submit Transaction ( Send Transaction )</Typography>}
                />
                <CardContent>
                  <TextField
                    fullWidth
                    label={'To Address'}
                    value={dataAptosSendTransaction.to}
                    onChange={(e) => setDataAptosSendTransaction((prev) => ({ ...prev, to: e.target.value }))}
                    placeholder={isSolana ? '5YNmS1R9nNSCDzb5a7mMJ1dwK9uHeAAF4CerVnwgX5r' : '0xabc...def'}
                    variant="outlined"
                    margin="normal"
                  />
                  <TextField
                    fullWidth
                    label={'Value (in wei)'}
                    value={dataAptosSendTransaction.value}
                    onChange={(e) => setDataAptosSendTransaction((prev) => ({ ...prev, value: e.target.value }))}
                    placeholder={isSolana ? '0.01' : '1000000000000000'}
                    variant="outlined"
                    margin="normal"
                  />
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    onClick={handleSignAndSubmitTransaction}
                    sx={{ mt: 2 }}
                  >
                    Sign and submit Transaction
                  </Button>
                </CardContent>
              </Card>
            )}
          </Box>

          {/* More Operations */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
            {/* Sign All Transactions (Solana only) */}
            {isSolana && (
              <Card elevation={3} sx={{ flex: 1 }}>
                <CardHeader title={<Typography variant="h6">Sign All Transactions (Solana)</Typography>} />
                <CardContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Sign multiple transactions at once using the same transaction data
                  </Typography>
                  <Button fullWidth variant="contained" color="primary" onClick={handleSignAllTransactions}>
                    Sign Multiple Transactions
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Send Transaction */}
            {!isAptos && (
              <Card elevation={3} sx={{ flex: 1 }}>
                <CardHeader title={<Typography variant="h6">Send Transaction</Typography>} />
                <CardContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Uses the same transaction data as the Sign Transaction section
                  </Typography>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    onClick={handleSendTransaction}
                    startIcon={<Send />}
                  >
                    Send Transaction
                  </Button>
                </CardContent>
              </Card>
            )}
          </Box>

          {/* Send Raw Transaction */}
          {!isAptos && (
            <Card elevation={3}>
              <CardHeader title={<Typography variant="h6">Send Raw Transaction</Typography>} />
              <CardContent>
                <TextField
                  fullWidth
                  label="Raw Transaction (base64)"
                  value={rawTransaction}
                  onChange={(e) => setRawTransaction(e.target.value)}
                  multiline
                  rows={2}
                  placeholder={
                    isSolana
                      ? 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEDyf2cSYf0apvP4BeGu/HH2cIrF+7QFtYEEvH4Q9t+mQAAAAAAAAAAqcdptXNWyMB3SgeuXbXgQvdJMr2EGqCbTjLrLfP8JEUBAgIAAQwCAAAAKgAAAAAAAAA='
                      : '0x89205a3a3b2a136b355f67371d9153afa4050e13c8458cd50a1e40783d37d39b...'
                  }
                  variant="outlined"
                  margin="normal"
                  InputProps={{
                    style: { fontFamily: 'monospace' },
                  }}
                />
                <TextField
                  fullWidth
                  label="Signature Transaction (base64)"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  multiline
                  disabled={!isSui}
                  rows={2}
                  placeholder={
                    isSolana
                      ? 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEDyf2cSYf0apvP4BeGu/HH2cIrF+7QFtYEEvH4Q9t+mQAAAAAAAAAAqcdptXNWyMB3SgeuXbXgQvdJMr2EGqCbTjLrLfP8JEUBAgIAAQwCAAAAKgAAAAAAAAA='
                      : '0x89205a3a3b2a136b355f67371d9153afa4050e13c8458cd50a1e40783d37d39b...'
                  }
                  variant="outlined"
                  margin="normal"
                  InputProps={{
                    style: { fontFamily: 'monospace' },
                  }}
                />
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={handleSendRawTransaction}
                  startIcon={<Send />}
                  sx={{ mt: 2 }}
                >
                  Send Raw Transaction
                </Button>
              </CardContent>
            </Card>
          )}
        </Stack>
      )}

      {/* Operation Result */}
      {operationResult && (
        <Paper
          elevation={3}
          sx={{
            mt: 4,
            p: 3,
            bgcolor:
              operationResult.type === 'success'
                ? 'success.light'
                : operationResult.type === 'error'
                  ? 'error.light'
                  : 'warning.light',
            color: 'text.primary',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
            {operationResult.type === 'success' ? (
              <CheckCircle color="success" sx={{ mr: 1 }} />
            ) : operationResult.type === 'error' ? (
              <ErrorIcon color="error" sx={{ mr: 1 }} />
            ) : (
              <Info color="info" sx={{ mr: 1 }} />
            )}
            <Typography variant="h6">
              {operationResult.type === 'success'
                ? 'Success'
                : operationResult.type === 'error'
                  ? 'Error'
                  : 'Processing'}
            </Typography>
          </Box>
          <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
            {operationResult.data}
          </Typography>
          {operationResult.error && (
            <Typography variant="body2" color="error" sx={{ mt: 1, fontWeight: 'medium' }}>
              {operationResult.error}
            </Typography>
          )}
        </Paper>
      )}
    </Container>
  );
};
