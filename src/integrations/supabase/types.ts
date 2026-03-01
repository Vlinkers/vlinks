export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      contribution_documents: {
        Row: {
          contribution_id: string
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          is_redacted: boolean | null
        }
        Insert: {
          contribution_id: string
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_redacted?: boolean | null
        }
        Update: {
          contribution_id?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_redacted?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "contribution_documents_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "vin_contributions"
            referencedColumns: ["id"]
          },
        ]
      }
      contribution_photos: {
        Row: {
          caption: string | null
          contribution_id: string
          created_at: string
          file_name: string
          file_path: string
          id: string
        }
        Insert: {
          caption?: string | null
          contribution_id: string
          created_at?: string
          file_name: string
          file_path: string
          id?: string
        }
        Update: {
          caption?: string | null
          contribution_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contribution_photos_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "vin_contributions"
            referencedColumns: ["id"]
          },
        ]
      }
      contribution_tags: {
        Row: {
          contribution_id: string
          created_at: string
          id: string
          tag: string
        }
        Insert: {
          contribution_id: string
          created_at?: string
          id?: string
          tag: string
        }
        Update: {
          contribution_id?: string
          created_at?: string
          id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "contribution_tags_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "vin_contributions"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          email: string
          id: string
          vin: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          vin: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          vin?: string
        }
        Relationships: []
      }
      owner_claims: {
        Row: {
          created_at: string
          id: string
          revoked_at: string | null
          status: string
          user_id: string
          verified_at: string | null
          vin_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          revoked_at?: string | null
          status?: string
          user_id: string
          verified_at?: string | null
          vin_id: string
        }
        Update: {
          created_at?: string
          id?: string
          revoked_at?: string | null
          status?: string
          user_id?: string
          verified_at?: string | null
          vin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_claims_vin_id_fkey"
            columns: ["vin_id"]
            isOneToOne: true
            referencedRelation: "vins"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_verifications: {
        Row: {
          created_at: string
          document_path: string | null
          document_type: string | null
          ended_at: string | null
          id: string
          updated_at: string
          user_id: string
          verification_status: string
          verified_at: string | null
          vin_id: string
        }
        Insert: {
          created_at?: string
          document_path?: string | null
          document_type?: string | null
          ended_at?: string | null
          id?: string
          updated_at?: string
          user_id: string
          verification_status?: string
          verified_at?: string | null
          vin_id: string
        }
        Update: {
          created_at?: string
          document_path?: string | null
          document_type?: string | null
          ended_at?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          verification_status?: string
          verified_at?: string | null
          vin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_verifications_vin_id_fkey"
            columns: ["vin_id"]
            isOneToOne: false
            referencedRelation: "vins"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_requests: {
        Row: {
          email_hash: string
          id: string
          requested_at: string
        }
        Insert: {
          email_hash: string
          id?: string
          requested_at?: string
        }
        Update: {
          email_hash?: string
          id?: string
          requested_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          contributions_count: number
          created_at: string
          display_name: string | null
          id: string
          is_verified: boolean
          level: number
          location: string | null
          points: number
          public_id: string | null
          reviews_count: number
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          contributions_count?: number
          created_at?: string
          display_name?: string | null
          id?: string
          is_verified?: boolean
          level?: number
          location?: string | null
          points?: number
          public_id?: string | null
          reviews_count?: number
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          contributions_count?: number
          created_at?: string
          display_name?: string | null
          id?: string
          is_verified?: boolean
          level?: number
          location?: string | null
          points?: number
          public_id?: string | null
          reviews_count?: number
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      public_contributions: {
        Row: {
          author_label: string
          author_public_id: string | null
          contribution_type: Database["public"]["Enums"]["contribution_type"]
          created_at: string
          id: string
          intervention_date: string | null
          intervention_type: string | null
          is_anonymous: boolean | null
          is_owner_contribution: boolean | null
          mileage_at_intervention: number | null
          updated_at: string
          user_id: string
          vin_id: string
        }
        Insert: {
          author_label?: string
          author_public_id?: string | null
          contribution_type: Database["public"]["Enums"]["contribution_type"]
          created_at?: string
          id?: string
          intervention_date?: string | null
          intervention_type?: string | null
          is_anonymous?: boolean | null
          is_owner_contribution?: boolean | null
          mileage_at_intervention?: number | null
          updated_at?: string
          user_id: string
          vin_id: string
        }
        Update: {
          author_label?: string
          author_public_id?: string | null
          contribution_type?: Database["public"]["Enums"]["contribution_type"]
          created_at?: string
          id?: string
          intervention_date?: string | null
          intervention_type?: string | null
          is_anonymous?: boolean | null
          is_owner_contribution?: boolean | null
          mileage_at_intervention?: number | null
          updated_at?: string
          user_id?: string
          vin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_contributions_vin_id_fkey"
            columns: ["vin_id"]
            isOneToOne: false
            referencedRelation: "vins"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_contributions: {
        Row: {
          contribution_type: Database["public"]["Enums"]["contribution_type"]
          created_at: string
          details: string | null
          id: string
          intervention_date: string | null
          intervention_type: string | null
          is_anonymous: boolean | null
          is_former_owner: boolean | null
          is_owner_contribution: boolean | null
          mileage_at_intervention: number | null
          summary: string | null
          title: string
          updated_at: string
          user_id: string
          vin_id: string
        }
        Insert: {
          contribution_type: Database["public"]["Enums"]["contribution_type"]
          created_at?: string
          details?: string | null
          id?: string
          intervention_date?: string | null
          intervention_type?: string | null
          is_anonymous?: boolean | null
          is_former_owner?: boolean | null
          is_owner_contribution?: boolean | null
          mileage_at_intervention?: number | null
          summary?: string | null
          title: string
          updated_at?: string
          user_id: string
          vin_id: string
        }
        Update: {
          contribution_type?: Database["public"]["Enums"]["contribution_type"]
          created_at?: string
          details?: string | null
          id?: string
          intervention_date?: string | null
          intervention_type?: string | null
          is_anonymous?: boolean | null
          is_former_owner?: boolean | null
          is_owner_contribution?: boolean | null
          mileage_at_intervention?: number | null
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          vin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_contributions_vin_id_fkey"
            columns: ["vin_id"]
            isOneToOne: false
            referencedRelation: "vins"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_type: Database["public"]["Enums"]["badge_type"]
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_type: Database["public"]["Enums"]["badge_type"]
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_type?: Database["public"]["Enums"]["badge_type"]
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vin_contributions: {
        Row: {
          contribution_type: Database["public"]["Enums"]["contribution_type"]
          created_at: string
          details: string | null
          id: string
          is_anonymous: boolean | null
          is_verified: boolean | null
          points_awarded: number | null
          summary: string | null
          title: string
          updated_at: string
          user_id: string
          vin_id: string
        }
        Insert: {
          contribution_type: Database["public"]["Enums"]["contribution_type"]
          created_at?: string
          details?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_verified?: boolean | null
          points_awarded?: number | null
          summary?: string | null
          title: string
          updated_at?: string
          user_id: string
          vin_id: string
        }
        Update: {
          contribution_type?: Database["public"]["Enums"]["contribution_type"]
          created_at?: string
          details?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_verified?: boolean | null
          points_awarded?: number | null
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          vin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vin_contributions_vin_id_fkey"
            columns: ["vin_id"]
            isOneToOne: false
            referencedRelation: "vins"
            referencedColumns: ["id"]
          },
        ]
      }
      vin_decodes: {
        Row: {
          body_class: string | null
          created_at: string
          drive_type: string | null
          engine: string | null
          error_message: string | null
          fuel_type: string | null
          id: string
          is_valid: boolean
          make: string | null
          model: string | null
          model_year: number | null
          raw_response: Json | null
          trim: string | null
          updated_at: string
          vin: string
        }
        Insert: {
          body_class?: string | null
          created_at?: string
          drive_type?: string | null
          engine?: string | null
          error_message?: string | null
          fuel_type?: string | null
          id?: string
          is_valid?: boolean
          make?: string | null
          model?: string | null
          model_year?: number | null
          raw_response?: Json | null
          trim?: string | null
          updated_at?: string
          vin: string
        }
        Update: {
          body_class?: string | null
          created_at?: string
          drive_type?: string | null
          engine?: string | null
          error_message?: string | null
          fuel_type?: string | null
          id?: string
          is_valid?: boolean
          make?: string | null
          model?: string | null
          model_year?: number | null
          raw_response?: Json | null
          trim?: string | null
          updated_at?: string
          vin?: string
        }
        Relationships: []
      }
      vins: {
        Row: {
          contributions_count: number | null
          created_at: string
          id: string
          make: string | null
          model: string | null
          trust_score: number | null
          updated_at: string
          vin: string
          year: number | null
        }
        Insert: {
          contributions_count?: number | null
          created_at?: string
          id?: string
          make?: string | null
          model?: string | null
          trust_score?: number | null
          updated_at?: string
          vin: string
          year?: number | null
        }
        Update: {
          contributions_count?: number | null
          created_at?: string
          id?: string
          make?: string | null
          model?: string | null
          trust_score?: number | null
          updated_at?: string
          vin?: string
          year?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      badge_type:
        | "first_contribution"
        | "vin_hunter"
        | "review_master"
        | "photo_pro"
        | "community_helper"
        | "trusted_member"
        | "early_adopter"
        | "premium_member"
      contribution_type:
        | "inspection_report"
        | "vehicle_history"
        | "owner_exchange"
        | "mechanic_conversation"
        | "photo_evidence"
        | "observation"
        | "purchase_decision"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      badge_type: [
        "first_contribution",
        "vin_hunter",
        "review_master",
        "photo_pro",
        "community_helper",
        "trusted_member",
        "early_adopter",
        "premium_member",
      ],
      contribution_type: [
        "inspection_report",
        "vehicle_history",
        "owner_exchange",
        "mechanic_conversation",
        "photo_evidence",
        "observation",
        "purchase_decision",
      ],
    },
  },
} as const
