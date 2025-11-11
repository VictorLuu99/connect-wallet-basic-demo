'use client';

import { ConnectorItem } from './ConnectorItem';
import { useWalletConnectors } from '@phoenix-wallet/core';
import { Container, Typography, Box, Grid, Paper } from '@mui/material';

export const WalletDemo = () => {
  const { connectors } = useWalletConnectors();

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper elevation={0} sx={{ p: 4, mb: 4, bgcolor: 'background.paper', borderRadius: 3 }}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold" color="primary">
          🔥 Phoenix Wallet - Multi-Chain Demo
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          Universal wallet adapter supporting EVM, Solana, Aptos, and Sui
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Connect to any wallet with a single unified interface. Each connector automatically handles
          chain-specific logic.
        </Typography>
      </Paper>

      <Grid container spacing={3}>
        {connectors.map((connector) => (
          <Grid size={{ xs: 12, md: 6, lg: 4 }} key={connector.id}>
            <ConnectorItem connectorId={connector.id} />
          </Grid>
        ))}
      </Grid>

      {connectors.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No connectors available. Please check your configuration.
          </Typography>
        </Box>
      )}
    </Container>
  );
};

