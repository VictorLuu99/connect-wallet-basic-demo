import { PhoenixURI, PROTOCOL_VERSION } from '../types/index.js';

/**
 * QR code parser for Phoenix connections
 */
export class QRParser {
  /**
   * Parse Phoenix URI from QR code data
   * Supports both new query parameter format and legacy JSON format
   */
  static parseURI(uri: string): PhoenixURI {
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
