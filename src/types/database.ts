export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type TableDefinition<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type AuditColumns = {
  created_at: string;
  id: string;
  updated_at: string;
};

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
      products: TableDefinition<AuditColumns & {
        brand_id: string;
        concentration: Database["public"]["Enums"]["fragrance_concentration"];
        description: string;
        family_id: string | null;
        is_featured: boolean;
        launch_year: number | null;
        longevity_hours_max: number | null;
        longevity_hours_min: number | null;
        name: string;
        perfumer: string | null;
        published_at: string | null;
        seo_description: string | null;
        seo_title: string | null;
        sillage: Database["public"]["Enums"]["sillage_level"] | null;
        slug: string;
        status: Database["public"]["Enums"]["product_status"];
        story: string | null;
        subtitle: string | null;
      }>;
      product_variants: TableDefinition<AuditColumns & {
        barcode: string | null;
        compare_at_price_minor: number | null;
        cost_minor: number | null;
        currency: string;
        is_available: boolean;
        label: string;
        low_stock_limit: number;
        price_minor: number;
        product_id: string;
        size_ml: number;
        sku: string;
        status: Database["public"]["Enums"]["variant_status"];
        weight_grams: number;
      }>;
      collection_products: TableDefinition<AuditColumns & {
        collection_id: string;
        product_id: string;
        sort_order: number;
      }>;
      carts: TableDefinition<AuditColumns & {
        currency: string;
        expires_at: string;
        profile_id: string;
        status: Database["public"]["Enums"]["cart_status"];
      }>;
      cart_items: TableDefinition<AuditColumns & {
        cart_id: string;
        currency: string;
        quantity: number;
        unit_price_minor: number;
        variant_id: string;
      }>;
      brands: TableDefinition<AuditColumns & {
        country_code: string | null;
        description: string | null;
        founded_year: number | null;
        is_active: boolean;
        logo_path: string | null;
        name: string;
        slug: string;
        sort_order: number;
        website_url: string | null;
      }>;
      collections: TableDefinition<AuditColumns & {
        description: string | null;
        hero_image_path: string | null;
        is_active: boolean;
        is_featured: boolean;
        name: string;
        slug: string;
        sort_order: number;
      }>;
      addresses: TableDefinition<AuditColumns & {
        city: string; country_code: string; is_default_billing: boolean; is_default_shipping: boolean;
        label: string; line_1: string; line_2: string | null; phone: string; postal_code: string | null;
        profile_id: string; recipient_name: string; state_region: string;
      }>;
      orders: TableDefinition<AuditColumns & {
        billing_address: Json; cancelled_at: string | null; carrier: string | null; checkout_session_id: string | null;
        currency: string; customer_email: string; customer_note: string | null; delivered_at: string | null;
        discount_minor: number; fulfillment_status: Database["public"]["Enums"]["fulfillment_status"];
        order_number: string; placed_at: string | null; profile_id: string; shipped_at: string | null;
        shipping_address: Json; shipping_minor: number; status: Database["public"]["Enums"]["order_status"];
        subtotal_minor: number; tax_minor: number; total_minor: number; tracking_number: string | null; tracking_url: string | null;
      }>;
      wishlist_items: TableDefinition<AuditColumns & { profile_id: string; product_id: string }>;
      reviews: TableDefinition<AuditColumns & {
        body: string; is_verified_purchase: boolean; order_item_id: string | null; profile_id: string;
        product_id: string; published_at: string | null; rating: number;
        status: Database["public"]["Enums"]["review_status"]; title: string | null;
      }>;
      reward_accounts: TableDefinition<AuditColumns & {
        lifetime_points: number; points_balance: number; profile_id: string; tier: string;
      }>;
      reward_transactions: TableDefinition<AuditColumns & {
        description: string; expires_at: string | null; kind: Database["public"]["Enums"]["reward_transaction_kind"];
        order_id: string | null; points: number; reward_account_id: string;
      }>;
      notification_preferences: TableDefinition<AuditColumns & {
        editorial: boolean; marketing_email: boolean; order_updates: boolean; profile_id: string; rewards: boolean;
      }>;
    };
    Views: Record<never, never>;
    Functions: {
      current_user_roles: { Args: Record<never, never>; Returns: string[] };
      add_cart_item: {
        Args: { add_quantity: number; target_variant_id: string };
        Returns: Database["public"]["Tables"]["cart_items"]["Row"];
      };
      create_checkout_session: { Args: { target_cart_id: string }; Returns: string };
      get_variant_availability: {
        Args: { target_variant_ids: string[] };
        Returns: { available_quantity: number; variant_id: string }[];
      };
      has_permission: { Args: { requested_permission: string }; Returns: boolean };
      has_role: { Args: { requested_role: string }; Returns: boolean };
    };
    Enums: {
      notification_kind: "system" | "order" | "account" | "reward" | "editorial";
      profile_status: "active" | "suspended" | "deactivated";
      cart_status: "active" | "converted" | "abandoned" | "expired";
      fragrance_concentration: "edc" | "edt" | "edp" | "parfum" | "extrait" | "oil";
      product_status: "draft" | "active" | "archived";
      sillage_level: "intimate" | "moderate" | "strong" | "enormous";
      variant_status: "draft" | "active" | "discontinued";
      order_status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
      fulfillment_status: "unfulfilled" | "processing" | "partially_fulfilled" | "fulfilled" | "returned";
      review_status: "pending" | "published" | "rejected";
      reward_transaction_kind: "earned" | "redeemed" | "adjusted" | "expired";
    };
    CompositeTypes: Record<never, never>;
  };
}
