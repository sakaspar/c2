import { IsEmail, IsOptional, IsPhoneNumber, IsString, Matches, MinLength } from 'class-validator';

export class SignupDto {
  @IsString() fullName!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsPhoneNumber() phone?: string;
  @IsString() @MinLength(8) password!: string;
}

export class LoginDto {
  @IsString() identifier!: string;
  @IsString() password!: string;
}

export class GoogleSignupDto {
  @IsString() idToken!: string;
}

export class SetUsernameDto {
  @IsString() @Matches(/^[a-z0-9][a-z0-9_-]{2,29}$/, { message: 'Username must be 3-30 chars, lowercase letters, digits, hyphens, underscores only' })
  username!: string;
}
