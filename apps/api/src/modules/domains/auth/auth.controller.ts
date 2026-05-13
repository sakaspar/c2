import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { GoogleSignupDto, LoginDto, SetUsernameDto, SignupDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OwnershipGuard } from './guards/ownership.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.auth.signup(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('google')
  google(@Body() dto: GoogleSignupDto) {
    return this.auth.googleSignup(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Request() req: any) {
    return this.auth.getMe(req.user.userId);
  }

  @Patch(':userId/username')
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  setUsername(@Param('userId') userId: string, @Body() dto: SetUsernameDto) {
    return this.auth.setUsername(userId, dto);
  }
}
