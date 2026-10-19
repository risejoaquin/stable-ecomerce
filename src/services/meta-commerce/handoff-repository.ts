import type { SupabaseClient } from '@supabase/supabase-js';
import {
  type HandoffReason,
  type HandoffStatus,
  type HandoffTicket,
  HandoffTicketSchema,
} from './handoff-types';

/**
 * Persistence abstraction for human handoff tickets.
 */
export interface HandoffTicketRepository {
  save(ticket: HandoffTicket): Promise<HandoffTicket>;
  findByConversationId(conversationId: string): Promise<HandoffTicket | null>;
  findById(ticketId: string): Promise<HandoffTicket | null>;
  list(filter?: {
    status?: HandoffStatus;
    reason?: HandoffReason;
    operatorId?: string;
  }): Promise<HandoffTicket[]>;
  delete?(ticketId: string): Promise<boolean>;
  count(): Promise<number> | number;
  clear?(): void;
}

/**
 * In-memory repository implementation for unit testing and local development.
 * Guarantees deep isolation: callers cannot mutate repository records by reference.
 */
export class InMemoryHandoffRepository implements HandoffTicketRepository {
  private readonly tickets = new Map<string, HandoffTicket>(); // key: ticketId
  private readonly conversationIndex = new Map<string, string>(); // key: conversationId -> ticketId

  private clone(ticket: HandoffTicket): HandoffTicket {
    return JSON.parse(JSON.stringify(ticket));
  }

  async save(ticket: HandoffTicket): Promise<HandoffTicket> {
    const validated = HandoffTicketSchema.parse(ticket);
    const cloned = this.clone(validated);

    this.tickets.set(cloned.ticketId, cloned);
    this.conversationIndex.set(cloned.conversationId, cloned.ticketId);

    return this.clone(cloned);
  }

  async findByConversationId(conversationId: string): Promise<HandoffTicket | null> {
    if (!conversationId || typeof conversationId !== 'string') return null;
    const ticketId = this.conversationIndex.get(conversationId.trim());
    if (!ticketId) return null;
    return this.findById(ticketId);
  }

  async findById(ticketId: string): Promise<HandoffTicket | null> {
    if (!ticketId || typeof ticketId !== 'string') return null;
    const found = this.tickets.get(ticketId.trim());
    return found ? this.clone(found) : null;
  }

  async list(filter?: {
    status?: HandoffStatus;
    reason?: HandoffReason;
    operatorId?: string;
  }): Promise<HandoffTicket[]> {
    let result = Array.from(this.tickets.values());

    if (filter?.status) {
      result = result.filter((t) => t.status === filter.status);
    }
    if (filter?.reason) {
      result = result.filter((t) => t.reason === filter.reason);
    }
    if (filter?.operatorId) {
      result = result.filter((t) => t.assignedOperatorId === filter.operatorId);
    }

    // Sort newest first
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return result.map((t) => this.clone(t));
  }

  async delete(ticketId: string): Promise<boolean> {
    if (!ticketId) return false;
    const existing = this.tickets.get(ticketId.trim());
    if (!existing) return false;

    this.conversationIndex.delete(existing.conversationId);
    return this.tickets.delete(ticketId.trim());
  }

  count(): number {
    return this.tickets.size;
  }

  clear(): void {
    this.tickets.clear();
    this.conversationIndex.clear();
  }
}

/**
 * Supabase-backed Handoff Repository for production environments.
 * Operates gracefully with optional table persistence; does NOT run migrations.
 */
export class SupabaseHandoffRepository implements HandoffTicketRepository {
  constructor(
    private readonly supabaseClient: SupabaseClient | any,
    private readonly tableName: string = 'commerce_handoff_tickets',
  ) {}

  async findById(ticketId: string): Promise<HandoffTicket | null> {
    if (!this.supabaseClient || !ticketId) return null;

    try {
      const { data, error } = await this.supabaseClient
        .from(this.tableName)
        .select('*')
        .eq('ticket_id', ticketId.trim())
        .maybeSingle();

      if (error || !data) return null;
      return HandoffTicketSchema.parse(data.payload);
    } catch {
      return null;
    }
  }

  async findByConversationId(conversationId: string): Promise<HandoffTicket | null> {
    if (!this.supabaseClient || !conversationId) return null;

    try {
      const { data, error } = await this.supabaseClient
        .from(this.tableName)
        .select('*')
        .eq('conversation_id', conversationId.trim())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;
      return HandoffTicketSchema.parse(data.payload);
    } catch {
      return null;
    }
  }

  async save(ticket: HandoffTicket): Promise<HandoffTicket> {
    const validated = HandoffTicketSchema.parse(ticket);

    if (this.supabaseClient) {
      try {
        const row = {
          ticket_id: validated.ticketId,
          conversation_id: validated.conversationId,
          status: validated.status,
          reason: validated.reason,
          severity: validated.severity,
          assigned_operator_id: validated.assignedOperatorId,
          payload: validated,
          updated_at: validated.updatedAt,
        };

        await this.supabaseClient.from(this.tableName).upsert(row, { onConflict: 'ticket_id' });
      } catch {
        // Fallback gracefully without breaking conversational workflow
      }
    }

    return validated;
  }

  async list(filter?: {
    status?: HandoffStatus;
    reason?: HandoffReason;
    operatorId?: string;
  }): Promise<HandoffTicket[]> {
    if (!this.supabaseClient) return [];

    try {
      let query = this.supabaseClient.from(this.tableName).select('*').order('created_at', { ascending: false });

      if (filter?.status) {
        query = query.eq('status', filter.status);
      }
      if (filter?.reason) {
        query = query.eq('reason', filter.reason);
      }
      if (filter?.operatorId) {
        query = query.eq('assigned_operator_id', filter.operatorId);
      }

      const { data, error } = await query;
      if (error || !data) return [];

      return data.map((row: any) => HandoffTicketSchema.parse(row.payload));
    } catch {
      return [];
    }
  }

  async count(): Promise<number> {
    if (!this.supabaseClient) return 0;
    try {
      const { count, error } = await this.supabaseClient
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });
      return error || count === null ? 0 : count;
    } catch {
      return 0;
    }
  }
}
