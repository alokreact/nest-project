import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as https from 'https';

@Injectable()
export class CognitoAuthGuard implements CanActivate {
  private jwksUrl: string;
  private cachedKeys: Record<string, string> = {};

  constructor(private config: ConfigService) {
    const region = this.config.get('AWS_REGION');
    const userPoolId = this.config.get('COGNITO_USER_POOL_ID');
    this.jwksUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid token');
    }

    const token = authHeader.split(' ')[1];

    try {
      await this.verifyToken(token);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private fetchJwks(): Promise<any> {
    return new Promise((resolve, reject) => {
      https.get(this.jwksUrl, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });
  }

  private async getPublicKey(kid: string): Promise<string> {
    if (this.cachedKeys[kid]) return this.cachedKeys[kid];

    const jwks = await this.fetchJwks();
    const key = jwks.keys.find((k: any) => k.kid === kid);
    if (!key) throw new Error('Key not found');

    const pubKey = this.jwkToPem(key);
    this.cachedKeys[kid] = pubKey;
    return pubKey;
  }

  private jwkToPem(jwk: any): string {
    const base64url = (b64: string) =>
      Buffer.from(b64.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

    const n = base64url(jwk.n);
    const e = base64url(jwk.e);

    // Build DER-encoded RSA public key
    const encodeLength = (len: number) => {
      if (len < 128) return Buffer.from([len]);
      const bytes = [];
      let tmp = len;
      while (tmp > 0) { bytes.unshift(tmp & 0xff); tmp >>= 8; }
      return Buffer.from([0x80 | bytes.length, ...bytes]);
    };

    const encodeInteger = (buf: Buffer) => {
      const needsPad = buf[0] & 0x80;
      const b = needsPad ? Buffer.concat([Buffer.from([0x00]), buf]) : buf;
      return Buffer.concat([Buffer.from([0x02]), encodeLength(b.length), b]);
    };

    const nDer = encodeInteger(n);
    const eDer = encodeInteger(e);
    const seq = Buffer.concat([nDer, eDer]);
    const seqDer = Buffer.concat([Buffer.from([0x30]), encodeLength(seq.length), seq]);

    const algorithmIdentifier = Buffer.from(
      '300d06092a864886f70d0101010500', 'hex'
    );
    const bitString = Buffer.concat([
      Buffer.from([0x03]),
      encodeLength(seqDer.length + 1),
      Buffer.from([0x00]),
      seqDer,
    ]);
    const spki = Buffer.concat([
      Buffer.from([0x30]),
      encodeLength(algorithmIdentifier.length + bitString.length),
      algorithmIdentifier,
      bitString,
    ]);

    const b64 = spki.toString('base64').match(/.{1,64}/g)!.join('\n');
    return `-----BEGIN PUBLIC KEY-----\n${b64}\n-----END PUBLIC KEY-----`;
  }

  private async verifyToken(token: string): Promise<any> {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string') throw new Error('Invalid token');

    const publicKey = await this.getPublicKey(decoded.header.kid);

    return new Promise((resolve, reject) => {
      jwt.verify(token, publicKey, { algorithms: ['RS256'] }, (err, payload) => {
        if (err) return reject(err);
        resolve(payload);
      });
    });
  }
}
