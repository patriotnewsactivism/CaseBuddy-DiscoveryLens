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
      documents: {
        Row: {
          analysis: Json | null;
          bates_formatted: string;
          bates_number: number;
          bates_prefix: string;
          created_at: string;
          error_message: string | null;
          file_size: number | null;
          file_type: string;
          id: string;
          mime_type: string;
          name: string;
          project_id: string;
          status: 'processing' | 'complete' | 'failed';
          storage_path: string;
          updated_at: string;
        };
        Insert: {
          analysis?: Json | null;
          bates_formatted: string;
          bates_number: number;
          bates_prefix?: string;
          created_at?: string;
          error_message?: string | null;
          file_size?: number | null;
          file_type: string;
          id?: string;
          mime_type: string;
          name: string;
          project_id: string;
          status?: 'processing' | 'complete' | 'failed';
          storage_path: string;
          updated_at?: string;
        };
        Update: {
          analysis?: Json | null;
          bates_formatted?: string;
          bates_number?: number;
          bates_prefix?: string;
          created_at?: string;
          error_message?: string | null;
          file_size?: number | null;
          file_type?: string;
          id?: string;
          mime_type?: string;
          name?: string;
          project_id?: string;
          status?: 'processing' | 'complete' | 'failed';
          storage_path?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            columns: ['project_id'];
            foreignKeyName: 'documents_project_id_fkey';
            referencedColumns: ['id'];
            referencedRelation: 'projects';
            relationType: 'many-to-one';
          }
        ];
      };
      projects: {
        Row: {
          bates_counter: number;
          bates_prefix: string;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          bates_counter?: number;
          bates_prefix?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          bates_counter?: number;
          bates_prefix?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
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
