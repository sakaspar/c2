import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { UserRecord } from '@bnpl/shared';
import { JsonDataLakeService } from '../../storage/json-data-lake.service';
import { GoogleSignupDto, LoginDto, SignupDto } from './dto';

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(private readonly storage: JsonDataLakeService, private readonly jwt: JwtService, private readonly config: ConfigService) {
    this.googleClient = new OAuth2Client(this.config.get<string>('GOOGLE_CLIENT_ID'));
  }

  async signup(dto: SignupDto) {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.storage.create<UserRecord>('users', {
      email: dto.email,
      phone: dto.phone,
      fullName: dto.fullName,
      passwordHash,
      authProvider: 'local',
      state: 'pending_kyc',
      kycState: 'not_started',
      roles: ['customer'],
      creditLimit: { amount: 100, currency: 'TND' },
      availableCredit: { amount: 100, currency: 'TND' },
      riskFlags: []
    });
    await this.storage.writeClientProfile(user.fullName, {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      state: user.state,
      kycState: user.kycState,
      creditLimit: user.creditLimit,
      availableCredit: user.availableCredit,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
    return this.issueTokens(user);
  }

  async login(dto: LoginDto) {
    const users = await this.storage.query<UserRecord>('users', { includeDeleted: false, pageSize: 10000 });
    const user = users.items.find((item) => item.email === dto.identifier || item.phone === dto.identifier);
    if (!user || user.authProvider === 'google' || !(await bcrypt.compare(dto.password, user.passwordHash))) throw new UnauthorizedException('Invalid credentials');
    if (user.state === 'blacklisted' || user.state === 'suspended') throw new UnauthorizedException('Account is not active');
    return this.issueTokens(user);
  }

  async googleSignup(dto: GoogleSignupDto) {
    const googleClientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!googleClientId) throw new BadRequestException('Google registration is not configured');
    const ticket = await this.googleClient.verifyIdToken({ idToken: dto.idToken, audience: googleClientId });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || !payload.name) throw new BadRequestException('Google account profile is incomplete');
    if (!payload.email_verified) throw new BadRequestException('Google email is not verified');
    const users = await this.storage.query<UserRecord>('users', { includeDeleted: false, pageSize: 10000 });
    const existing = users.items.find((item) => item.googleSub === payload.sub || item.email === payload.email);
    if (existing) return this.issueTokens(existing);
    const user = await this.storage.create<UserRecord>('users', {
      email: payload.email,
      fullName: payload.name,
      passwordHash: '',
      authProvider: 'google',
      googleSub: payload.sub,
      state: 'pending_kyc',
      kycState: 'not_started',
      roles: ['customer'],
      creditLimit: { amount: 100, currency: 'TND' },
      availableCredit: { amount: 100, currency: 'TND' },
      riskFlags: []
    });
    await this.storage.writeClientProfile(user.fullName, {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      state: user.state,
      kycState: user.kycState,
      authProvider: user.authProvider,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
    return this.issueTokens(user);
  }

  private issueTokens(user: UserRecord) {
    const payload = { sub: user.id, roles: user.roles, state: user.state };
    return {
      user: { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone, state: user.state, kycState: user.kycState, roles: user.roles },
      accessToken: this.jwt.sign(payload, { expiresIn: '15m' }),
      refreshToken: this.jwt.sign({ ...payload, tokenType: 'refresh' }, { expiresIn: '30d' })
    };
  }

}
