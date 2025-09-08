import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';

import { SetMetadata } from '@nestjs/common';
import { jwtConstants } from './constants';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    //Access Token
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: jwtConstants.secret,
      });
      
      // Check if this is a service provider token
      if (payload.serviceProviderId) {
        const serviceProvider = await this.prisma.serviceProvider.findUnique({
          where: { id: payload.serviceProviderId },
        });
        if (!serviceProvider) throw new UnauthorizedException();
        
        request['user'] = {
          ...payload,
          id: payload.serviceProviderId,
          role: 'SERVICE_PROVIDER',
          type: 'serviceProvider'
        };
        return true;
      }
      
      // Regular user authentication
      request['user'] = payload;
      const user = await this.prisma.user.findUnique({
        where: { id: payload.id },
      });

      if (!user) throw new UnauthorizedException();

      //  Check for roles
      const requiredRoles = this.reflector.getAllAndOverride<string[]>(
        ROLES_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (requiredRoles && !requiredRoles.includes(user.role)) {
        throw new ForbiddenException('Access denied: insufficient role');
      }
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
