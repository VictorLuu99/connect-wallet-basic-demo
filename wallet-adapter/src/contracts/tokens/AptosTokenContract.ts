import { ITokenContract, ResponseTransacton } from './TokenContract';
import { Aptos } from '@aptos-labs/ts-sdk';
import { AptosContract } from '@phoenix-wallet/aptos';
import { AptosWallet } from '@phoenix-wallet/aptos';

class TokenSdk {
  private readonly aptosClient: Aptos;
  private readonly tokenAddress: string;
  private metadata: {
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: string;
  } | null;
  constructor(aptosClient: Aptos, tokenAddress: string) {
    this.tokenAddress = tokenAddress;
    this.aptosClient = aptosClient;
    this.metadata = null;
  }

  private async getMetadata(): Promise<{
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: string;
  }> {
    const result = await this.aptosClient.getFungibleAssetMetadataByAssetType({
      assetType: this.tokenAddress,
    });

    console.log('getMetadata', result);

    if (!result) {
      throw new Error('Metadata not found for ' + this.tokenAddress);
    }
    this.metadata = {
      name: result?.name || '',
      symbol: result?.symbol || '',
      decimals: result?.decimals || 0,
      totalSupply: result?.supply_v2 || '0',
    };

    return {
      name: result?.name || '',
      symbol: result?.symbol || '',
      decimals: result?.decimals || 0,
      totalSupply: result?.supply_v2 || '0',
    };
  }

  async getDecimals(): Promise<number> {
    if (!this.metadata) {
      this.metadata = await this.getMetadata();
    }
    return this.metadata.decimals;
  }

  async getName(): Promise<string> {
    if (!this.metadata) {
      this.metadata = await this.getMetadata();
    }
    return this.metadata.name;
  }

  async getSymbol(): Promise<string> {
    if (!this.metadata) {
      this.metadata = await this.getMetadata();
    }
    return this.metadata.symbol;
  }

  async getTotalSupply(): Promise<string> {
    if (!this.metadata) {
      this.metadata = await this.getMetadata();
    }
    if (this.metadata.totalSupply !== '0') {
      console.log('this.metadata.totalSupply', this.metadata.totalSupply);
      return this.metadata.totalSupply;
    }

    const [moduleAddress] = this.tokenAddress.split('::');
    console.log('moduleAddress', moduleAddress);

    const resource = (
      await this.aptosClient.getAccountResource({
        accountAddress: moduleAddress,
        resourceType: `0x1::coin::CoinInfo<${this.tokenAddress}>`,
      })
    ).supply.vec[0].integer.vec[0].value;

    console.log('resource', resource);

    // const result = (
    //   await this.aptosClient.view<[{ vec: [string] }]>({
    //     payload: {
    //       function: '0x1::coin::supply',
    //       typeArguments: [this.tokenAddress as `${string}::${string}::${string}`],
    //     },
    //   })
    // )[0]?.vec[0];

    console.log('result', resource);

    return (parseInt(resource) / Math.pow(10, await this.getDecimals())).toString() || '0';
  }

  async getBalance(owner: string): Promise<{ amount: string; uiAmount: string }> {
    const result = await this.aptosClient.getCurrentFungibleAssetBalances({
      options: {
        where: {
          owner_address: {
            _eq: owner,
          },
          asset_type: {
            _eq: this.tokenAddress,
          },
        },
      },
    });

    return {
      amount: result[0]?.amount || '0',
      uiAmount: (parseInt(result[0]?.amount) / Math.pow(10, await this.getDecimals())).toString(),
    };
  }
}

export class AptosTokenContract extends AptosContract<TokenSdk> implements ITokenContract {
  private tokenAddress: string;
  constructor(aptosClient: Aptos, tokenAddress: string) {
    const sdk = new TokenSdk(aptosClient, tokenAddress);
    super(aptosClient, tokenAddress, sdk);
    this.tokenAddress = tokenAddress;
  }

  getAllowance(): Promise<string> {
    throw new Error('Method not supported.');
  }

  async getDecimals(): Promise<number> {
    return this.sdk.getDecimals();
  }

  async getSymbol(): Promise<string> {
    return this.sdk.getSymbol();
  }

  async getTotalSupply(): Promise<string> {
    const result = await this.sdk.getTotalSupply();
    return result;
  }

  async getBalance(address: string): Promise<{ amount: string; uiAmount: string }> {
    const amount = await this.sdk.getBalance(address);
    const decimals = await this.getDecimals();
    const uiAmount = (parseInt(amount.amount) / Math.pow(10, decimals)).toString();

    return {
      amount: amount.amount,
      uiAmount,
    };
  }

  async transfer(to: string, amount: string): Promise<ResponseTransacton> {
    try {
      if (!this.wallet) {
        throw new Error('Wallet not found');
      }

      const txHash = await this.wallet.sendTransaction({
        payload: {
          function: '0x1::coin::transfer',
          typeArguments: [this.tokenAddress],
          functionArguments: [to, amount],
        },
      });

      return {
        txHash: txHash,
        wait: () => {
          return this.waitTransaction(txHash);
        },
      };
    } catch (error) {
      throw error;
    }
  }
}
