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
      // Add other tables as needed
    }
  }
}
