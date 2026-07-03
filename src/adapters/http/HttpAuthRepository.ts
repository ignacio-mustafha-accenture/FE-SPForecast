import type { User } from '@/src/core/domain/user';
import type { IAuthRepository } from '@/src/core/ports/IAuthRepository';

import { createFetcher, type FetcherCtx } from './fetcher';
import { mapRawUser } from './mappers';
import type { RawUser } from './types';

export class HttpAuthRepository implements IAuthRepository {
  private fetch: ReturnType<typeof createFetcher>;

  constructor(ctx: FetcherCtx) {
    this.fetch = createFetcher(ctx);
  }

  async getMe(): Promise<User> {
    const raw = await this.fetch<RawUser>('/api/auth/me');
    return mapRawUser(raw);
  }

  async login(email: string, password: string): Promise<void> {
    await this.fetch<RawUser>('/api/auth/login', {
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
      body: JSON.stringify({ token, new_password: password }),
    });
  }
}
