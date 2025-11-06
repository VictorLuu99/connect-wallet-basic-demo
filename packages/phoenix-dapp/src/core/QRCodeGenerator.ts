import QRCode from 'qrcode';
import { PhoenixURI, PROTOCOL_VERSION } from '../types';

/**
 * QR Code generator for Phoenix connections
 */
export class QRCodeGenerator {
  /**
   * Generate QR code from connection data
   */
  static async generateQRCode(connectionData: PhoenixURI): Promise<string> {
    const uri = this.encodeURI(connectionData);
    return await QRCode.toDataURL(uri, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 400,
      margin: 1,
    });
  }

  /**
   * Encode connection data to URI string
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
