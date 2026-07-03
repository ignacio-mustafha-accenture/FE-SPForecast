import type { User } from '@/src/core/domain/user';
import type { IAuthRepository } from '@/src/core/ports/IAuthRepository';

export class GetAuthUserUseCase {
  constructor(private repo: IAuthRepository) {}

  execute(): Promise<User> {
    return this.repo.getMe();
  }
}
