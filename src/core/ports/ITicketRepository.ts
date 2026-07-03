import type { Ticket, CreateTicketPayload, UpdateTicketPayload } from '../domain/ticket';

export interface ITicketRepository {
  create(payload: CreateTicketPayload): Promise<Ticket>;
  update(id: string, payload: UpdateTicketPayload): Promise<Ticket>;
}
