import { PhoenixURI, PROTOCOL_VERSION } from '../types';

/**
 * URI encoder/decoder for Phoenix connections
 * Handles encoding connection data to URI format and decoding back
 * Note: QR code generation should be handled by the application layer
 */
export class URIEncoder {
  /**
   * Encode connection data to URI string
   * Format: phoenix:{JSON}
   */
  static encodeURI(data: PhoenixURI): string {
    const payload = {
      version: data.version,
      uuid: data.uuid,
      serverUrl: data.serverUrl,
      publicKey: data.publicKey,
    };
    return `phoenix:${JSON.stringify(payload)}`;
  }

  /**
   * Decode URI string to connection data
   */
  static decodeURI(uri: string): PhoenixURI {
    if (!uri.startsWith('phoenix:')) {
      throw new Error('Invalid Phoenix URI - must start with "phoenix:"');
    }

    const jsonStr = uri.substring('phoenix:'.length);
    const data = JSON.parse(jsonStr);

    if (data.version !== PROTOCOL_VERSION) {
      throw new Error(`Unsupported protocol version: ${data.version}`);
    }

    return data as PhoenixURI;
  }
}
