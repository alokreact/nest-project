"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitoAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt = require("jsonwebtoken");
const https = require("https");
let CognitoAuthGuard = class CognitoAuthGuard {
    constructor(config) {
        this.config = config;
        this.cachedKeys = {};
        const region = this.config.get('AWS_REGION');
        const userPoolId = this.config.get('COGNITO_USER_POOL_ID');
        this.jwksUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('Missing or invalid token');
        }
        const token = authHeader.split(' ')[1];
        try {
            await this.verifyToken(token);
            return true;
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired token');
        }
    }
    fetchJwks() {
        return new Promise((resolve, reject) => {
            https.get(this.jwksUrl, (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => resolve(JSON.parse(data)));
            }).on('error', reject);
        });
    }
    async getPublicKey(kid) {
        if (this.cachedKeys[kid])
            return this.cachedKeys[kid];
        const jwks = await this.fetchJwks();
        const key = jwks.keys.find((k) => k.kid === kid);
        if (!key)
            throw new Error('Key not found');
        const pubKey = this.jwkToPem(key);
        this.cachedKeys[kid] = pubKey;
        return pubKey;
    }
    jwkToPem(jwk) {
        const base64url = (b64) => Buffer.from(b64.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
        const n = base64url(jwk.n);
        const e = base64url(jwk.e);
        // Build DER-encoded RSA public key
        const encodeLength = (len) => {
            if (len < 128)
                return Buffer.from([len]);
            const bytes = [];
            let tmp = len;
            while (tmp > 0) {
                bytes.unshift(tmp & 0xff);
                tmp >>= 8;
            }
            return Buffer.from([0x80 | bytes.length, ...bytes]);
        };
        const encodeInteger = (buf) => {
            const needsPad = buf[0] & 0x80;
            const b = needsPad ? Buffer.concat([Buffer.from([0x00]), buf]) : buf;
            return Buffer.concat([Buffer.from([0x02]), encodeLength(b.length), b]);
        };
        const nDer = encodeInteger(n);
        const eDer = encodeInteger(e);
        const seq = Buffer.concat([nDer, eDer]);
        const seqDer = Buffer.concat([Buffer.from([0x30]), encodeLength(seq.length), seq]);
        const algorithmIdentifier = Buffer.from('300d06092a864886f70d0101010500', 'hex');
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
        const b64 = spki.toString('base64').match(/.{1,64}/g).join('\n');
        return `-----BEGIN PUBLIC KEY-----\n${b64}\n-----END PUBLIC KEY-----`;
    }
    async verifyToken(token) {
        const decoded = jwt.decode(token, { complete: true });
        if (!decoded || typeof decoded === 'string')
            throw new Error('Invalid token');
        const publicKey = await this.getPublicKey(decoded.header.kid);
        return new Promise((resolve, reject) => {
            jwt.verify(token, publicKey, { algorithms: ['RS256'] }, (err, payload) => {
                if (err)
                    return reject(err);
                resolve(payload);
            });
        });
    }
};
exports.CognitoAuthGuard = CognitoAuthGuard;
exports.CognitoAuthGuard = CognitoAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CognitoAuthGuard);
