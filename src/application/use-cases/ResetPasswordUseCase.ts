import type { IAuthRepository } from '@/src/core/ports/IAuthRepository';

export class ResetPasswordUseCase {
  constructor(private repo: IAuthRepository) {}

  execute(token: string, password: string): Promise<void> {
    return this.repo.resetPassword(token, password);
  }
}
