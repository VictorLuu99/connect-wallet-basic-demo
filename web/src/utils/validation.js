/**
 * Client-side validation utilities
 */

/**
 * Validate Ethereum address format
 */
export const isValidAddress = (address) => {
  if (!address || typeof address !== 'string') return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Validate hex string format
 */
export const isValidHex = (hex) => {
  if (!hex || typeof hex !== 'string') return false;
  return /^0x[a-fA-F0-9]+$/.test(hex);
};

/**
 * Validate number string (positive)
 */
export const isValidNumber = (num) => {
  if (!num || typeof num !== 'string') return false;
  const parsed = parseFloat(num);
  return !isNaN(parsed) && parsed > 0;
};

/**
 * Validate chain ID
 */
export const isValidChainId = (chainId) => {
  const id = typeof chainId === 'string' ? parseInt(chainId, 10) : chainId;
  return !isNaN(id) && id > 0 && id <= 999999;
};

/**
 * Validate transaction type
 */
export const isValidTransactionType = (type) => {
  const validTypes = [
    'nativeTransfer',
    'erc20Transfer',
    'erc721Transfer',
    'tokenApproval',
    'contractCall'
  ];
  return validTypes.includes(type);
};

/**
 * Convert ETH to Wei (simple conversion for demo)
 */
export const ethToWei = (eth) => {
  if (!eth || typeof eth !== 'string') return '0';
  const ethNum = parseFloat(eth);
  if (isNaN(ethNum) || ethNum < 0) return '0';
  // 1 ETH = 10^18 Wei
  const wei = BigInt(Math.floor(ethNum * 1e18));
  return wei.toString();
};

/**
 * Validate transaction based on type
 */
export const validateTransaction = (tx) => {
  const errors = [];

  if (!tx.transactionType || !isValidTransactionType(tx.transactionType)) {
    errors.push('Invalid transaction type');
    return errors;
  }

  if (!tx.chainId || !isValidChainId(tx.chainId)) {
    errors.push('Invalid chain ID');
  }

  switch (tx.transactionType) {
    case 'nativeTransfer':
      if (!tx.to || !isValidAddress(tx.to)) {
        errors.push('Invalid recipient address');
      }
      if (!tx.value || tx.value === '0') {
        errors.push('Invalid amount');
      }
      break;

    case 'erc20Transfer':
      if (!tx.tokenAddress || !isValidAddress(tx.tokenAddress)) {
        errors.push('Invalid token address');
      }
      if (!tx.recipient || !isValidAddress(tx.recipient)) {
        errors.push('Invalid recipient address');
      }
      if (!tx.amount || tx.amount === '0') {
        errors.push('Invalid token amount');
      }
      break;

    case 'erc721Transfer':
      if (!tx.tokenAddress || !isValidAddress(tx.tokenAddress)) {
        errors.push('Invalid token address');
      }
      if (!tx.recipient || !isValidAddress(tx.recipient)) {
        errors.push('Invalid recipient address');
      }
      if (!tx.tokenId || tx.tokenId.trim() === '') {
        errors.push('Invalid token ID');
      }
      break;

    case 'tokenApproval':
      if (!tx.tokenAddress || !isValidAddress(tx.tokenAddress)) {
        errors.push('Invalid token address');
      }
      if (!tx.spender || !isValidAddress(tx.spender)) {
        errors.push('Invalid spender address');
      }
      if (!tx.amount || tx.amount === '0') {
        errors.push('Invalid approval amount');
      }
      break;

    case 'contractCall':
      if (!tx.contractAddress || !isValidAddress(tx.contractAddress)) {
        errors.push('Invalid contract address');
      }
      if (!tx.data || !isValidHex(tx.data)) {
        errors.push('Invalid contract call data');
      }
      break;
  }

  // Validate optional fields
  if (tx.gasPrice && !isValidNumber(tx.gasPrice)) {
    errors.push('Invalid gas price');
  }
  if (tx.gasLimit && !isValidNumber(tx.gasLimit)) {
    errors.push('Invalid gas limit');
  }
  if (tx.nonce !== undefined && (isNaN(parseInt(tx.nonce)) || parseInt(tx.nonce) < 0)) {
    errors.push('Invalid nonce');
  }

  return errors;
};

