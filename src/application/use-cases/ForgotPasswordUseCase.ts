import type { IAuthRepository } from '@/src/core/ports/IAuthRepository';

export class ForgotPasswordUseCase {
  constructor(private repo: IAuthRepository) {}

  execute(email: string): Promise<void> {
    return this.repo.forgotPassword(email);
  }
}
