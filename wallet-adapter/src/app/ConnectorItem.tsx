import { ConnectorStatus, ChainType, useWalletConnectors } from '@phoenix-wallet/core';
import { EvmChain } from '@phoenix-wallet/evm';
import { useWallet } from '@/hooks/useWallet';
import { JsonRpcProvider } from 'ethers';
import { useState, useEffect } from 'react';
import {
  Button,
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Chip,
  Stack,
  Alert,
  Link,
  Divider,
  Paper,
  Avatar,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  AccountBalanceWallet,
  ContentCopy,
  AddCircle,
  Sync,
  Download,
  Link as LinkIcon,
  Check,
  PowerSettingsNew,
  Refresh,
  Info,
} from '@mui/icons-material';
import { useTokenContract } from '@/hooks/useTokenContract';

interface ConnectorItemProps {
  connectorId: string;
}

export const ConnectorItem: React.FC<ConnectorItemProps> = ({ connectorId }) => {
  const {
    getWallet,
    isWalletReady,
    connector,
    status,
    isConnected,
    isConnecting,
    isDisconnected,
    hasError,
    isInstalled,
    address,
    chainId,
    connect,
    disconnect,
    switchChain,
    wallet,
  } = useWallet(connectorId, {
    onConnect: (cId, addr, wallet, chainConfig) => {
      console.log('get wallet', getWallet());

      console.log('onConnect', cId, addr, wallet, chainConfig);
    },
    onDisconnect: (cId) => {
      console.log('onDisconnect', cId);
    },
    onChainChanged: (cId, wallet, chainConfig) => {
      console.log('onChainChanged', cId, wallet, chainConfig);
    },
    onAccountChanged: (cId, addr, wallet) => {
      console.log('onAccountChanged', cId, addr, wallet);
    },
  });

  const { chainConfigs } = useWalletConnectors();

  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isAddingChain, setIsAddingChain] = useState<boolean>(false);
  const [addChainError, setAddChainError] = useState<string | null>(null);
  const [selectedChainId, setSelectedChainId] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if user is on a mobile device
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
    };

    setIsMobile(checkMobile());
  }, []);

  if (!connector) {
    return null;
  }

  // Format address for display
  // const formatAddress = (addr: string | null) => {
  //   if (!addr) return '';
  //   return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  // };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get the status color for UI
  const getStatusColor = () => {
    switch (status) {
      case ConnectorStatus.CONNECTED:
        return 'success';
      case ConnectorStatus.CONNECTING:
        return 'warning';
      case ConnectorStatus.ERROR:
        return 'error';
      default:
        return 'default';
    }
  };

  // Get the status text for UI
  const getStatusText = () => {
    switch (status) {
      case ConnectorStatus.CONNECTED:
        return 'Connected';
      case ConnectorStatus.CONNECTING:
        return 'Connecting...';
      case ConnectorStatus.ERROR:
        return 'Connection Error';
      default:
        return 'Not Connected';
    }
  };

  const handleConnect = async () => {
    try {
      setConnectionError(null);
      console.log(`Attempting to connect to ${connector.name}...`);
      const result = await connect();
      console.log(`Connection result:`, result);
    } catch (error: any) {
      console.error(`Failed to connect to ${connector.name}:`, error);
      setConnectionError(error.message || 'Unknown error occurred');
    }
  };

  const handleDisconnect = async () => {
    try {
      console.log(`Disconnecting from ${connector.name}...`);
      await disconnect();
    } catch (error: any) {
      console.error(`Failed to disconnect from ${connector.name}:`, error);
    }
  };

  const handleInstall = () => {
    window.open(connector.installLink, '_blank');
  };

  const handleAddChain = async () => {
    if (!connector || connector.chainType !== ChainType.EVM || !selectedChainId) {
      return;
    }

    setIsAddingChain(true);
    setAddChainError(null);

    try {
      // Find the selected chain from chainConfigs
      const chainToAdd = chainConfigs.find((chain) => chain.id === selectedChainId);

      if (!chainToAdd) {
        throw new Error('Selected chain not found');
      }

      // Create the EvmChain instance
      const provider = new JsonRpcProvider(chainToAdd.publicRpcUrl);
      const chainWithProvider = {
        ...chainToAdd,
        chainName: chainToAdd.name,
        provider: provider,
      };

      const evmChain = new EvmChain(chainToAdd.name, chainWithProvider as any);
      await connector.addChain(evmChain);
      console.log(`Successfully added chain: ${chainToAdd.name}`);

      // Reset the selection after successful addition
      setSelectedChainId('');
    } catch (error: any) {
      console.error(`Failed to add chain:`, error);
      setAddChainError(error.message || 'Failed to add chain');
    } finally {
      setIsAddingChain(false);
    }
  };

  return (
    <Card elevation={3} sx={{ mt: 4, borderRadius: 2, overflow: 'visible' }}>
      <CardHeader
        avatar={
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            {connector.logo ? (
              <Box
                component="img"
                src={connector.logo}
                alt={`${connector.name} logo`}
                sx={{ width: '80%', height: '80%', objectFit: 'contain' }}
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <AccountBalanceWallet fontSize="large" color="primary" />
            )}
          </Avatar>
        }
        title={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="h6" component="h3">
              {connector.name}
            </Typography>
            <Chip label={getStatusText()} size="small" color={getStatusColor()} sx={{ ml: 1 }} />
          </Box>
        }
        subheader={
          <Typography variant="subtitle2" color="text.secondary">
            {connector.chainType} Wallet
          </Typography>
        }
        action={
          isConnected && (
            <IconButton color="error" onClick={handleDisconnect} title="Disconnect">
              <PowerSettingsNew />
            </IconButton>
          )
        }
      />

      <Divider />

      <CardContent>
        {isConnected && address && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Wallet Address
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body1" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                {address}
              </Typography>
              <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
                <IconButton size="small" sx={{ ml: 1 }} onClick={() => copyToClipboard(address || '')}>
                  {copied ? <Check fontSize="small" color="success" /> : <ContentCopy fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Box>
            {chainId && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
                <Typography variant="body2">
                  <strong>Chain ID:</strong> {chainId}
                </Typography>
                {wallet && (
                  <Button variant="outlined" size="small" startIcon={<Sync />} onClick={() => wallet.getBalance()}>
                    Refresh Balance
                  </Button>
                )}
              </Box>
            )}
          </Box>
        )}

        <Box sx={{ mt: 2 }}>
          {isInstalled === false && !isMobile && (
            <Button
              fullWidth
              variant="contained"
              color="secondary"
              startIcon={<Download />}
              onClick={handleInstall}
              size="large"
              sx={{ py: 1.5 }}
            >
              Install {connector.name}
            </Button>
          )}

          {(isInstalled || isMobile) && isDisconnected && (
            <Button
              fullWidth
              variant="contained"
              color="primary"
              startIcon={<AccountBalanceWallet />}
              onClick={handleConnect}
              size="large"
              sx={{ py: 1.5 }}
            >
              Connect to {connector.name}
            </Button>
          )}

          {isConnecting && (
            <Box>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                disabled
                startIcon={<CircularProgress size={20} color="inherit" />}
                sx={{ mb: 1, py: 1.5 }}
                size="large"
              >
                Connecting...
              </Button>
              <Alert severity="info" icon={<Info />}>
                Check your wallet for connection prompt
              </Alert>
            </Box>
          )}

          {isConnected && connector.chainType === ChainType.EVM && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Add Network Chain
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
                  <Box sx={{ flex: '1 1 auto' }}>
                    <FormControl fullWidth>
                      <InputLabel id={`chain-select-label-${connectorId}`}>Select Chain</InputLabel>
                      <Select
                        labelId={`chain-select-label-${connectorId}`}
                        value={selectedChainId}
                        onChange={(e) => setSelectedChainId(e.target.value)}
                        disabled={isAddingChain}
                        label="Select Chain"
                      >
                        <MenuItem value="">
                          <em>Choose a network to add</em>
                        </MenuItem>
                        {chainConfigs
                          .filter((chain) => chain.chainType === ChainType.EVM && chain.id !== chainId)
                          .map((chain) => (
                            <MenuItem key={chain.id} value={chain.id}>
                              {chain.name} ({chain.id})
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                  </Box>
                  <Box>
                    <Button
                      fullWidth
                      variant="contained"
                      color="success"
                      startIcon={isAddingChain ? <CircularProgress size={20} color="inherit" /> : <AddCircle />}
                      onClick={handleAddChain}
                      disabled={isAddingChain || !selectedChainId}
                      sx={{ height: '100%' }}
                    >
                      {isAddingChain ? 'Adding...' : 'Add Chain'}
                    </Button>
                  </Box>
                </Box>
              </Paper>
            </Box>
          )}

          {addChainError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {addChainError}
            </Alert>
          )}
        </Box>

        {hasError && (
          <Box sx={{ mt: 3 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {connectionError || 'Failed to connect. Please try again.'}
            </Alert>
            <Button fullWidth variant="contained" color="primary" onClick={handleConnect} startIcon={<Refresh />}>
              Retry Connection
            </Button>
          </Box>
        )}
      </CardContent>

      <Divider />

      <Box sx={{ p: 2, bgcolor: 'background.default' }}>
        <Typography variant="caption" color="text.secondary">
          Connector ID: <span style={{ fontFamily: 'monospace' }}>{connectorId}</span>
        </Typography>
      </Box>
    </Card>
  );
};
