/**
 * Transaction building utilities
 */

import { ethToWei, validateTransaction } from './validation.js';

/**
 * Build transaction object based on type and form data
 */
export const buildTransaction = (type, formData) => {
  const requestId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const baseTransaction = {
    transactionType: type,
    requestId,
    chainId: parseInt(formData.chainId || '1', 10),
    timestamp: Date.now()
  };

  switch (type) {
    case 'nativeTransfer':
      return {
        ...baseTransaction,
        to: formData.to?.trim(),
        value: formData.value || ethToWei(formData.amount || '0'),
        gasPrice: formData.gasPrice || undefined,
        gasLimit: formData.gasLimit || undefined,
        nonce: formData.nonce ? parseInt(formData.nonce, 10) : undefined,
        maxFeePerGas: formData.maxFeePerGas || undefined,
        maxPriorityFeePerGas: formData.maxPriorityFeePerGas || undefined
      };

    case 'erc20Transfer':
      return {
        ...baseTransaction,
        tokenAddress: formData.tokenAddress?.trim(),
        tokenSymbol: formData.tokenSymbol?.trim() || undefined,
        tokenDecimals: formData.tokenDecimals ? parseInt(formData.tokenDecimals, 10) : undefined,
        recipient: formData.recipient?.trim(),
        amount: formData.amount?.trim(),
        gasPrice: formData.gasPrice || undefined,
        gasLimit: formData.gasLimit || undefined,
        nonce: formData.nonce ? parseInt(formData.nonce, 10) : undefined
      };

    case 'erc721Transfer':
      return {
        ...baseTransaction,
        tokenAddress: formData.tokenAddress?.trim(),
        recipient: formData.recipient?.trim(),
        tokenId: formData.tokenId?.trim(),
        from: formData.from?.trim() || undefined,
        gasPrice: formData.gasPrice || undefined,
        gasLimit: formData.gasLimit || undefined,
        nonce: formData.nonce ? parseInt(formData.nonce, 10) : undefined
      };

    case 'tokenApproval':
      return {
        ...baseTransaction,
        tokenAddress: formData.tokenAddress?.trim(),
        tokenSymbol: formData.tokenSymbol?.trim() || undefined,
        tokenDecimals: formData.tokenDecimals ? parseInt(formData.tokenDecimals, 10) : undefined,
        spender: formData.spender?.trim(),
        amount: formData.amount?.trim() || '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        gasPrice: formData.gasPrice || undefined,
        gasLimit: formData.gasLimit || undefined,
        nonce: formData.nonce ? parseInt(formData.nonce, 10) : undefined
      };

    case 'contractCall':
      return {
        ...baseTransaction,
        contractAddress: formData.contractAddress?.trim(),
        functionName: formData.functionName?.trim() || undefined,
        data: formData.data?.trim(),
        value: formData.value || undefined,
        gasPrice: formData.gasPrice || undefined,
        gasLimit: formData.gasLimit || undefined,
        nonce: formData.nonce ? parseInt(formData.nonce, 10) : undefined,
        maxFeePerGas: formData.maxFeePerGas || undefined,
        maxPriorityFeePerGas: formData.maxPriorityFeePerGas || undefined
      };

    default:
      throw new Error(`Unknown transaction type: ${type}`);
  }
};

/**
 * Validate and build transaction
 */
export const validateAndBuildTransaction = (type, formData) => {
  const transaction = buildTransaction(type, formData);
  const errors = validateTransaction(transaction);
  
  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }
  
  return transaction;
};

