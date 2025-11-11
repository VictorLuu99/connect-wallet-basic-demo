declare global {
  interface Window {
    phantom?: {
      ethereum?: any;
      sui?: any;
    };
  }
}

export {};

