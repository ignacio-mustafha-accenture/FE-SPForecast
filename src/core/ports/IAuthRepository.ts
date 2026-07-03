import type { User } from '../domain/user';

export interface IAuthRepository {
  getMe(): Promise<User>;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, password: string): Promise<void>;
}
