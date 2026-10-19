import type { SupabaseClient } from '@supabase/supabase-js';
import type { ConversationState } from '../../types/meta-commerce';
import { cloneConversationState, validateConversationState } from './conversation-domain';

/**
 * Persistence abstraction for conversation state.
 * No production migrations required or applied.
 */
export interface ConversationRepository {
  findById(conversationId: string): Promise<ConversationState | null>;
  findByExternalUserId(channel: string, externalUserId: string): Promise<ConversationState | null>;
  save(state: ConversationState): Promise<ConversationState>;
  delete?(conversationId: string): Promise<boolean>;
}

/**
 * Deterministic In-Memory Repository for unit tests, simulator, and dry-run execution.
 * Guarantees deep isolation: callers cannot mutate repository records by reference.
 */
export class InMemoryConversationRepository implements ConversationRepository {
  private readonly records = new Map<string, ConversationState>();
  private readonly externalUserIndex = new Map<string, string>(); // key: `${channel}:${externalUserId}` -> conversationId

  private buildUserKey(channel: string, externalUserId: string): string {
    return `${channel.toLowerCase().trim()}:${externalUserId.trim()}`;
  }

  async findById(conversationId: string): Promise<ConversationState | null> {
    if (!conversationId || typeof conversationId !== 'string') return null;
    const record = this.records.get(conversationId.trim());
    return record ? cloneConversationState(record) : null;
  }

  async findByExternalUserId(channel: string, externalUserId: string): Promise<ConversationState | null> {
    if (!channel || !externalUserId) return null;
    const userKey = this.buildUserKey(channel, externalUserId);
    const conversationId = this.externalUserIndex.get(userKey);
    if (!conversationId) return null;
    return this.findById(conversationId);
  }

  async save(state: ConversationState): Promise<ConversationState> {
    const validated = validateConversationState(state);
    const cloned = cloneConversationState(validated);

    // Optimistic concurrency check: if prior version exists, new version must be greater
    const existing = this.records.get(cloned.conversation_id);
    if (existing && cloned.state_version <= existing.state_version) {
      throw new Error(
        `Optimistic concurrency violation: state_version ${cloned.state_version} is not greater than existing ${existing.state_version}`,
      );
    }

    this.records.set(cloned.conversation_id, cloned);
    const userKey = this.buildUserKey(cloned.channel, cloned.external_user_id);
    this.externalUserIndex.set(userKey, cloned.conversation_id);

    return cloneConversationState(cloned);
  }

  async delete(conversationId: string): Promise<boolean> {
    if (!conversationId) return false;
    const trimmedId = conversationId.trim();
    const existing = this.records.get(trimmedId);
    if (!existing) return false;

    const userKey = this.buildUserKey(existing.channel, existing.external_user_id);
    this.externalUserIndex.delete(userKey);
    return this.records.delete(trimmedId);
  }

  /**
   * Helper for tests/simulation to inspect repository size.
   */
  count(): number {
    return this.records.size;
  }

  /**
   * Helper for tests/simulation to clear all stored states.
   */
  clear(): void {
    this.records.clear();
    this.externalUserIndex.clear();
  }
}

/**
 * Supabase-backed Conversation Repository utilizing existing project Supabase client.
 * Does NOT run or apply any database migrations. Handles missing tables gracefully.
 */
export class SupabaseConversationRepository implements ConversationRepository {
  constructor(
    private readonly supabaseClient: SupabaseClient | any,
    private readonly tableName: string = 'conversation_states',
  ) {}

  async findById(conversationId: string): Promise<ConversationState | null> {
    if (!this.supabaseClient || !conversationId) return null;

    try {
      const { data, error } = await this.supabaseClient
        .from(this.tableName)
        .select('*')
        .eq('conversation_id', conversationId.trim())
        .maybeSingle();

      if (error) {
        // Table does not exist in unmigrated environments; return null safely
        return null;
      }

      if (!data) return null;
      return validateConversationState(data);
    } catch {
      return null;
    }
  }

  async findByExternalUserId(channel: string, externalUserId: string): Promise<ConversationState | null> {
    if (!this.supabaseClient || !channel || !externalUserId) return null;

    try {
      const { data, error } = await this.supabaseClient
        .from(this.tableName)
        .select('*')
        .eq('channel', channel.toLowerCase().trim())
        .eq('external_user_id', externalUserId.trim())
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;
      return validateConversationState(data);
    } catch {
      return null;
    }
  }

  async save(state: ConversationState): Promise<ConversationState> {
    const validated = validateConversationState(state);

    if (!this.supabaseClient) {
      throw new Error('Supabase client is not configured');
    }

    try {
      const { data, error } = await this.supabaseClient
        .from(this.tableName)
        .upsert(validated, { onConflict: 'conversation_id' })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save conversation state to Supabase: ${error.message}`);
      }

      return validateConversationState(data);
    } catch (err: any) {
      // Re-throw or wrap with clear diagnosis
      throw new Error(`Supabase persistence failure: ${err?.message || err}`);
    }
  }
}
