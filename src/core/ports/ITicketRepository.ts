import type { Ticket, CreateTicketPayload, UpdateTicketPayload } from '../domain/ticket';
import type { Page, TicketFilter } from '../domain/pagination';

export interface ITicketRepository {
  list(filter: TicketFilter): Promise<Page<Ticket>>;
  create(payload: CreateTicketPayload): Promise<Ticket>;
  update(id: string, payload: UpdateTicketPayload): Promise<Ticket>;
}
