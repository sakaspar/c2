import { IsEmail, IsOptional, IsPhoneNumber, IsString, MinLength } from 'class-validator';

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
