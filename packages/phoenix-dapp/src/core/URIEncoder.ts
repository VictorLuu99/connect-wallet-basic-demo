import { PhoenixURI, PROTOCOL_VERSION } from '../types/index.js';

/**
 * URI encoder/decoder for Phoenix connections
 * Handles encoding connection data to URI format and decoding back
 * Note: QR code generation should be handled by the application layer
 */
export class URIEncoder {
  /**
   * Encode connection data to URI string
   * Format: phoenix://connect?version=1&uuid=xxx&serverUrl=xxx&publicKey=xxx
   */
  static encodeURI(data: PhoenixURI): string {
    const params = new URLSearchParams({
      version: data.version,
      uuid: data.uuid,
      serverUrl: data.serverUrl,
      publicKey: data.publicKey,
    });
    return `phoenix://connect?${params.toString()}`;
  }

  /**
   * Decode URI string to connection data
   * Supports both old JSON format and new query parameter format
   */
  static decodeURI(uri: string): PhoenixURI {
    if (!uri.startsWith('phoenix:')) {
      throw new Error('Invalid Phoenix URI - must start with "phoenix:"');
    }

    // New format: phoenix://connect?version=1&uuid=xxx&serverUrl=xxx&publicKey=xxx
    if (uri.startsWith('phoenix://connect?')) {
      const url = new URL(uri);
      const params = url.searchParams;

      const version = params.get('version');
      const uuid = params.get('uuid');
      const serverUrl = params.get('serverUrl');
      const publicKey = params.get('publicKey');

      if (!version || !uuid || !serverUrl || !publicKey) {
        throw new Error('Invalid Phoenix URI - missing required parameters');
      }

      if (version !== PROTOCOL_VERSION) {
        throw new Error(`Unsupported protocol version: ${version}`);
      }

      return { version, uuid, serverUrl, publicKey };
    }

    // Legacy format: phoenix:{JSON} - for backward compatibility
    const jsonStr = uri.substring('phoenix:'.length);
    const data = JSON.parse(jsonStr);

    if (data.version !== PROTOCOL_VERSION) {
      throw new Error(`Unsupported protocol version: ${data.version}`);
    }

    return data as PhoenixURI;
  }
}
