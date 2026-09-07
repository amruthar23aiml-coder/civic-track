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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          author_id: string
          body: string
          created_at: string
          event_id: string | null
          id: string
          title: string
        }
        Insert: {
          author_id: string
          body?: string
          created_at?: string
          event_id?: string | null
          id?: string
          title: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          event_id?: string | null
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
            reports: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          category: Database["public"]["Enums"]["report_category"]
          location_name: string | null
          address: string | null
          latitude: number | null
          longitude: number | null
          before_image_url: string | null
          after_image_url: string | null
          maps_link: string | null
          status: Database["public"]["Enums"]["report_status"]
          assigned_authority_id: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          description?: string
          category?: Database["public"]["Enums"]["report_category"]
          location_name?: string | null
          address?: string | null
          latitude?: number | null
          longitude?: number | null
          before_image_url?: string | null
          after_image_url?: string | null
          maps_link?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          assigned_authority_id?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string
          category?: Database["public"]["Enums"]["report_category"]
          location_name?: string | null
          address?: string | null
          latitude?: number | null
          longitude?: number | null
          before_image_url?: string | null
          after_image_url?: string | null
          maps_link?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          assigned_authority_id?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_assigned_authority_id_fkey"
            columns: ["assigned_authority_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      },
      donations: {
        Row: {
          amount: number
          created_at: string
          donor_id: string | null
          donor_name: string
          event_id: string | null
          id: string
          is_anonymous: boolean
          message: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          donor_id?: string | null
          donor_name?: string
          event_id?: string | null
          id?: string
          is_anonymous?: boolean
          message?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          donor_id?: string | null
          donor_name?: string
          event_id?: string | null
          id?: string
          is_anonymous?: boolean
          message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_photos: {
        Row: {
          created_at: string
          event_id: string
          id: string
          kind: Database["public"]["Enums"]["photo_kind"]
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          kind: Database["public"]["Enums"]["photo_kind"]
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["photo_kind"]
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          approved: boolean
          capacity: number
          category: Database["public"]["Enums"]["event_category"]
          category_other: string | null
          contact_name: string | null
          contact_phone: string | null
          cover_url: string | null
          created_at: string
          description: string
          details: Json
          ends_at: string | null
          id: string
          landmark: string | null
          latitude: number | null
          location_name: string
          longitude: number | null
          organizer_id: string
          starts_at: string
          status: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          approved?: boolean
          capacity?: number
          category?: Database["public"]["Enums"]["event_category"]
          category_other?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string
          details?: Json
          ends_at?: string | null
          id?: string
          landmark?: string | null
          latitude?: number | null
          location_name: string
          longitude?: number | null
          organizer_id: string
          starts_at: string
          status?: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          approved?: boolean
          capacity?: number
          category?: Database["public"]["Enums"]["event_category"]
          category_other?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string
          details?: Json
          ends_at?: string | null
          id?: string
          landmark?: string | null
          latitude?: number | null
          location_name?: string
          longitude?: number | null
          organizer_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          attendance: Database["public"]["Enums"]["attendance_status"]
          created_at: string
          event_id: string
          hours: number
          id: string
          volunteer_id: string
        }
        Insert: {
          attendance?: Database["public"]["Enums"]["attendance_status"]
          created_at?: string
          event_id: string
          hours?: number
          id?: string
          volunteer_id: string
        }
        Update: {
          attendance?: Database["public"]["Enums"]["attendance_status"]
          created_at?: string
          event_id?: string
          hours?: number
          id?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waste_logs: {
        Row: {
          bags: number
          created_at: string
          event_id: string
          id: string
          notes: string | null
          user_id: string
          weight_kg: number
        }
        Insert: {
          bags?: number
          created_at?: string
          event_id: string
          id?: string
          notes?: string | null
          user_id: string
          weight_kg?: number
        }
        Update: {
          bags?: number
          created_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          user_id?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "waste_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
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
      is_event_organizer: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      leaderboard: {
        Args: { _limit?: number }
        Returns: {
          avatar_url: string
          city: string
          events_attended: number
          full_name: string
          total_bags: number
          total_weight_kg: number
          user_id: string
        }[]
      }
      platform_stats: {
        Args: never
        Returns: {
          attended_count: number
          total_bags: number
          total_events: number
          total_registrations: number
          total_volunteers: number
          total_weight_kg: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "organizer" | "volunteer" | "authority"
      attendance_status: "pending" | "attended" | "absent"
      event_category:
        | "community_cleanup"
        | "tree_plantation"
        | "food_donation"
        | "clothes_donation"
        | "book_donation"
        | "school_supplies_donation"
        | "fundraising_campaign"
        | "blood_donation_camp"
        | "medical_checkup_camp"
        | "medicine_donation"
        | "toy_donation"
        | "blanket_donation"
        | "disaster_relief"
        | "old_age_home_visit"
        | "animal_shelter_support"
        | "educational_tutoring"
        | "women_empowerment"
        | "skill_development"
        | "environmental_awareness"
        | "recycling_ewaste"
        | "charity_marathon"
        | "other"
      event_status: "upcoming" | "completed" | "cancelled"
      photo_kind: "before" | "after"
      report_status:
  | "submitted"
  | "verified"
  | "assigned"
  | "in_progress"
  | "completed"
  | "rejected"

report_category:
  | "garbage"
  | "plastic"
  | "construction_waste"
  | "overflowing_bin"
  | "illegal_dumping"
  | "other"
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
      app_role: ["admin", "organizer", "volunteer"],
      attendance_status: ["pending", "attended", "absent"],
      event_category: [
        "community_cleanup",
        "tree_plantation",
        "food_donation",
        "clothes_donation",
        "book_donation",
        "school_supplies_donation",
        "fundraising_campaign",
        "blood_donation_camp",
        "medical_checkup_camp",
        "medicine_donation",
        "toy_donation",
        "blanket_donation",
        "disaster_relief",
        "old_age_home_visit",
        "animal_shelter_support",
        "educational_tutoring",
        "women_empowerment",
        "skill_development",
        "environmental_awareness",
        "recycling_ewaste",
        "charity_marathon",
        "other",
      ],
      event_status: ["upcoming", "completed", "cancelled"],
      photo_kind: ["before", "after"],
    },
  },
} as const
