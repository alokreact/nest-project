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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
let AuthService = class AuthService {
    constructor(config) {
        this.config = config;
        this.client = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({
            region: this.config.get('AWS_REGION'),
        });
        this.clientId = this.config.get('COGNITO_CLIENT_ID');
    }
    async register(dto) {
        try {
            await this.client.send(new client_cognito_identity_provider_1.SignUpCommand({
                ClientId: this.clientId,
                Username: dto.email,
                Password: dto.password,
                UserAttributes: [{ Name: 'name', Value: dto.name }],
            }));
            return { message: 'Registration successful. Check your email to confirm.' };
        }
        catch (err) {
            if (err.name === 'UsernameExistsException')
                throw new common_1.ConflictException('Email already registered');
            throw new common_1.BadRequestException(err.message);
        }
    }
    async confirmSignUp(dto) {
        try {
            await this.client.send(new client_cognito_identity_provider_1.ConfirmSignUpCommand({
                ClientId: this.clientId,
                Username: dto.email,
                ConfirmationCode: dto.code,
            }));
            return { message: 'Email confirmed successfully. You can now login.' };
        }
        catch (err) {
            throw new common_1.BadRequestException(err.message);
        }
    }
    async login(dto) {
        try {
            const result = await this.client.send(new client_cognito_identity_provider_1.InitiateAuthCommand({
                AuthFlow: client_cognito_identity_provider_1.AuthFlowType.USER_PASSWORD_AUTH,
                ClientId: this.clientId,
                AuthParameters: { USERNAME: dto.email, PASSWORD: dto.password },
            }));
            return result.AuthenticationResult;
        }
        catch (err) {
            if (err.name === 'NotAuthorizedException')
                throw new common_1.UnauthorizedException('Invalid credentials');
            throw new common_1.BadRequestException(err.message);
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AuthService);
