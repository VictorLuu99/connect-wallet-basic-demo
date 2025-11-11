import { SolanaContract } from '@phoenix-wallet/solana';
import { ITokenContract, ResponseTransacton } from './TokenContract';
import { Connection, PublicKey, VersionedTransaction, TransactionMessage } from '@solana/web3.js';
import {
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  getMint,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from '@solana/spl-token';

class TokenSdk {
  private readonly _connection: Connection;
  constructor(
    _connection: Connection,
    private readonly tokenAddress: string
  ) {
    this._connection = _connection;
  }

  async getDecimals(): Promise<number> {
    try {
      const mintPublicKey = new PublicKey(this.tokenAddress);
      const mintInfo = await getMint(this._connection, mintPublicKey);
      return mintInfo.decimals;
    } catch (error) {
      console.error('Error getting token decimals:', error);
      throw error;
    }
  }

  async getSymbol(): Promise<string> {
    try {
      // Note: SPL tokens don't have on-chain symbol info
      // To get the symbol, we'd need to query a token metadata program or API
      // This is a placeholder - in a real implementation, you'd query
      // the Metaplex token metadata program or a token registry API
      return 'Unknown';
    } catch (error) {
      console.error('Error getting token symbol:', error);
      throw error;
    }
  }

  async getTotalSupply(): Promise<string> {
    try {
      const mintPublicKey = new PublicKey(this.tokenAddress);
      const mintInfo = await getMint(this._connection, mintPublicKey);
      return mintInfo.supply.toString();
    } catch (error) {
      console.error('Error getting token total supply:', error);
      throw error;
    }
  }

  async getBalance(address: string): Promise<string> {
    try {
      const tokenAccount = await getAssociatedTokenAddressSync(
        new PublicKey(this.tokenAddress),
        new PublicKey(address)
      );
      const tokenAccountBalance = await this._connection.getTokenAccountBalance(tokenAccount);
      return tokenAccountBalance.value.amount;
    } catch (error) {
      console.error('Error getting token balance:', error);
      throw error;
    }
  }

  async transfer(
    from: PublicKey,
    to: PublicKey,
    amount: string
  ): Promise<{ transaction: VersionedTransaction; blockhash: string; lastValidBlockHeight: number }> {
    try {
      const mintPublicKey = new PublicKey(this.tokenAddress);

      // Get the sender's associated token account
      const fromTokenAccount = getAssociatedTokenAddressSync(mintPublicKey, from);

      // Get the recipient's associated token account
      const toTokenAccount = getAssociatedTokenAddressSync(mintPublicKey, to);

      // Prepare instructions array
      const instructions = [];

      // Check if the recipient's token account exists
      try {
        await getAccount(this._connection, toTokenAccount);
      } catch (error) {
        // If the account doesn't exist, add instruction to create it
        console.log("Recipient token account doesn't exist, creating it");
        const createAccountInstruction = createAssociatedTokenAccountInstruction(
          from, // payer
          toTokenAccount,
          to,
          mintPublicKey
        );
        instructions.push(createAccountInstruction);
      }

      // Create the transfer instruction
      const transferInstruction = createTransferInstruction(fromTokenAccount, toTokenAccount, from, BigInt(amount));

      // Add transfer instruction
      instructions.push(transferInstruction);

      // Get the latest blockhash
      const blockhash = await this._connection.getLatestBlockhash();

      // Create a new transaction message
      const messageV0 = new TransactionMessage({
        payerKey: from,
        recentBlockhash: blockhash.blockhash,
        instructions: instructions,
      }).compileToV0Message();

      // Create a versioned transaction
      const transaction = new VersionedTransaction(messageV0);

      return {
        transaction,
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
      };
    } catch (error) {
      console.error('Error creating transfer transaction:', error);
      throw error;
    }
  }
}

export class SolanaTokenContract extends SolanaContract<TokenSdk> implements ITokenContract {
  constructor(connection: Connection, tokenAddress: string) {
    const sdk = new TokenSdk(connection, tokenAddress);
    super(connection, tokenAddress, sdk);
  }
  getAllowance(address: string, spender: string): Promise<string> {
    throw new Error('Method not supported.');
  }
  async getDecimals(): Promise<number> {
    return this.sdk.getDecimals();
  }
  async getSymbol(): Promise<string> {
    return this.sdk.getSymbol();
  }
  async getTotalSupply(): Promise<string> {
    return this.sdk.getTotalSupply();
  }

  async getBalance(address: string): Promise<{ amount: string; uiAmount: string }> {
    const amount = await this.sdk.getBalance(address);
    const decimals = await this.getDecimals();
    const uiAmount = (parseInt(amount) / Math.pow(10, decimals)).toString();
    return { amount, uiAmount };
  }

  async transfer(to: string, amount: string): Promise<ResponseTransacton> {
    if (!this.wallet) {
      throw new Error('Wallet not found');
    }
    const fromPublicKey = new PublicKey(this.wallet.address);
    const toPublicKey = new PublicKey(to);
    const transaction = await this.sdk.transfer(fromPublicKey, toPublicKey, amount);
    const txHash = await this.signAndSendTransaction(transaction.transaction);
    return {
      txHash,
      wait: () => {
        return this.waitTransaction(txHash, transaction.blockhash, transaction.lastValidBlockHeight);
      },
    };
  }

  async signAndSendTransaction(transaction: VersionedTransaction): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not found');
    }
    const signedTransaction = await this.wallet.signTransaction(transaction);
    const txHash = await this.wallet.sendRawTransaction(signedTransaction);
    return txHash;
  }
}
