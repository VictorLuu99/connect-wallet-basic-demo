import { EvmTransaction } from '@phoenix-wallet/evm';
import { logger } from '@phoenix-wallet/core';

export const prepareTransactionRequest = async (transaction: EvmTransaction, wallet: any) => {
  const provider = await wallet.getEthereumProvider();

  try {
    // Get current account address
    const accounts = await provider.request({ method: 'eth_accounts' });
    const account = accounts[0];

    if (!account) {
      throw new Error('No account connected');
    }

    // Build base transaction object
    const baseTransaction = {
      from: account,
      to: transaction.to,
      value: `0x${parseInt(transaction.value || '0').toString(16)}`,
      data: transaction.data || '0x',
    };

    // Get nonce if not provided
    const nonce = await provider.request({
      method: 'eth_getTransactionCount',
      params: [account, 'pending'],
    });

    // Check if chain supports EIP-1559 (most modern chains do)
    let gasSettings: any = {};

    try {
      // Try to get fee history to determine if EIP-1559 is supported
      const feeHistory = await provider.request({
        method: 'eth_feeHistory',
        params: [1, 'latest', []],
      });

      if (feeHistory && feeHistory.baseFeePerGas) {
        // EIP-1559 supported - use maxFeePerGas and maxPriorityFeePerGas
        const baseFeePerGas = parseInt(feeHistory.baseFeePerGas[0], 16);

        // Get suggested gas fees
        let maxPriorityFeePerGas;
        try {
          maxPriorityFeePerGas = await provider.request({
            method: 'eth_maxPriorityFeePerGas',
            params: [],
          });
        } catch {
          // Fallback if maxPriorityFeePerGas is not supported
          maxPriorityFeePerGas = `0x${(2000000000).toString(16)}`; // 2 gwei
        }

        const maxPriorityFeePerGasInt = parseInt(maxPriorityFeePerGas, 16);
        const maxFeePerGas = baseFeePerGas * 2 + maxPriorityFeePerGasInt; // 2x base fee + priority fee

        gasSettings = {
          maxFeePerGas: `0x${maxFeePerGas.toString(16)}`,
          maxPriorityFeePerGas: maxPriorityFeePerGas,
          type: '0x2', // EIP-1559 transaction type
        };

        logger.debug('📊 Using EIP-1559 pricing:', {
          baseFeePerGas: `0x${baseFeePerGas.toString(16)}`,
          maxFeePerGas: gasSettings.maxFeePerGas,
          maxPriorityFeePerGas: gasSettings.maxPriorityFeePerGas,
        });
      } else {
        throw new Error('EIP-1559 not supported');
      }
    } catch {
      // Fallback to legacy gas pricing
      const gasPrice = await provider.request({
        method: 'eth_gasPrice',
        params: [],
      });

      gasSettings = {
        gasPrice: gasPrice,
        type: '0x0', // Legacy transaction type
      };

      logger.debug('📊 Using Legacy pricing:', { gasPrice });
    }

    // Estimate gas limit
    const transactionForEstimate = {
      ...baseTransaction,
      ...gasSettings,
      nonce: nonce,
    };

    let gasLimit;
    if (transaction.gasLimit) {
      gasLimit = `0x${parseInt(transaction.gasLimit).toString(16)}`;
      logger.debug('⛽ Using provided gas limit:', gasLimit);
    } else {
      try {
        const estimatedGas = await provider.request({
          method: 'eth_estimateGas',
          params: [transactionForEstimate],
        });

        // Add 10% buffer to estimated gas
        const gasLimitInt = Math.floor(parseInt(estimatedGas, 16) * 1.1);
        gasLimit = `0x${gasLimitInt.toString(16)}`;

        logger.debug('⛽ Estimated gas with 10% buffer:', {
          estimated: estimatedGas,
          withBuffer: gasLimit,
        });
      } catch (gasEstimateError) {
        logger.warn('⚠️ Gas estimation failed, using default:', gasEstimateError);
        gasLimit = '0x5208'; // 21000 - minimum gas for transfer
      }
    }

    // Build final prepared transaction
    const preparedTransaction: any = {
      ...baseTransaction,
      ...gasSettings,
      nonce: nonce,
      gas: gasLimit,
      gasLimit: gasLimit, // Some wallets expect gasLimit instead of gas
    };

    // Get chain ID for transaction validation
    const chainId = await provider.request({
      method: 'eth_chainId',
      params: [],
    });

    preparedTransaction.chainId = chainId;

    logger.debug('✅ Transaction prepared successfully:', preparedTransaction);

    return preparedTransaction;
  } catch (error) {
    logger.error('❌ Failed to prepare transaction:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to prepare transaction: ${errorMessage}`);
  }
};
