export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          created_at: string
          title: string
          description: string | null
          video_url: string
          user_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          title: string
          description?: string | null
          video_url: string
          user_id: string
        }
        Update: {
          id?: string
          created_at?: string
          title?: string
          description?: string | null
          video_url?: string
          user_id?: string
        }
      }
      feedback: {
        Row: {
          id: string
          created_at: string
          project_id: string
          user_id: string
          timestamp: number
          comment: string
          drawing_data: Json | null
          is_checked: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          project_id: string
          user_id: string
          timestamp: number
          comment: string
          drawing_data?: Json | null
          is_checked?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          project_id?: string
          user_id?: string
          timestamp?: number
          comment?: string
          drawing_data?: Json | null
          is_checked?: boolean
        }
      }
      replies: {
        Row: {
          id: string
          created_at: string
          feedback_id: string
          user_id: string
          comment: string
        }
        Insert: {
          id?: string
          created_at?: string
          feedback_id: string
          user_id: string
          comment: string
        }
        Update: {
          id?: string
          created_at?: string
          feedback_id?: string
          user_id?: string
          comment?: string
        }
      }
      reactions: {
        Row: {
          id: string
          created_at: string
          feedback_id: string
          user_id: string
          emoji: string
        }
        Insert: {
          id?: string
          created_at?: string
          feedback_id: string
          user_id: string
          emoji: string
        }
        Update: {
          id?: string
          created_at?: string
          feedback_id?: string
          user_id?: string
          emoji?: string
        }
      }
      profiles: {
        Row: {
          id: string
          updated_at: string
          full_name: string
          avatar_url: string
        }
        Insert: {
          id: string
          updated_at?: string
          full_name: string
          avatar_url: string
        }
        Update: {
          id?: string
          updated_at?: string
          full_name?: string
          avatar_url?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}