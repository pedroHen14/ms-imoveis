export type PropertyType = "casa" | "apartamento" | "terreno" | "comercial";
export type PropertyPurpose = "venda" | "locacao";
export type PropertyStatus =
  | "disponivel"
  | "reservado"
  | "vendido"
  | "alugado"
  | "rascunho";

export type LeadSource =
  | "site"
  | "whatsapp"
  | "indicacao"
  | "newcore"
  | "olx"
  | "marketplace";

export type LeadStatus =
  | "novo"
  | "em_contato"
  | "visita"
  | "proposta"
  | "fechado"
  | "perdido";

/**
 * Colunas públicas da tabela `properties`.
 * NUNCA incluir `owner_id` ou `ai_notes` em queries acessíveis ao público.
 */
export const PUBLIC_PROPERTY_COLUMNS = [
  "id",
  "code",
  "slug",
  "title",
  "type",
  "purpose",
  "price",
  "condo_fee",
  "iptu",
  "area_total",
  "area_built",
  "bedrooms",
  "suites",
  "bathrooms",
  "parking",
  "condominium",
  "neighborhood",
  "city",
  "address",
  "description",
  "status",
  "is_featured",
  "created_at",
  "updated_at",
] as const;

export const PUBLIC_PROPERTY_SELECT = PUBLIC_PROPERTY_COLUMNS.join(", ");

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          user_id: string;
          email: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          email?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          email?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      owners: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          id: string;
          code: number;
          slug: string;
          title: string;
          type: PropertyType;
          purpose: PropertyPurpose;
          price: number | null;
          condo_fee: number | null;
          iptu: number | null;
          area_total: number | null;
          area_built: number | null;
          bedrooms: number;
          suites: number;
          bathrooms: number;
          parking: number;
          condominium: string | null;
          neighborhood: string | null;
          city: string;
          address: string | null;
          description: string | null;
          ai_notes: string | null;
          status: PropertyStatus;
          is_featured: boolean;
          owner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code?: number;
          slug: string;
          title: string;
          type: PropertyType;
          purpose: PropertyPurpose;
          price?: number | null;
          condo_fee?: number | null;
          iptu?: number | null;
          area_total?: number | null;
          area_built?: number | null;
          bedrooms?: number;
          suites?: number;
          bathrooms?: number;
          parking?: number;
          condominium?: string | null;
          neighborhood?: string | null;
          city?: string;
          address?: string | null;
          description?: string | null;
          ai_notes?: string | null;
          status?: PropertyStatus;
          is_featured?: boolean;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: number;
          slug?: string;
          title?: string;
          type?: PropertyType;
          purpose?: PropertyPurpose;
          price?: number | null;
          condo_fee?: number | null;
          iptu?: number | null;
          area_total?: number | null;
          area_built?: number | null;
          bedrooms?: number;
          suites?: number;
          bathrooms?: number;
          parking?: number;
          condominium?: string | null;
          neighborhood?: string | null;
          city?: string;
          address?: string | null;
          description?: string | null;
          ai_notes?: string | null;
          status?: PropertyStatus;
          is_featured?: boolean;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "properties_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "owners";
            referencedColumns: ["id"];
          },
        ];
      };
      property_images: {
        Row: {
          id: string;
          property_id: string;
          url: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          url: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          url?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          id: string;
          name: string;
          phone: string;
          email: string | null;
          source: LeadSource;
          property_id: string | null;
          status: LeadStatus;
          notes: string | null;
          last_contact_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone: string;
          email?: string | null;
          source?: LeadSource;
          property_id?: string | null;
          status?: LeadStatus;
          notes?: string | null;
          last_contact_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string;
          email?: string | null;
          source?: LeadSource;
          property_id?: string | null;
          status?: LeadStatus;
          notes?: string | null;
          last_contact_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leads_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      whatsapp_sessions: {
        Row: {
          phone: string;
          lead_id: string | null;
          bot_paused_until: string | null;
          last_interaction_at: string;
          created_at: string;
        };
        Insert: {
          phone: string;
          lead_id?: string | null;
          bot_paused_until?: string | null;
          last_interaction_at?: string;
          created_at?: string;
        };
        Update: {
          phone?: string;
          lead_id?: string | null;
          bot_paused_until?: string | null;
          last_interaction_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "whatsapp_sessions_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      search_public_properties: {
        Args: {
          p_purpose?: string | null;
          p_type?: string | null;
          p_location?: string | null;
          p_min_price?: number | null;
          p_max_price?: number | null;
          p_sort?: string | null;
          p_page?: number | null;
          p_page_size?: number | null;
        };
        Returns: {
          id: string;
          code: number;
          slug: string;
          title: string;
          type: PropertyType;
          purpose: PropertyPurpose;
          price: number | null;
          condo_fee: number | null;
          iptu: number | null;
          area_total: number | null;
          area_built: number | null;
          bedrooms: number;
          suites: number;
          bathrooms: number;
          parking: number;
          condominium: string | null;
          neighborhood: string | null;
          city: string;
          address: string | null;
          description: string | null;
          status: PropertyStatus;
          is_featured: boolean;
          created_at: string;
          updated_at: string;
          property_images: Json;
          total_count: number;
        }[];
      };
      save_property_with_images: {
        Args: {
          p_id?: string | null;
          p_slug_base?: string | null;
          p_title?: string | null;
          p_type?: PropertyType | null;
          p_purpose?: PropertyPurpose | null;
          p_status?: PropertyStatus | null;
          p_is_featured?: boolean | null;
          p_owner_id?: string | null;
          p_price?: number | null;
          p_condo_fee?: number | null;
          p_iptu?: number | null;
          p_area_total?: number | null;
          p_area_built?: number | null;
          p_bedrooms?: number | null;
          p_suites?: number | null;
          p_bathrooms?: number | null;
          p_parking?: number | null;
          p_condominium?: string | null;
          p_neighborhood?: string | null;
          p_city?: string | null;
          p_address?: string | null;
          p_description?: string | null;
          p_ai_notes?: string | null;
          p_image_urls?: string[] | null;
        };
        Returns: {
          property_id: string;
          property_code: number;
          property_slug: string;
          removed_image_urls: string[];
        }[];
      };
      get_property_image_summaries: {
        Args: {
          p_property_ids: string[];
        };
        Returns: {
          property_id: string;
          cover_url: string | null;
          image_count: number;
        }[];
      };
      get_owner_property_counts: {
        Args: {
          p_owner_ids: string[];
        };
        Returns: {
          owner_id: string;
          property_count: number;
        }[];
      };
      search_properties_for_ai: {
        Args: {
          p_purpose?: string | null;
          p_type?: string | null;
          p_location?: string | null;
          p_max_price?: number | null;
          p_min_bedrooms?: number | null;
        };
        Returns: {
          id: string;
          code: number;
          slug: string;
          title: string;
          type: PropertyType;
          purpose: PropertyPurpose;
          price: number | null;
          condo_fee: number | null;
          iptu: number | null;
          area_total: number | null;
          area_built: number | null;
          bedrooms: number;
          suites: number;
          bathrooms: number;
          parking: number;
          condominium: string | null;
          neighborhood: string | null;
          city: string;
          description_summary: string | null;
          ai_notes: string | null;
          is_featured: boolean;
        }[];
      };
      get_property_by_code_or_slug: {
        Args: {
          p_query: string;
        };
        Returns: {
          id: string;
          code: number;
          slug: string;
          title: string;
          type: PropertyType;
          purpose: PropertyPurpose;
          price: number | null;
          condo_fee: number | null;
          iptu: number | null;
          area_total: number | null;
          area_built: number | null;
          bedrooms: number;
          suites: number;
          bathrooms: number;
          parking: number;
          condominium: string | null;
          neighborhood: string | null;
          city: string;
          address: string | null;
          description: string | null;
          ai_notes: string | null;
          status: PropertyStatus;
          is_featured: boolean;
          cover_image_url: string | null;
        }[];
      };
      upsert_whatsapp_lead: {
        Args: {
          p_phone: string;
          p_name?: string | null;
          p_notes?: string | null;
          p_property_id?: string | null;
        };
        Returns: {
          lead_id: string;
          phone: string;
          is_new: boolean;
          status: LeadStatus;
        }[];
      };
      get_stale_leads_for_followup: {
        Args: {
          p_days?: number;
        };
        Returns: {
          id: string;
          name: string;
          phone: string;
          email: string | null;
          source: LeadSource;
          status: LeadStatus;
          notes: string | null;
          last_contact_at: string;
          days_without_contact: number;
          property_id: string | null;
          property_code: number | null;
          property_title: string | null;
          property_slug: string | null;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Owner = Database["public"]["Tables"]["owners"]["Row"];
export type Property = Database["public"]["Tables"]["properties"]["Row"];
export type PublicProperty = Omit<Property, "owner_id" | "ai_notes">;
export type PropertyImage =
  Database["public"]["Tables"]["property_images"]["Row"];
export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type WhatsappSession =
  Database["public"]["Tables"]["whatsapp_sessions"]["Row"];
export type StaleLeadFollowupRow =
  Database["public"]["Functions"]["get_stale_leads_for_followup"]["Returns"][number];
