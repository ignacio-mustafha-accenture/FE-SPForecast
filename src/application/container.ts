import { HttpAdminRepository } from '@/src/adapters/http/HttpAdminRepository';
import { HttpAuthRepository } from '@/src/adapters/http/HttpAuthRepository';
import { HttpEmployeeRepository } from '@/src/adapters/http/HttpEmployeeRepository';
import { HttpPPARepository } from '@/src/adapters/http/HttpPPARepository';
import { HttpStateRepository } from '@/src/adapters/http/HttpStateRepository';
import { HttpTicketRepository } from '@/src/adapters/http/HttpTicketRepository';

import { ApplyPPAUseCase } from './use-cases/ApplyPPAUseCase';
import { ApproveTicketUseCase } from './use-cases/ApproveTicketUseCase';
import { AssignEidUseCase } from './use-cases/AssignEidUseCase';
import { RejectTicketUseCase } from './use-cases/RejectTicketUseCase';
import { CreateTicketUseCase } from './use-cases/CreateTicketUseCase';
import { FetchStateUseCase } from './use-cases/FetchStateUseCase';
import { ForgotPasswordUseCase } from './use-cases/ForgotPasswordUseCase';
import { GetAuthUserUseCase } from './use-cases/GetAuthUserUseCase';
import { GetTicketByIdUseCase } from './use-cases/GetTicketByIdUseCase';
import { ListEmployeesUseCase } from './use-cases/ListEmployeesUseCase';
import { ListPPAUseCase } from './use-cases/ListPPAUseCase';
import { ListTicketsUseCase } from './use-cases/ListTicketsUseCase';
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
  getTicketById: GetTicketByIdUseCase;
  login: LoginUseCase;
  logout: LogoutUseCase;
  forgotPassword: ForgotPasswordUseCase;
  resetPassword: ResetPasswordUseCase;
  listEmployees: ListEmployeesUseCase;
  listTickets: ListTicketsUseCase;
  listPPA: ListPPAUseCase;
  createTicket: CreateTicketUseCase;
  updateTicket: UpdateTicketUseCase;
  approveTicket: ApproveTicketUseCase;
  rejectTicket: RejectTicketUseCase;
  assignEid: AssignEidUseCase;
  updateEmployee: UpdateEmployeeUseCase;
  applyPPA: ApplyPPAUseCase;
  recalculate: RecalculateUseCase;
  sync: SyncUseCase;
}

export function createServerContainer(cookieHeader: string): AppContainer {
  const ctx = { cookieHeader };
  const employeeRepo = new HttpEmployeeRepository(ctx);
  const ticketRepo = new HttpTicketRepository(ctx);
  const ppaRepo = new HttpPPARepository(ctx);
  return {
    fetchState: new FetchStateUseCase(new HttpStateRepository(ctx)),
    getAuthUser: new GetAuthUserUseCase(new HttpAuthRepository(ctx)),
    getTicketById: new GetTicketByIdUseCase(ticketRepo),
    login: new LoginUseCase(new HttpAuthRepository(ctx)),
    logout: new LogoutUseCase(new HttpAuthRepository(ctx)),
    forgotPassword: new ForgotPasswordUseCase(new HttpAuthRepository(ctx)),
    resetPassword: new ResetPasswordUseCase(new HttpAuthRepository(ctx)),
    listEmployees: new ListEmployeesUseCase(employeeRepo),
    listTickets: new ListTicketsUseCase(ticketRepo),
    listPPA: new ListPPAUseCase(ppaRepo),
    createTicket: new CreateTicketUseCase(ticketRepo),
    updateTicket: new UpdateTicketUseCase(ticketRepo),
    approveTicket: new ApproveTicketUseCase(ticketRepo),
    rejectTicket: new RejectTicketUseCase(ticketRepo),
    assignEid: new AssignEidUseCase(ticketRepo),
    updateEmployee: new UpdateEmployeeUseCase(employeeRepo),
    applyPPA: new ApplyPPAUseCase(ppaRepo),
    recalculate: new RecalculateUseCase(new HttpAdminRepository(ctx)),
    sync: new SyncUseCase(new HttpAdminRepository(ctx)),
  };
}

let clientContainer: AppContainer | null = null;

export function getClientContainer(): AppContainer {
  if (!clientContainer) {
    const ctx = { credentials: 'include' as const };
    const employeeRepo = new HttpEmployeeRepository(ctx);
    const ticketRepo = new HttpTicketRepository(ctx);
    const ppaRepo = new HttpPPARepository(ctx);
    clientContainer = {
      fetchState: new FetchStateUseCase(new HttpStateRepository(ctx)),
      getAuthUser: new GetAuthUserUseCase(new HttpAuthRepository(ctx)),
      getTicketById: new GetTicketByIdUseCase(ticketRepo),
      login: new LoginUseCase(new HttpAuthRepository(ctx)),
      logout: new LogoutUseCase(new HttpAuthRepository(ctx)),
      forgotPassword: new ForgotPasswordUseCase(new HttpAuthRepository(ctx)),
      resetPassword: new ResetPasswordUseCase(new HttpAuthRepository(ctx)),
      listEmployees: new ListEmployeesUseCase(employeeRepo),
      listTickets: new ListTicketsUseCase(ticketRepo),
      listPPA: new ListPPAUseCase(ppaRepo),
      createTicket: new CreateTicketUseCase(ticketRepo),
      updateTicket: new UpdateTicketUseCase(ticketRepo),
      approveTicket: new ApproveTicketUseCase(ticketRepo),
      rejectTicket: new RejectTicketUseCase(ticketRepo),
      assignEid: new AssignEidUseCase(ticketRepo),
      updateEmployee: new UpdateEmployeeUseCase(employeeRepo),
      applyPPA: new ApplyPPAUseCase(ppaRepo),
      recalculate: new RecalculateUseCase(new HttpAdminRepository(ctx)),
      sync: new SyncUseCase(new HttpAdminRepository(ctx)),
    };
  }
  return clientContainer;
}
