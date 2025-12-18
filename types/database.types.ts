export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
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
          file_type: 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'AUDIO';
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
          file_type: 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'AUDIO';
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
          file_type?: 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'AUDIO';
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
            foreignKeyName: 'documents_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
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
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      file_type: 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'AUDIO';
      document_status: 'processing' | 'complete' | 'failed';
    };
    CompositeTypes: Record<string, never>;
  };
}
