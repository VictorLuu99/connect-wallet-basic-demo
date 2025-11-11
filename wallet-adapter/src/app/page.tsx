'use client';

import { SimpleWalletConnect } from './SimpleWalletConnect';
import { ClientWalletProvider } from './ClientWalletProvider';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LogLevel } from '@phoenix-wallet/core';

// Create a custom theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#3a86ff',
      light: '#75acff',
      dark: '#0062cc',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#8338ec',
      light: '#b367ff',
      dark: '#5600b9',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8f9fc',
      paper: '#ffffff',
    },
    success: {
      main: '#06d6a0',
      light: '#6effcf',
      dark: '#00a372',
    },
    error: {
      main: '#ef476f',
      light: '#ff7b9b',
      dark: '#b80046',
    },
    warning: {
      main: '#ffd166',
      light: '#ffff97',
      dark: '#c8a136',
    },
    info: {
      main: '#118ab2',
      light: '#5fbae5',
      dark: '#005e82',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h3: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage: 'linear-gradient(135deg, #f8f9fc 0%, #edf2fb 100%)',
          minHeight: '100vh',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
        },
        containedPrimary: {
          background: 'linear-gradient(45deg, #3a86ff 0%, #4e95ff 100%)',
          boxShadow: '0px 3px 6px rgba(58, 134, 255, 0.25)',
          '&:hover': {
            background: 'linear-gradient(45deg, #0062cc 0%, #3a86ff 100%)',
            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
          },
        },
        containedSecondary: {
          background: 'linear-gradient(45deg, #8338ec 0%, #9656ed 100%)',
          boxShadow: '0px 3px 6px rgba(131, 56, 236, 0.25)',
          '&:hover': {
            background: 'linear-gradient(45deg, #5600b9 0%, #8338ec 100%)',
            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            boxShadow: '0px 8px 30px rgba(0, 0, 0, 0.08)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        elevation1: {
          boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.05)',
        },
        elevation2: {
          boxShadow: '0px 4px 14px rgba(0, 0, 0, 0.08)',
        },
        elevation3: {
          boxShadow: '0px 6px 18px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            transition: 'border-color 0.2s, box-shadow 0.2s',
            '&:hover': {
              boxShadow: '0px 0px 0px 2px rgba(58, 134, 255, 0.1)',
            },
            '&.Mui-focused': {
              boxShadow: '0px 0px 0px 2px rgba(58, 134, 255, 0.2)',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.08)',
        },
      },
    },
  },
});

export default function Home() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      <ClientWalletProvider
        appId="cm664kkkp01ytuwuce4l8y9s2" // Replace with your Privy App ID
        // Enable both EVM and Solana support
        enableEvm={true}
        enableSolana={true}
        // Custom Privy configuration
        privyConfig={{
          appearance: {
            theme: 'light',
            accentColor: '#3a86ff',
            logo: '/phoenix-logo.png', // Add your logo
          },
          // Configure login methods
          loginMethods: ['email', 'wallet', 'google', 'twitter'],
          // Configure embedded wallets
          embeddedWallets: {
            createOnLogin: 'users-without-wallets',
          },
        }}
        // Custom Privy connector configuration for EVM
        evmPrivyConnectorConfig={{
          id: 'privy-evm',
          name: 'Phoenix Auth (EVM)',
          logo: 'https://ethglobal.b-cdn.net/organizations/ijybm/square-logo/default.png',
          dappMetadata: {
            name: 'Phoenix Wallet Demo',
            url: typeof window !== 'undefined' ? window.location.origin : 'https://localhost:3000',
            icon: '/phoenix-logo.png',
          },
        }}
        // Custom Privy connector configuration for Solana
        solanaPrivyConnectorConfig={{
          id: 'privy-solana',
          name: 'Phoenix Auth (Solana)',
          logo: 'https://ethglobal.b-cdn.net/organizations/ijybm/square-logo/default.png',
          dappMetadata: {
            name: 'Phoenix Wallet Demo - Solana',
            url: typeof window !== 'undefined' ? window.location.origin : 'https://localhost:3000',
            icon: '/phoenix-logo.png',
          },
          chainId: 'solana_devnet',
        }}
        loggerConfig={{
          enabled: false,
        }}
      >
        <SimpleWalletConnect />
      </ClientWalletProvider>
    </ThemeProvider>
  );
}
