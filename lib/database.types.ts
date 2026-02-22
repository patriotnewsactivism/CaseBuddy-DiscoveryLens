export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TextChunk = {
  index: number;
  text: string;
  charStart: number;
  charEnd: number;
};

export type Database = {
  public: {
    Tables: {
      documents: {
        Row: {
          analysis: Json | null;
          bates_formatted: string;
          bates_number: number;
          bates_prefix: string;
          content_hash: string | null;
          created_at: string;
          error_message: string | null;
          extracted_text: string | null;
          file_size: number | null;
          file_type: string;
          id: string;
          mime_type: string;
          name: string;
          processing_progress: number;
          project_id: string;
          status: 'processing' | 'complete' | 'failed';
          storage_path: string;
          text_chunks: Json | null;
          updated_at: string;
        };
        Insert: {
          analysis?: Json | null;
          bates_formatted: string;
          bates_number: number;
          bates_prefix?: string;
          content_hash?: string | null;
          created_at?: string;
          error_message?: string | null;
          extracted_text?: string | null;
          file_size?: number | null;
          file_type: string;
          id?: string;
          mime_type: string;
          name: string;
          processing_progress?: number;
          project_id: string;
          status?: 'processing' | 'complete' | 'failed';
          storage_path: string;
          text_chunks?: Json | null;
          updated_at?: string;
        };
        Update: {
          analysis?: Json | null;
          bates_formatted?: string;
          bates_number?: number;
          bates_prefix?: string;
          content_hash?: string | null;
          created_at?: string;
          error_message?: string | null;
          extracted_text?: string | null;
          file_size?: number | null;
          file_type?: string;
          id?: string;
          mime_type?: string;
          name?: string;
          processing_progress?: number;
          project_id?: string;
          status?: 'processing' | 'complete' | 'failed';
          storage_path?: string;
          text_chunks?: Json | null;
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
      job_queue: {
        Row: {
          id: string;
          project_id: string;
          document_id: string | null;
          job_type: 'extract' | 'analyze' | 'transcribe';
          priority: number;
          status: 'pending' | 'processing' | 'complete' | 'failed';
          attempts: number;
          max_attempts: number;
          error_message: string | null;
          created_at: string;
          started_at: string | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          document_id?: string | null;
          job_type: 'extract' | 'analyze' | 'transcribe';
          priority?: number;
          status?: 'pending' | 'processing' | 'complete' | 'failed';
          attempts?: number;
          max_attempts?: number;
          error_message?: string | null;
          created_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          document_id?: string | null;
          job_type?: 'extract' | 'analyze' | 'transcribe';
          priority?: number;
          status?: 'pending' | 'processing' | 'complete' | 'failed';
          attempts?: number;
          max_attempts?: number;
          error_message?: string | null;
          created_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Relationships: [
          {
            columns: ['project_id'];
            foreignKeyName: 'job_queue_project_id_fkey';
            referencedColumns: ['id'];
            referencedRelation: 'projects';
            relationType: 'many-to-one';
          },
          {
            columns: ['document_id'];
            foreignKeyName: 'job_queue_document_id_fkey';
            referencedColumns: ['id'];
            referencedRelation: 'documents';
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
