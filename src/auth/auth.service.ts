import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  ConfirmSignUpCommand,
  AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ConfirmDto } from './dto/confirm.dto';

@Injectable()
export class AuthService {
  private client: CognitoIdentityProviderClient;
  private clientId: string;

  constructor(private config: ConfigService) {
    this.client = new CognitoIdentityProviderClient({
      region: this.config.get('AWS_REGION'),
    });
    this.clientId = this.config.get('COGNITO_CLIENT_ID');
  }

  async register(dto: RegisterDto) {
    try {
      await this.client.send(new SignUpCommand({
        ClientId: this.clientId,
        Username: dto.email,
        Password: dto.password,
        UserAttributes: [{ Name: 'name', Value: dto.name }],
      }));
      return { message: 'Registration successful. Check your email to confirm.' };
    } catch (err) {
      if (err.name === 'UsernameExistsException') throw new ConflictException('Email already registered');
      throw new BadRequestException(err.message);
    }
  }

  async confirmSignUp(dto: ConfirmDto) {
    try {
      await this.client.send(new ConfirmSignUpCommand({
        ClientId: this.clientId,
        Username: dto.email,
        ConfirmationCode: dto.code,
      }));
      return { message: 'Email confirmed successfully. You can now login.' };
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async login(dto: LoginDto) {
    try {
      const result = await this.client.send(new InitiateAuthCommand({
        AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
        ClientId: this.clientId,
        AuthParameters: { USERNAME: dto.email, PASSWORD: dto.password },
      }));
      return result.AuthenticationResult;
    } catch (err) {
      if (err.name === 'NotAuthorizedException') throw new UnauthorizedException('Invalid credentials');
      throw new BadRequestException(err.message);
    }
  }
}
