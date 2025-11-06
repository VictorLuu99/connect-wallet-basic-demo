import { PhoenixURI, PROTOCOL_VERSION } from '../types';

/**
 * QR code parser for Phoenix connections
 */
export class QRParser {
  /**
   * Parse Phoenix URI from QR code data
   */
  static parseURI(uri: string): PhoenixURI {
    if (!uri.startsWith('phoenix:')) {
      throw new Error('Invalid Phoenix URI - must start with "phoenix:"');
    }

    const jsonStr = uri.substring('phoenix:'.length);

    let data: any;
    try {
      data = JSON.parse(jsonStr);
      
    } catch (error) {
      throw new Error('Invalid Phoenix URI - malformed JSON');
    }

    // Validate required fields
    if (!data.version || !data.uuid || !data.serverUrl || !data.publicKey) {
      throw new Error('Invalid Phoenix URI - missing required fields');
    }

    // Validate version
    if (data.version !== PROTOCOL_VERSION) {
      throw new Error(`Unsupported protocol version: ${data.version}`);
    }

    return data as PhoenixURI;
  }

  /**
   * Validate Phoenix URI
   */
  static isValidURI(uri: string): boolean {
    try {
      this.parseURI(uri);
      return true;
    } catch {
      return false;
    }
  }
}
