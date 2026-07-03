import { HttpAdminRepository } from '@/src/adapters/http/HttpAdminRepository';
import { HttpAuthRepository } from '@/src/adapters/http/HttpAuthRepository';
import { HttpEmployeeRepository } from '@/src/adapters/http/HttpEmployeeRepository';
import { HttpPPARepository } from '@/src/adapters/http/HttpPPARepository';
import { HttpStateRepository } from '@/src/adapters/http/HttpStateRepository';
import { HttpTicketRepository } from '@/src/adapters/http/HttpTicketRepository';

import { ApplyPPAUseCase } from './use-cases/ApplyPPAUseCase';
import { CreateTicketUseCase } from './use-cases/CreateTicketUseCase';
import { FetchStateUseCase } from './use-cases/FetchStateUseCase';
import { ForgotPasswordUseCase } from './use-cases/ForgotPasswordUseCase';
import { GetAuthUserUseCase } from './use-cases/GetAuthUserUseCase';
import { LoginUseCase } from './use-cases/LoginUseCase';
import { LogoutUseCase } from './use-cases/LogoutUseCase';
import { RecalculateUseCase } from './use-cases/RecalculateUseCase';
import { ResetPasswordUseCase } from './use-cases/ResetPasswordUseCase';
import { SyncUseCase } from './use-cases/SyncUseCase';
import { UpdateEmployeeUseCase } from './use-cases/UpdateEmployeeUseCase';
import { UpdateTicketUseCase } from './use-cases/UpdateTicketUseCase';

export interface AppContainer {
  fetchState: FetchStateUseCase;
  getAuthUser: GetAuthUserUseCase;
  login: LoginUseCase;
  logout: LogoutUseCase;
  forgotPassword: ForgotPasswordUseCase;
  resetPassword: ResetPasswordUseCase;
  createTicket: CreateTicketUseCase;
  updateTicket: UpdateTicketUseCase;
  updateEmployee: UpdateEmployeeUseCase;
  applyPPA: ApplyPPAUseCase;
  recalculate: RecalculateUseCase;
  sync: SyncUseCase;
}

export function createServerContainer(cookieHeader: string): AppContainer {
  const ctx = { cookieHeader };
  return {
    fetchState: new FetchStateUseCase(new HttpStateRepository(ctx)),
    getAuthUser: new GetAuthUserUseCase(new HttpAuthRepository(ctx)),
    login: new LoginUseCase(new HttpAuthRepository(ctx)),
    logout: new LogoutUseCase(new HttpAuthRepository(ctx)),
    forgotPassword: new ForgotPasswordUseCase(new HttpAuthRepository(ctx)),
    resetPassword: new ResetPasswordUseCase(new HttpAuthRepository(ctx)),
    createTicket: new CreateTicketUseCase(new HttpTicketRepository(ctx)),
    updateTicket: new UpdateTicketUseCase(new HttpTicketRepository(ctx)),
    updateEmployee: new UpdateEmployeeUseCase(new HttpEmployeeRepository(ctx)),
    applyPPA: new ApplyPPAUseCase(new HttpPPARepository(ctx)),
    recalculate: new RecalculateUseCase(new HttpAdminRepository(ctx)),
    sync: new SyncUseCase(new HttpAdminRepository(ctx)),
  };
}

let clientContainer: AppContainer | null = null;

export function getClientContainer(): AppContainer {
  if (!clientContainer) {
    const ctx = { credentials: 'include' as const };
    clientContainer = {
      fetchState: new FetchStateUseCase(new HttpStateRepository(ctx)),
      getAuthUser: new GetAuthUserUseCase(new HttpAuthRepository(ctx)),
      login: new LoginUseCase(new HttpAuthRepository(ctx)),
      logout: new LogoutUseCase(new HttpAuthRepository(ctx)),
      forgotPassword: new ForgotPasswordUseCase(new HttpAuthRepository(ctx)),
      resetPassword: new ResetPasswordUseCase(new HttpAuthRepository(ctx)),
      createTicket: new CreateTicketUseCase(new HttpTicketRepository(ctx)),
      updateTicket: new UpdateTicketUseCase(new HttpTicketRepository(ctx)),
      updateEmployee: new UpdateEmployeeUseCase(new HttpEmployeeRepository(ctx)),
      applyPPA: new ApplyPPAUseCase(new HttpPPARepository(ctx)),
      recalculate: new RecalculateUseCase(new HttpAdminRepository(ctx)),
      sync: new SyncUseCase(new HttpAdminRepository(ctx)),
    };
  }
  return clientContainer;
}
