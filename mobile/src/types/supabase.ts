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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admission_enquiries: {
        Row: {
          created_at: string
          grade_interest: string
          id: string
          message: string | null
          parent_name: string
          parent_phone: string
          program_interest: string
          status: Database["public"]["Enums"]["enquiry_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade_interest: string
          id?: string
          message?: string | null
          parent_name: string
          parent_phone: string
          program_interest: string
          status?: Database["public"]["Enums"]["enquiry_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade_interest?: string
          id?: string
          message?: string | null
          parent_name?: string
          parent_phone?: string
          program_interest?: string
          status?: Database["public"]["Enums"]["enquiry_status"]
          updated_at?: string
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          class_date: string
          created_at: string
          id: string
          marked_by: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          class_date?: string
          created_at?: string
          id?: string
          marked_by?: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          class_date?: string
          created_at?: string
          id?: string
          marked_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marks: {
        Row: {
          created_at: string
          exam_type: Database["public"]["Enums"]["exam_type"]
          id: string
          max_score: number
          recorded_by: string | null
          score: number
          student_id: string
          subject: string
          term: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          exam_type: Database["public"]["Enums"]["exam_type"]
          id?: string
          max_score?: number
          recorded_by?: string | null
          score: number
          student_id: string
          subject: string
          term: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          exam_type?: Database["public"]["Enums"]["exam_type"]
          id?: string
          max_score?: number
          recorded_by?: string | null
          score?: number
          student_id?: string
          subject?: string
          term?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marks_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      marks_edit_history: {
        Row: {
          edited_at: string
          edited_by: string | null
          id: string
          mark_id: string
          new_score: number
          previous_score: number
        }
        Insert: {
          edited_at?: string
          edited_by?: string | null
          id?: string
          mark_id: string
          new_score: number
          previous_score: number
        }
        Update: {
          edited_at?: string
          edited_by?: string | null
          id?: string
          mark_id?: string
          new_score?: number
          previous_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "marks_edit_history_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marks_edit_history_mark_id_fkey"
            columns: ["mark_id"]
            isOneToOne: false
            referencedRelation: "marks"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          audience: Database["public"]["Enums"]["notice_audience"]
          body: string
          category: Database["public"]["Enums"]["notice_category"]
          created_at: string
          id: string
          published: boolean
          published_at: string
          title: string
          updated_at: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["notice_audience"]
          body: string
          category: Database["public"]["Enums"]["notice_category"]
          created_at?: string
          id?: string
          published?: boolean
          published_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["notice_audience"]
          body?: string
          category?: Database["public"]["Enums"]["notice_category"]
          created_at?: string
          id?: string
          published?: boolean
          published_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          id: string
          payload: string
          recipient: string
          sent_at: string
          status: Database["public"]["Enums"]["notification_status"]
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          id?: string
          payload: string
          recipient: string
          sent_at?: string
          status: Database["public"]["Enums"]["notification_status"]
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          id?: string
          payload?: string
          recipient?: string
          sent_at?: string
          status?: Database["public"]["Enums"]["notification_status"]
        }
        Relationships: []
      }
      parent_student_links: {
        Row: {
          created_at: string
          parent_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          parent_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          parent_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_student_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_student_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          secondary_phone: string | null
          updated_at: string
          whatsapp_number_2: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          secondary_phone?: string | null
          updated_at?: string
          whatsapp_number_2?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          secondary_phone?: string | null
          updated_at?: string
          whatsapp_number_2?: string | null
        }
        Relationships: []
      }
      roll_number_counters: {
        Row: {
          academic_year: number
          grade_level: string
          next_number: number
          section: string
        }
        Insert: {
          academic_year: number
          grade_level: string
          next_number?: number
          section: string
        }
        Update: {
          academic_year?: number
          grade_level?: string
          next_number?: number
          section?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          academic_year: number
          address: string | null
          created_at: string
          deleted_at: string | null
          enrollment_date: string
          full_name: string
          gr_number: string | null
          grade_level: string
          guardian_profession: string | null
          id: string
          is_late_enrollment: boolean
          last_qualification: string | null
          previous_school: string | null
          program: string
          registration_fee: number | null
          registration_number: string
          roll_number: string
          section: string
          status: Database["public"]["Enums"]["student_status"]
          stream: string | null
          tuition_fee: number | null
          updated_at: string
        }
        Insert: {
          academic_year: number
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          enrollment_date?: string
          full_name: string
          gr_number?: string | null
          grade_level: string
          guardian_profession?: string | null
          id?: string
          is_late_enrollment?: boolean
          last_qualification?: string | null
          previous_school?: string | null
          program: string
          registration_fee?: number | null
          registration_number: string
          roll_number: string
          section: string
          status?: Database["public"]["Enums"]["student_status"]
          stream?: string | null
          tuition_fee?: number | null
          updated_at?: string
        }
        Update: {
          academic_year?: number
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          enrollment_date?: string
          full_name?: string
          gr_number?: string | null
          grade_level?: string
          guardian_profession?: string | null
          id?: string
          is_late_enrollment?: boolean
          last_qualification?: string | null
          previous_school?: string | null
          program?: string
          registration_fee?: number | null
          registration_number?: string
          roll_number?: string
          section?: string
          status?: Database["public"]["Enums"]["student_status"]
          stream?: string | null
          tuition_fee?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      teachers: {
        Row: {
          classes: string[]
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          classes?: string[]
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          classes?: string[]
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      video_lectures: {
        Row: {
          created_at: string
          duration_seconds: number
          id: string
          storage_path: string | null
          subject: string
          title: string
        }
        Insert: {
          created_at?: string
          duration_seconds: number
          id?: string
          storage_path?: string | null
          subject: string
          title: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          id?: string
          storage_path?: string | null
          subject?: string
          title?: string
        }
        Relationships: []
      }
      video_watch_sessions: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          last_heartbeat_at: string | null
          lecture_id: string
          student_id: string
          updated_at: string
          watched_seconds: number
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          last_heartbeat_at?: string | null
          lecture_id: string
          student_id: string
          updated_at?: string
          watched_seconds?: number
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          last_heartbeat_at?: string | null
          lecture_id?: string
          student_id?: string
          updated_at?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_watch_sessions_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "video_lectures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_watch_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allocate_roll_number: {
        Args: { p_grade: string; p_section: string; p_year: number }
        Returns: number
      }
      current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      enrol_student: {
        Args: {
          p_address?: string
          p_full_name: string
          p_gr_number?: string
          p_grade_level: string
          p_guardian_profession?: string
          p_is_late_enrollment: boolean
          p_last_qualification?: string
          p_parent_id: string
          p_previous_school?: string
          p_program: string
          p_registration_fee?: number
          p_section: string
          p_stream?: string
          p_tuition_fee?: number
        }
        Returns: {
          academic_year: number
          address: string | null
          created_at: string
          deleted_at: string | null
          enrollment_date: string
          full_name: string
          gr_number: string | null
          grade_level: string
          guardian_profession: string | null
          id: string
          is_late_enrollment: boolean
          last_qualification: string | null
          previous_school: string | null
          program: string
          registration_fee: number | null
          registration_number: string
          roll_number: string
          section: string
          status: Database["public"]["Enums"]["student_status"]
          stream: string | null
          tuition_fee: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "students"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      attendance_status: "present" | "absent" | "late"
      enquiry_status:
        | "unread"
        | "contacted"
        | "awaiting_visit"
        | "enrolled"
        | "declined"
      exam_type: "monthly" | "half_yearly" | "final"
      notice_audience: "All" | "Students" | "Parents" | "Staff"
      notice_category: "Academic" | "Event" | "Holiday" | "Admissions"
      notification_channel: "whatsapp" | "sms"
      notification_status: "sent" | "failed"
      student_status: "active" | "inactive"
      user_role:
        | "super_admin"
        | "admissions_admin"
        | "attendance_admin"
        | "marks_admin"
        | "student"
        | "parent"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      attendance_status: ["present", "absent", "late"],
      enquiry_status: [
        "unread",
        "contacted",
        "awaiting_visit",
        "enrolled",
        "declined",
      ],
      exam_type: ["monthly", "half_yearly", "final"],
      notice_audience: ["All", "Students", "Parents", "Staff"],
      notice_category: ["Academic", "Event", "Holiday", "Admissions"],
      notification_channel: ["whatsapp", "sms"],
      notification_status: ["sent", "failed"],
      student_status: ["active", "inactive"],
      user_role: [
        "super_admin",
        "admissions_admin",
        "attendance_admin",
        "marks_admin",
        "student",
        "parent",
      ],
    },
  },
} as const
