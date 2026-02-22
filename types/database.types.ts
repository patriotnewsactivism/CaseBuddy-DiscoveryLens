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

export interface Database {
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
          file_type: 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'AUDIO';
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
          file_type: 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'AUDIO';
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
          file_type?: 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'AUDIO';
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
            foreignKeyName: 'job_queue_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'job_queue_document_id_fkey';
            columns: ['document_id'];
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      file_type: 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'AUDIO';
      document_status: 'processing' | 'complete' | 'failed';
      job_type: 'extract' | 'analyze' | 'transcribe';
      job_status: 'pending' | 'processing' | 'complete' | 'failed';
    };
    CompositeTypes: Record<string, never>;
  };
}
