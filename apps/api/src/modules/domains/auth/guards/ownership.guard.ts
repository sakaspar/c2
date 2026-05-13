import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class OwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const params = request.params;

    if (!user) return false;

    // Admin can access everything
    if (user.roles?.includes('admin')) return true;

    // Check if the userId in the URL matches the authenticated user's ID
    if (params.userId && params.userId !== user.userId) {
      throw new ForbiddenException('You do not have permission to access or modify this resource');
    }

    return true;
  }
}
