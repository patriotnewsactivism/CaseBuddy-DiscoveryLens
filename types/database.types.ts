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
          id: string;
          case_id: string | null;
          user_id: string | null;
          project_id: string | null;
          name: string;
          file_url: string | null;
          file_type: string | null;
          file_size: number | null;
          bates_number: string | null;
          bates_prefix: string | null;
          bates_formatted: string | null;
          mime_type: string | null;
          storage_path: string | null;
          summary: string | null;
          key_facts: string[] | null;
          favorable_findings: string[] | null;
          adverse_findings: string[] | null;
          action_items: string[] | null;
          ai_analyzed: boolean;
          status: string;
          extracted_text: string | null;
          text_chunks: Json | null;
          processing_progress: number;
          content_hash: string | null;
          analysis: Json | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          case_id?: string | null;
          user_id?: string | null;
          project_id?: string | null;
          name: string;
          file_url?: string | null;
          file_type?: string | null;
          file_size?: number | null;
          bates_number?: string | null;
          bates_prefix?: string | null;
          bates_formatted?: string | null;
          mime_type?: string | null;
          storage_path?: string | null;
          summary?: string | null;
          key_facts?: string[] | null;
          favorable_findings?: string[] | null;
          adverse_findings?: string[] | null;
          action_items?: string[] | null;
          ai_analyzed?: boolean;
          status?: string;
          extracted_text?: string | null;
          text_chunks?: Json | null;
          processing_progress?: number;
          content_hash?: string | null;
          analysis?: Json | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          case_id?: string | null;
          user_id?: string | null;
          project_id?: string | null;
          name?: string;
          file_url?: string | null;
          file_type?: string | null;
          file_size?: number | null;
          bates_number?: string | null;
          bates_prefix?: string | null;
          bates_formatted?: string | null;
          mime_type?: string | null;
          storage_path?: string | null;
          summary?: string | null;
          key_facts?: string[] | null;
          favorable_findings?: string[] | null;
          adverse_findings?: string[] | null;
          action_items?: string[] | null;
          ai_analyzed?: boolean;
          status?: string;
          extracted_text?: string | null;
          text_chunks?: Json | null;
          processing_progress?: number;
          content_hash?: string | null;
          analysis?: Json | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            columns: ['case_id'];
            foreignKeyName: 'documents_case_id_fkey';
            referencedColumns: ['id'];
            referencedRelation: 'cases';
            relationType: 'many-to-one';
          },
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
          id: string;
          name: string;
          description: string | null;
          bates_prefix: string;
          bates_counter: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          bates_prefix?: string;
          bates_counter?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          bates_prefix?: string;
          bates_counter?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cases: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          case_type: string | null;
          client_name: string | null;
          status: string;
          representation: string;
          case_theory: string | null;
          key_issues: string[] | null;
          winning_factors: string[] | null;
          next_deadline: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          case_type?: string | null;
          client_name?: string | null;
          status?: string;
          representation?: string;
          case_theory?: string | null;
          key_issues?: string[] | null;
          winning_factors?: string[] | null;
          next_deadline?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          case_type?: string | null;
          client_name?: string | null;
          status?: string;
          representation?: string;
          case_theory?: string | null;
          key_issues?: string[] | null;
          winning_factors?: string[] | null;
          next_deadline?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      job_queue: {
        Row: {
          id: string;
          project_id: string | null;
          document_id: string | null;
          job_type: string;
          priority: number;
          status: string;
          attempts: number;
          max_attempts: number;
          error_message: string | null;
          created_at: string;
          started_at: string | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          document_id?: string | null;
          job_type: string;
          priority?: number;
          status?: string;
          attempts?: number;
          max_attempts?: number;
          error_message?: string | null;
          created_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          document_id?: string | null;
          job_type?: string;
          priority?: number;
          status?: string;
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
    };
    Views: Record<string, never>;
    Functions: {
      cleanup_old_jobs: {
        Args: {
          days_to_keep?: number;
        };
        Returns: void;
      };
    };
    Enums: {
      case_status: 'active' | 'discovery' | 'pending' | 'review' | 'closed' | 'archived';
      representation_type: 'plaintiff' | 'defendant' | 'executor' | 'petitioner' | 'respondent' | 'other';
    };
    CompositeTypes: Record<string, never>;
  };
}
