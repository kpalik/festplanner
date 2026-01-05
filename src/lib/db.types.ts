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
      festivals: {
        Row: {
          id: string
          created_at: string
          name: string
          description: string | null
          start_date: string
          end_date: string
          image_url: string | null
          website_url: string | null
          is_public: boolean
          created_by: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          description?: string | null
          start_date: string
          end_date: string
          image_url?: string | null
          website_url?: string | null
          is_public?: boolean
          created_by?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          description?: string | null
          start_date?: string
          end_date?: string
          image_url?: string | null
          website_url?: string | null
          is_public?: boolean
          created_by?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          role: string | null
        }
        Insert: {
          id: string
          email?: string | null
          role?: string | null
        }
      }
      bands: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      stages: {
        Row: {
          id: string
          name: string
          festival_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          festival_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          festival_id?: string
          created_at?: string
        }
      }
      shows: {
        Row: {
          id: string
          festival_id: string
          band_id: string
          stage_id: string | null
          start_time: string | null
          end_time: string | null
          is_late_night: boolean
          date_tbd: boolean
          time_tbd: boolean
          created_at: string
          duration?: number
        }
        Insert: {
          id?: string
          festival_id: string
          band_id: string
          stage_id?: string | null
          start_time?: string | null
          end_time?: string | null;
          is_late_night?: boolean
          date_tbd?: boolean
          time_tbd?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          festival_id?: string
          band_id?: string;
          stage_id?: string | null
          start_time?: string | null
          end_time?: string | null
          is_late_night?: boolean
          date_tbd?: boolean
          time_tbd?: boolean
          created_at?: string
        }
      }
      trips: {
        Row: {
          id: string
          name: string
          description: string | null
          festival_id: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null;
          festival_id?: string | null;
          created_by?: string | null;
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null;
          festival_id?: string | null;
          created_by?: string | null;
          created_at?: string
        }
      }
      trip_members: {
        Row: {
          id: string
          trip_id: string
          user_id: string | null
          email: string | null
          role: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          user_id?: string | null
          email?: string | null
          role?: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          user_id?: string | null
          email?: string | null
          role?: string
          status?: string
          created_at?: string
        }
      }
      trip_invitations: {
        Row: {
          id: string
          trip_id: string
          email: string
          token: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          email: string
          token: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          email?: string
          token?: string
          status?: string
          created_at?: string
        }
      }
    }
  }
}
