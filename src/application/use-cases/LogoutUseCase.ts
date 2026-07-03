import type { IAuthRepository } from '@/src/core/ports/IAuthRepository';

export class LogoutUseCase {
  constructor(private repo: IAuthRepository) {}

  execute(): Promise<void> {
    return this.repo.logout();
  }
}
