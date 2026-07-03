import type { User } from '@/src/core/domain/user';
import type { IAuthRepository } from '@/src/core/ports/IAuthRepository';

import { createFetcher, type FetcherCtx } from './fetcher';

export class HttpAuthRepository implements IAuthRepository {
  private fetch: ReturnType<typeof createFetcher>;

  constructor(ctx: FetcherCtx) {
    this.fetch = createFetcher(ctx);
  }

  async getMe(): Promise<User> {
    return this.fetch<User>('/api/auth/me');
  }

  async login(email: string, password: string): Promise<void> {
    return this.fetch<void>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout(): Promise<void> {
    return this.fetch<void>('/api/auth/logout', { method: 'POST' });
  }

  async forgotPassword(email: string): Promise<void> {
    return this.fetch<void>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    return this.fetch<void>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }
}
