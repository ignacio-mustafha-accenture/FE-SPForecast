import type { Ticket, CreateTicketPayload, UpdateTicketPayload } from '../domain/ticket';
import type { Page, TicketFilter } from '../domain/pagination';

export interface ITicketRepository {
  list(filter: TicketFilter): Promise<Page<Ticket>>;
  create(payload: CreateTicketPayload): Promise<Ticket>;
  update(id: string, payload: UpdateTicketPayload): Promise<Ticket>;
  assignEid(id: string, newEid: string, newName?: string): Promise<{ ok: boolean; new_eid: string }>;
  approveTicket(id: string): Promise<Ticket>;
  rejectTicket(id: string, reason: string): Promise<Ticket>;
}
