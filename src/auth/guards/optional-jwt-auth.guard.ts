import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional JWT guard: attempt to authenticate, but do not block the request
 * if no token is provided or authentication fails. It will populate req.user
 * when a valid token is present.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    // Don't throw on auth errors; treat as anonymous
    if (err) return null;
    return user ?? null;
  }

  // Keep the default canActivate behavior so Passport will try to populate user
  canActivate(context: ExecutionContext) {
    return super.canActivate(context) as any;
  }
}
