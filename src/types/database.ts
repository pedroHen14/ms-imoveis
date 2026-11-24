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
 * NUNCA incluir `owner_id` em queries acessíveis ao público.
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
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
export type PublicProperty = Omit<Property, "owner_id">;
export type PropertyImage =
  Database["public"]["Tables"]["property_images"]["Row"];
export type Lead = Database["public"]["Tables"]["leads"]["Row"];
