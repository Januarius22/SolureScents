export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type TableDefinition<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

interface AuditColumns {
  created_at: string;
  id: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      activity_logs: TableDefinition<AuditColumns & {
        context: Json;
        event_name: string;
        profile_id: string | null;
      }>;
      audit_logs: TableDefinition<AuditColumns & {
        action: string;
        actor_id: string | null;
        entity_id: string | null;
        entity_schema: string;
        entity_table: string;
        new_data: Json | null;
        old_data: Json | null;
      }>;
      notifications: TableDefinition<AuditColumns & {
        action_url: string | null;
        body: string;
        kind: Database["public"]["Enums"]["notification_kind"];
        profile_id: string;
        read_at: string | null;
        title: string;
      }>;
      permissions: TableDefinition<AuditColumns & {
        code: string;
        description: string;
      }>;
      profile_roles: TableDefinition<AuditColumns & {
        assigned_by: string | null;
        expires_at: string | null;
        profile_id: string;
        role_id: string;
      }>;
      profiles: TableDefinition<AuditColumns & {
        avatar_path: string | null;
        currency: string;
        full_name: string | null;
        last_seen_at: string | null;
        locale: string;
        phone: string | null;
        status: Database["public"]["Enums"]["profile_status"];
      }>;
      role_permissions: TableDefinition<AuditColumns & {
        permission_id: string;
        role_id: string;
      }>;
      roles: TableDefinition<AuditColumns & {
        description: string | null;
        is_system: boolean;
        name: string;
        slug: string;
      }>;
    };
    Views: Record<never, never>;
    Functions: {
      current_user_roles: { Args: Record<never, never>; Returns: string[] };
      has_permission: { Args: { requested_permission: string }; Returns: boolean };
      has_role: { Args: { requested_role: string }; Returns: boolean };
    };
    Enums: {
      notification_kind: "system" | "order" | "account" | "reward" | "editorial";
      profile_status: "active" | "suspended" | "deactivated";
    };
    CompositeTypes: Record<never, never>;
  };
}
