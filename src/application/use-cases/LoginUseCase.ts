import type { IAuthRepository } from '@/src/core/ports/IAuthRepository';

export class LoginUseCase {
  constructor(private repo: IAuthRepository) {}

  execute(email: string, password: string): Promise<void> {
    return this.repo.login(email, password);
  }
}
