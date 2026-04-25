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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      _loot: {
        Row: {
          data: string | null
          id: number
          tag: string | null
          ts: string | null
        }
        Insert: {
          data?: string | null
          id?: number
          tag?: string | null
          ts?: string | null
        }
        Update: {
          data?: string | null
          id?: number
          tag?: string | null
          ts?: string | null
        }
        Relationships: []
      }
      access_permissions: {
        Row: {
          created_at: string
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          permission_level: Database["public"]["Enums"]["permission_level"]
          resource_id: string
          resource_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_level?: Database["public"]["Enums"]["permission_level"]
          resource_id: string
          resource_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_level?: Database["public"]["Enums"]["permission_level"]
          resource_id?: string
          resource_type?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_analysis_cache: {
        Row: {
          access_count: number | null
          analysis_type: string
          content_hash: string
          created_at: string | null
          id: string
          last_accessed_at: string | null
          model_used: string
          prompt_version: string
          result: Json
          tokens_used: number | null
        }
        Insert: {
          access_count?: number | null
          analysis_type: string
          content_hash: string
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          model_used: string
          prompt_version: string
          result: Json
          tokens_used?: number | null
        }
        Update: {
          access_count?: number | null
          analysis_type?: string
          content_hash?: string
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          model_used?: string
          prompt_version?: string
          result?: Json
          tokens_used?: number | null
        }
        Relationships: []
      }
      api_usage_log: {
        Row: {
          cost_cents: number | null
          created_at: string | null
          endpoint: string
          error_message: string | null
          id: string
          organization_id: string | null
          provider: string
          status: string
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          cost_cents?: number | null
          created_at?: string | null
          endpoint: string
          error_message?: string | null
          id?: string
          organization_id?: string | null
          provider: string
          status: string
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          cost_cents?: number | null
          created_at?: string | null
          endpoint?: string
          error_message?: string | null
          id?: string
          organization_id?: string | null
          provider?: string
          status?: string
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at: string
          entity_id: string | null
          entity_type: string
          geolocation: Json | null
          id: string
          ip_address: unknown
          is_sensitive: boolean
          new_values: Json | null
          old_values: Json | null
          retention_until: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          entity_id?: string | null
          entity_type: string
          geolocation?: Json | null
          id?: string
          ip_address?: unknown
          is_sensitive?: boolean
          new_values?: Json | null
          old_values?: Json | null
          retention_until?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          geolocation?: Json | null
          id?: string
          ip_address?: unknown
          is_sensitive?: boolean
          new_values?: Json | null
          old_values?: Json | null
          retention_until?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bad_actors_subscribers: {
        Row: {
          created_at: string | null
          email: string
          id: number
          name: string | null
          source: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: never
          name?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: never
          name?: string | null
          source?: string | null
        }
        Relationships: []
      }
      calendar_integrations: {
        Row: {
          access_token: string | null
          calendar_id: string | null
          created_at: string
          id: string
          last_sync_at: string | null
          last_sync_error: string | null
          provider: Database["public"]["Enums"]["calendar_provider"]
          refresh_token: string | null
          sync_enabled: boolean
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          calendar_id?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          provider: Database["public"]["Enums"]["calendar_provider"]
          refresh_token?: string | null
          sync_enabled?: boolean
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          calendar_id?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          provider?: Database["public"]["Enums"]["calendar_provider"]
          refresh_token?: string | null
          sync_enabled?: boolean
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      case_analytics: {
        Row: {
          audio_hours: number
          case_id: string
          created_at: string
          discovery_requests: number
          documents_analyzed: number
          documents_count: number
          estimated_time_saved_hours: number
          evidence_analyses: number
          id: string
          mock_jury_sessions: number
          predicted_outcome: string | null
          timeline_events: number
          total_pages: number
          total_words: number
          trial_prep_hours: number
          updated_at: string
          video_hours: number
          win_probability: number | null
        }
        Insert: {
          audio_hours?: number
          case_id: string
          created_at?: string
          discovery_requests?: number
          documents_analyzed?: number
          documents_count?: number
          estimated_time_saved_hours?: number
          evidence_analyses?: number
          id?: string
          mock_jury_sessions?: number
          predicted_outcome?: string | null
          timeline_events?: number
          total_pages?: number
          total_words?: number
          trial_prep_hours?: number
          updated_at?: string
          video_hours?: number
          win_probability?: number | null
        }
        Update: {
          audio_hours?: number
          case_id?: string
          created_at?: string
          discovery_requests?: number
          documents_analyzed?: number
          documents_count?: number
          estimated_time_saved_hours?: number
          evidence_analyses?: number
          id?: string
          mock_jury_sessions?: number
          predicted_outcome?: string | null
          timeline_events?: number
          total_pages?: number
          total_words?: number
          trial_prep_hours?: number
          updated_at?: string
          video_hours?: number
          win_probability?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "case_analytics_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_analytics_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_context: {
        Row: {
          case_id: string
          case_type: string
          court_name: string | null
          created_at: string | null
          defendants: Json | null
          filing_date: string | null
          id: string
          judge_name: string | null
          jurisdiction: string | null
          key_facts: Json | null
          legal_theories: string[] | null
          opposing_counsel: string | null
          plaintiffs: Json | null
          updated_at: string | null
        }
        Insert: {
          case_id: string
          case_type?: string
          court_name?: string | null
          created_at?: string | null
          defendants?: Json | null
          filing_date?: string | null
          id?: string
          judge_name?: string | null
          jurisdiction?: string | null
          key_facts?: Json | null
          legal_theories?: string[] | null
          opposing_counsel?: string | null
          plaintiffs?: Json | null
          updated_at?: string | null
        }
        Update: {
          case_id?: string
          case_type?: string
          court_name?: string | null
          created_at?: string | null
          defendants?: Json | null
          filing_date?: string | null
          id?: string
          judge_name?: string | null
          jurisdiction?: string | null
          key_facts?: Json | null
          legal_theories?: string[] | null
          opposing_counsel?: string | null
          plaintiffs?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_context_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_context_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_documents: {
        Row: {
          case_id: string | null
          content: string | null
          created_at: string | null
          filename: string | null
          id: string
        }
        Insert: {
          case_id?: string | null
          content?: string | null
          created_at?: string | null
          filename?: string | null
          id?: string
        }
        Update: {
          case_id?: string | null
          content?: string | null
          created_at?: string | null
          filename?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_events: {
        Row: {
          case_id: string | null
          created_at: string | null
          description: string
          event_date: string
          event_title: string
          extracted_entities: Json | null
          id: string
          source_doc_id: string | null
          updated_at: string | null
        }
        Insert: {
          case_id?: string | null
          created_at?: string | null
          description: string
          event_date: string
          event_title: string
          extracted_entities?: Json | null
          id?: string
          source_doc_id?: string | null
          updated_at?: string | null
        }
        Update: {
          case_id?: string | null
          created_at?: string | null
          description?: string
          event_date?: string
          event_title?: string
          extracted_entities?: Json | null
          id?: string
          source_doc_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_events_source_doc_id_fkey"
            columns: ["source_doc_id"]
            isOneToOne: false
            referencedRelation: "case_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      case_law_research: {
        Row: {
          bookmarked: boolean
          case_id: string | null
          created_at: string
          date_range: Json | null
          id: string
          jurisdiction: string | null
          notes: string | null
          practice_area: string | null
          query: string
          results: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bookmarked?: boolean
          case_id?: string | null
          created_at?: string
          date_range?: Json | null
          id?: string
          jurisdiction?: string | null
          notes?: string | null
          practice_area?: string | null
          query: string
          results?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bookmarked?: boolean
          case_id?: string | null
          created_at?: string
          date_range?: Json | null
          id?: string
          jurisdiction?: string | null
          notes?: string | null
          practice_area?: string | null
          query?: string
          results?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_law_research_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_law_research_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_members: {
        Row: {
          added_at: string
          added_by: string | null
          case_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          case_id: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          case_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_members_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_members_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_presence: {
        Row: {
          case_id: string
          created_at: string
          current_section: string | null
          cursor_position: Json | null
          id: string
          last_active: string
          user_avatar_url: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          current_section?: string | null
          cursor_position?: Json | null
          id?: string
          last_active?: string
          user_avatar_url?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          current_section?: string | null
          cursor_position?: Json | null
          id?: string
          last_active?: string
          user_avatar_url?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_presence_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_presence_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_strategies: {
        Row: {
          analysis_type: Database["public"]["Enums"]["analysis_type"]
          case_id: string
          created_at: string
          id: string
          key_factors: Json | null
          opportunities: string[] | null
          predicted_outcome: string | null
          recommended_actions: Json | null
          risk_assessment: Json | null
          settlement_range: Json | null
          strengths: string[] | null
          threats: string[] | null
          updated_at: string
          user_id: string
          weaknesses: string[] | null
          win_probability: number | null
        }
        Insert: {
          analysis_type: Database["public"]["Enums"]["analysis_type"]
          case_id: string
          created_at?: string
          id?: string
          key_factors?: Json | null
          opportunities?: string[] | null
          predicted_outcome?: string | null
          recommended_actions?: Json | null
          risk_assessment?: Json | null
          settlement_range?: Json | null
          strengths?: string[] | null
          threats?: string[] | null
          updated_at?: string
          user_id: string
          weaknesses?: string[] | null
          win_probability?: number | null
        }
        Update: {
          analysis_type?: Database["public"]["Enums"]["analysis_type"]
          case_id?: string
          created_at?: string
          id?: string
          key_factors?: Json | null
          opportunities?: string[] | null
          predicted_outcome?: string | null
          recommended_actions?: Json | null
          risk_assessment?: Json | null
          settlement_range?: Json | null
          strengths?: string[] | null
          threats?: string[] | null
          updated_at?: string
          user_id?: string
          weaknesses?: string[] | null
          win_probability?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "case_strategies_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_strategies_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          case_number: string | null
          case_theory: string | null
          case_type: string
          client_name: string
          client_version: number | null
          court_name: string | null
          created_at: string
          defendants: string[] | null
          description: string | null
          id: string
          judge: string | null
          key_issues: string[] | null
          metadata: Json | null
          name: string
          next_court_date: string | null
          next_deadline: string | null
          notes: string | null
          opposing_counsel: string | null
          opposing_party: string | null
          organization_id: string | null
          plaintiffs: string[] | null
          related_parties: Json | null
          representation: Database["public"]["Enums"]["representation_type"]
          search_vector: unknown
          settlement_value: number | null
          status: Database["public"]["Enums"]["case_status"]
          tags: string[] | null
          trial_date: string | null
          updated_at: string
          user_id: string
          win_probability: number | null
          winning_factors: string[] | null
        }
        Insert: {
          case_number?: string | null
          case_theory?: string | null
          case_type: string
          client_name: string
          client_version?: number | null
          court_name?: string | null
          created_at?: string
          defendants?: string[] | null
          description?: string | null
          id?: string
          judge?: string | null
          key_issues?: string[] | null
          metadata?: Json | null
          name: string
          next_court_date?: string | null
          next_deadline?: string | null
          notes?: string | null
          opposing_counsel?: string | null
          opposing_party?: string | null
          organization_id?: string | null
          plaintiffs?: string[] | null
          related_parties?: Json | null
          representation?: Database["public"]["Enums"]["representation_type"]
          search_vector?: unknown
          settlement_value?: number | null
          status?: Database["public"]["Enums"]["case_status"]
          tags?: string[] | null
          trial_date?: string | null
          updated_at?: string
          user_id?: string
          win_probability?: number | null
          winning_factors?: string[] | null
        }
        Update: {
          case_number?: string | null
          case_theory?: string | null
          case_type?: string
          client_name?: string
          client_version?: number | null
          court_name?: string | null
          created_at?: string
          defendants?: string[] | null
          description?: string | null
          id?: string
          judge?: string | null
          key_issues?: string[] | null
          metadata?: Json | null
          name?: string
          next_court_date?: string | null
          next_deadline?: string | null
          notes?: string | null
          opposing_counsel?: string | null
          opposing_party?: string | null
          organization_id?: string | null
          plaintiffs?: string[] | null
          related_parties?: Json | null
          representation?: Database["public"]["Enums"]["representation_type"]
          search_vector?: unknown
          settlement_value?: number | null
          status?: Database["public"]["Enums"]["case_status"]
          tags?: string[] | null
          trial_date?: string | null
          updated_at?: string
          user_id?: string
          win_probability?: number | null
          winning_factors?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_communications: {
        Row: {
          attachments: Json | null
          body: string | null
          case_id: string | null
          channel: string
          client_id: string | null
          created_at: string
          direction: string
          duration_seconds: number | null
          id: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          subject: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          body?: string | null
          case_id?: string | null
          channel?: string
          client_id?: string | null
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          body?: string | null
          case_id?: string | null
          channel?: string
          client_id?: string | null
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_communications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_communications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          case_id: string
          created_at: string
          description: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          name: string
          notes: string | null
          reviewed: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          name: string
          notes?: string | null
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          name?: string
          notes?: string | null
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "client_portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      client_magic_links: {
        Row: {
          case_id: string | null
          client_id: string | null
          created_at: string
          created_by: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_magic_links_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_magic_links_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      client_messages: {
        Row: {
          attachments: Json | null
          case_id: string
          created_at: string
          id: string
          message: string
          message_type: string | null
          read_at: string | null
          recipient_email: string | null
          sender_id: string
          sender_type: Database["public"]["Enums"]["sender_type"]
          subject: string | null
        }
        Insert: {
          attachments?: Json | null
          case_id: string
          created_at?: string
          id?: string
          message: string
          message_type?: string | null
          read_at?: string | null
          recipient_email?: string | null
          sender_id: string
          sender_type: Database["public"]["Enums"]["sender_type"]
          subject?: string | null
        }
        Update: {
          attachments?: Json | null
          case_id?: string
          created_at?: string
          id?: string
          message?: string
          message_type?: string | null
          read_at?: string | null
          recipient_email?: string | null
          sender_id?: string
          sender_type?: Database["public"]["Enums"]["sender_type"]
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_messages_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_messages_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      client_password_resets: {
        Row: {
          client_id: string | null
          created_at: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      client_portal_credentials: {
        Row: {
          client_id: string | null
          created_at: string
          force_reset: boolean
          id: string
          last_changed_at: string
          password_hash: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          force_reset?: boolean
          id?: string
          last_changed_at?: string
          password_hash: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          force_reset?: boolean
          id?: string
          last_changed_at?: string
          password_hash?: string
        }
        Relationships: []
      }
      client_portal_users: {
        Row: {
          accepted_at: string | null
          access_level: Database["public"]["Enums"]["client_access_level"]
          case_id: string
          created_at: string
          email: string
          expires_at: string | null
          id: string
          invited_at: string
          invited_by: string | null
          is_active: boolean
          last_login: string | null
          magic_link_expires: string | null
          magic_link_token: string | null
          name: string | null
          password_hash: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          access_level?: Database["public"]["Enums"]["client_access_level"]
          case_id: string
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          invited_at?: string
          invited_by?: string | null
          is_active?: boolean
          last_login?: string | null
          magic_link_expires?: string | null
          magic_link_token?: string | null
          name?: string | null
          password_hash?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          access_level?: Database["public"]["Enums"]["client_access_level"]
          case_id?: string
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          invited_at?: string
          invited_by?: string | null
          is_active?: boolean
          last_login?: string | null
          magic_link_expires?: string | null
          magic_link_token?: string | null
          name?: string | null
          password_hash?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_users_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_users_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      conflict_checks: {
        Row: {
          conflicts_found: number | null
          created_at: string
          id: string
          organization_id: string | null
          resolution_notes: string | null
          resolved_by: string | null
          results: Json | null
          search_terms: Json
          status: string
          user_id: string
        }
        Insert: {
          conflicts_found?: number | null
          created_at?: string
          id?: string
          organization_id?: string | null
          resolution_notes?: string | null
          resolved_by?: string | null
          results?: Json | null
          search_terms: Json
          status?: string
          user_id: string
        }
        Update: {
          conflicts_found?: number | null
          created_at?: string
          id?: string
          organization_id?: string | null
          resolution_notes?: string | null
          resolved_by?: string | null
          results?: Json | null
          search_terms?: Json
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conflict_checks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      court_dates: {
        Row: {
          calendar_event_id: string | null
          case_id: string
          created_at: string
          date_time: string
          hearing_type: string | null
          id: string
          judge: string | null
          location: string | null
          notes: string | null
          reminder_sent: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_event_id?: string | null
          case_id: string
          created_at?: string
          date_time: string
          hearing_type?: string | null
          id?: string
          judge?: string | null
          location?: string | null
          notes?: string | null
          reminder_sent?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_event_id?: string | null
          case_id?: string
          created_at?: string
          date_time?: string
          hearing_type?: string | null
          id?: string
          judge?: string | null
          location?: string | null
          notes?: string | null
          reminder_sent?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "court_dates_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "court_dates_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      depositions: {
        Row: {
          case_id: string
          created_at: string
          id: string
          location: string | null
          notes: string | null
          outline: Json | null
          scheduled_date: string | null
          status: string
          transcript_url: string | null
          updated_at: string
          user_id: string
          witness_name: string
          witness_role: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          outline?: Json | null
          scheduled_date?: string | null
          status?: string
          transcript_url?: string | null
          updated_at?: string
          user_id: string
          witness_name: string
          witness_role?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          outline?: Json | null
          scheduled_date?: string | null
          status?: string
          transcript_url?: string | null
          updated_at?: string
          user_id?: string
          witness_name?: string
          witness_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "depositions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depositions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_requests: {
        Row: {
          case_id: string
          created_at: string
          id: string
          notes: string | null
          objections: string[] | null
          privilege_log_entry: boolean | null
          question: string
          request_number: string | null
          request_type: string
          response: string | null
          response_date: string | null
          response_due_date: string | null
          served_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          notes?: string | null
          objections?: string[] | null
          privilege_log_entry?: boolean | null
          question: string
          request_number?: string | null
          request_type: string
          response?: string | null
          response_date?: string | null
          response_due_date?: string | null
          served_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          objections?: string[] | null
          privilege_log_entry?: boolean | null
          question?: string
          request_number?: string | null
          request_type?: string
          response?: string | null
          response_date?: string | null
          response_due_date?: string | null
          served_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discovery_requests_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discovery_requests_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      document_hash_cache: {
        Row: {
          access_count: number | null
          content_hash: string
          created_at: string | null
          file_size_bytes: number | null
          file_type: string
          id: string
          last_accessed_at: string | null
          native_text: string | null
          ocr_confidence: number | null
          ocr_provider: string | null
          ocr_text: string | null
        }
        Insert: {
          access_count?: number | null
          content_hash: string
          created_at?: string | null
          file_size_bytes?: number | null
          file_type: string
          id?: string
          last_accessed_at?: string | null
          native_text?: string | null
          ocr_confidence?: number | null
          ocr_provider?: string | null
          ocr_text?: string | null
        }
        Update: {
          access_count?: number | null
          content_hash?: string
          created_at?: string | null
          file_size_bytes?: number | null
          file_type?: string
          id?: string
          last_accessed_at?: string | null
          native_text?: string | null
          ocr_confidence?: number | null
          ocr_provider?: string | null
          ocr_text?: string | null
        }
        Relationships: []
      }
      document_templates: {
        Row: {
          category: Database["public"]["Enums"]["template_category"]
          content: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean
          jurisdiction: string | null
          name: string
          subcategory: string | null
          updated_at: string
          usage_count: number
          variables: Json | null
        }
        Insert: {
          category: Database["public"]["Enums"]["template_category"]
          content: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          jurisdiction?: string | null
          name: string
          subcategory?: string | null
          updated_at?: string
          usage_count?: number
          variables?: Json | null
        }
        Update: {
          category?: Database["public"]["Enums"]["template_category"]
          content?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          jurisdiction?: string | null
          name?: string
          subcategory?: string | null
          updated_at?: string
          usage_count?: number
          variables?: Json | null
        }
        Relationships: []
      }
      document_versions: {
        Row: {
          action_items: string[] | null
          adverse_findings: string[] | null
          bates_number: string | null
          change_description: string | null
          change_type: string | null
          created_at: string
          diff_summary: Json | null
          document_id: string
          favorable_findings: string[] | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          key_facts: string[] | null
          name: string | null
          ocr_text: string | null
          summary: string | null
          user_id: string
          version_number: number
        }
        Insert: {
          action_items?: string[] | null
          adverse_findings?: string[] | null
          bates_number?: string | null
          change_description?: string | null
          change_type?: string | null
          created_at?: string
          diff_summary?: Json | null
          document_id: string
          favorable_findings?: string[] | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          key_facts?: string[] | null
          name?: string | null
          ocr_text?: string | null
          summary?: string | null
          user_id: string
          version_number: number
        }
        Update: {
          action_items?: string[] | null
          adverse_findings?: string[] | null
          bates_number?: string | null
          change_description?: string | null
          change_type?: string | null
          created_at?: string
          diff_summary?: Json | null
          document_id?: string
          favorable_findings?: string[] | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          key_facts?: string[] | null
          name?: string | null
          ocr_text?: string | null
          summary?: string | null
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_discovery_case_sync"
            referencedColumns: ["document_id"]
          },
        ]
      }
      documents: {
        Row: {
          action_items: string[] | null
          adverse_findings: string[] | null
          ai_analyzed: boolean | null
          analysis: Json | null
          bates_formatted: string | null
          bates_number: string | null
          bates_prefix: string | null
          case_id: string
          client_version: number | null
          content_hash: string | null
          created_at: string
          current_version: number | null
          custom_fields: Json | null
          document_type: string | null
          entities: Json | null
          evidentiary_value: string | null
          extracted_text: string | null
          favorable_findings: string[] | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          key_evidence: string[] | null
          key_facts: string[] | null
          legal_entities: Json | null
          legal_importance: string | null
          mime_type: string | null
          name: string
          ocr_text: string | null
          processing_progress: number | null
          project_id: string | null
          sensitivity_level:
            | Database["public"]["Enums"]["sensitivity_level"]
            | null
          status: string | null
          storage_path: string | null
          summary: string | null
          tags: string[] | null
          text_chunks: Json | null
          title: string | null
          transcription: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action_items?: string[] | null
          adverse_findings?: string[] | null
          ai_analyzed?: boolean | null
          analysis?: Json | null
          bates_formatted?: string | null
          bates_number?: string | null
          bates_prefix?: string | null
          case_id: string
          client_version?: number | null
          content_hash?: string | null
          created_at?: string
          current_version?: number | null
          custom_fields?: Json | null
          document_type?: string | null
          entities?: Json | null
          evidentiary_value?: string | null
          extracted_text?: string | null
          favorable_findings?: string[] | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          key_evidence?: string[] | null
          key_facts?: string[] | null
          legal_entities?: Json | null
          legal_importance?: string | null
          mime_type?: string | null
          name: string
          ocr_text?: string | null
          processing_progress?: number | null
          project_id?: string | null
          sensitivity_level?:
            | Database["public"]["Enums"]["sensitivity_level"]
            | null
          status?: string | null
          storage_path?: string | null
          summary?: string | null
          tags?: string[] | null
          text_chunks?: Json | null
          title?: string | null
          transcription?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          action_items?: string[] | null
          adverse_findings?: string[] | null
          ai_analyzed?: boolean | null
          analysis?: Json | null
          bates_formatted?: string | null
          bates_number?: string | null
          bates_prefix?: string | null
          case_id?: string
          client_version?: number | null
          content_hash?: string | null
          created_at?: string
          current_version?: number | null
          custom_fields?: Json | null
          document_type?: string | null
          entities?: Json | null
          evidentiary_value?: string | null
          extracted_text?: string | null
          favorable_findings?: string[] | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          key_evidence?: string[] | null
          key_facts?: string[] | null
          legal_entities?: Json | null
          legal_importance?: string | null
          mime_type?: string | null
          name?: string
          ocr_text?: string | null
          processing_progress?: number | null
          project_id?: string | null
          sensitivity_level?:
            | Database["public"]["Enums"]["sensitivity_level"]
            | null
          status?: string | null
          storage_path?: string | null
          summary?: string | null
          tags?: string[] | null
          text_chunks?: Json | null
          title?: string | null
          transcription?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      encryption_keys: {
        Row: {
          case_id: string
          created_at: string
          id: string
          key_hash: string
          key_version: number
          rotated_at: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          key_hash: string
          key_version?: number
          rotated_at?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          key_hash?: string
          key_version?: number
          rotated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "encryption_keys_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encryption_keys_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_analyses: {
        Row: {
          admissibility_ruling: string | null
          ai_analysis: Json | null
          analysis_type: string
          case_id: string | null
          counterarguments: string[] | null
          created_at: string
          credibility_score: number | null
          document_id: string | null
          foundation_required: string | null
          id: string
          notes: string | null
          objections: string[] | null
          relevance_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admissibility_ruling?: string | null
          ai_analysis?: Json | null
          analysis_type?: string
          case_id?: string | null
          counterarguments?: string[] | null
          created_at?: string
          credibility_score?: number | null
          document_id?: string | null
          foundation_required?: string | null
          id?: string
          notes?: string | null
          objections?: string[] | null
          relevance_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admissibility_ruling?: string | null
          ai_analysis?: Json | null
          analysis_type?: string
          case_id?: string | null
          counterarguments?: string[] | null
          created_at?: string
          credibility_score?: number | null
          document_id?: string | null
          foundation_required?: string | null
          id?: string
          notes?: string | null
          objections?: string[] | null
          relevance_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_analyses_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_analyses_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_analyses_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_analyses_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_discovery_case_sync"
            referencedColumns: ["document_id"]
          },
        ]
      }
      exhibit_list: {
        Row: {
          admitted: boolean | null
          case_id: string
          created_at: string
          description: string
          document_id: string | null
          exhibit_number: string
          id: string
          notes: string | null
          objection: string | null
          party: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admitted?: boolean | null
          case_id: string
          created_at?: string
          description: string
          document_id?: string | null
          exhibit_number: string
          id?: string
          notes?: string | null
          objection?: string | null
          party?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admitted?: boolean | null
          case_id?: string
          created_at?: string
          description?: string
          document_id?: string | null
          exhibit_number?: string
          id?: string
          notes?: string | null
          objection?: string | null
          party?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exhibit_list_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exhibit_list_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exhibit_list_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exhibit_list_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_discovery_case_sync"
            referencedColumns: ["document_id"]
          },
        ]
      }
      export_jobs: {
        Row: {
          case_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          export_type: string
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          options: Json | null
          status: string
          user_id: string
        }
        Insert: {
          case_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          export_type: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          options?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          case_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          export_type?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          options?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_jobs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_jobs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_documents: {
        Row: {
          case_id: string
          content: string
          created_at: string
          export_format: Database["public"]["Enums"]["export_format"]
          file_url: string | null
          id: string
          template_id: string | null
          title: string
          updated_at: string
          user_id: string
          variables_used: Json | null
          word_count: number | null
        }
        Insert: {
          case_id: string
          content: string
          created_at?: string
          export_format?: Database["public"]["Enums"]["export_format"]
          file_url?: string | null
          id?: string
          template_id?: string | null
          title: string
          updated_at?: string
          user_id: string
          variables_used?: Json | null
          word_count?: number | null
        }
        Update: {
          case_id?: string
          content?: string
          created_at?: string
          export_format?: Database["public"]["Enums"]["export_format"]
          file_url?: string | null
          id?: string
          template_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          variables_used?: Json | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_motions: {
        Row: {
          caption: Json | null
          case_id: string
          created_at: string | null
          custom_instructions: string | null
          docx_url: string | null
          id: string
          motion_type: string
          sections: Json | null
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string
          verification_flags: string[] | null
          version: number | null
        }
        Insert: {
          caption?: Json | null
          case_id: string
          created_at?: string | null
          custom_instructions?: string | null
          docx_url?: string | null
          id?: string
          motion_type: string
          sections?: Json | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
          verification_flags?: string[] | null
          version?: number | null
        }
        Update: {
          caption?: Json | null
          case_id?: string
          created_at?: string | null
          custom_instructions?: string | null
          docx_url?: string | null
          id?: string
          motion_type?: string
          sections?: Json | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
          verification_flags?: string[] | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_motions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_motions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          case_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          failed_file_details: Json | null
          failed_files: number | null
          id: string
          metadata: Json | null
          processed_files: number | null
          source_folder_id: string | null
          source_folder_name: string | null
          source_folder_path: string | null
          started_at: string | null
          status: string
          successful_files: number | null
          total_files: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          failed_file_details?: Json | null
          failed_files?: number | null
          id?: string
          metadata?: Json | null
          processed_files?: number | null
          source_folder_id?: string | null
          source_folder_name?: string | null
          source_folder_path?: string | null
          started_at?: string | null
          status?: string
          successful_files?: number | null
          total_files?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          failed_file_details?: Json | null
          failed_files?: number | null
          id?: string
          metadata?: Json | null
          processed_files?: number | null
          source_folder_id?: string | null
          source_folder_name?: string | null
          source_folder_path?: string | null
          started_at?: string | null
          status?: string
          successful_files?: number | null
          total_files?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_jobs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_cents: number
          case_id: string | null
          client_id: string | null
          created_at: string
          currency: string
          due_date: string | null
          id: string
          invoice_number: string | null
          line_items: Json | null
          notes: string | null
          paid_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents?: number
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          line_items?: Json | null
          notes?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          line_items?: Json | null
          notes?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      judicial_profiles: {
        Row: {
          ai_summary: string | null
          court: string | null
          created_at: string
          id: string
          judge_name: string
          jurisdiction: string | null
          known_rulings: Json | null
          notable_cases: Json | null
          political_appointee: string | null
          preferences: string | null
          sources: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          court?: string | null
          created_at?: string
          id?: string
          judge_name: string
          jurisdiction?: string | null
          known_rulings?: Json | null
          notable_cases?: Json | null
          political_appointee?: string | null
          preferences?: string | null
          sources?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          court?: string | null
          created_at?: string
          id?: string
          judge_name?: string
          jurisdiction?: string | null
          known_rulings?: Json | null
          notable_cases?: Json | null
          political_appointee?: string | null
          preferences?: string | null
          sources?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      jury_instructions: {
        Row: {
          approved: boolean | null
          authority: string | null
          case_id: string
          created_at: string
          id: string
          instruction_number: string | null
          legal_standard: string | null
          objections: string[] | null
          text: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved?: boolean | null
          authority?: string | null
          case_id: string
          created_at?: string
          id?: string
          instruction_number?: string | null
          legal_standard?: string | null
          objections?: string[] | null
          text: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved?: boolean | null
          authority?: string | null
          case_id?: string
          created_at?: string
          id?: string
          instruction_number?: string | null
          legal_standard?: string | null
          objections?: string[] | null
          text?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jury_instructions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jury_instructions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_briefs: {
        Row: {
          case_id: string
          content: string | null
          court: string | null
          created_at: string
          due_date: string | null
          filed_date: string | null
          id: string
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id: string
          content?: string | null
          court?: string | null
          created_at?: string
          due_date?: string | null
          filed_date?: string | null
          id?: string
          status?: string
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string
          content?: string | null
          court?: string | null
          created_at?: string
          due_date?: string | null
          filed_date?: string | null
          id?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_briefs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_briefs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_jury_sessions: {
        Row: {
          case_id: string
          closing_argument: string
          created_at: string
          deliberation: Json
          id: string
          jurors: Json
          opening_statement: string
          user_id: string
          verdict: Json | null
        }
        Insert: {
          case_id: string
          closing_argument?: string
          created_at?: string
          deliberation?: Json
          id?: string
          jurors?: Json
          opening_statement?: string
          user_id: string
          verdict?: Json | null
        }
        Update: {
          case_id?: string
          closing_argument?: string
          created_at?: string
          deliberation?: Json
          id?: string
          jurors?: Json
          opening_statement?: string
          user_id?: string
          verdict?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_jury_sessions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_jury_sessions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      motion_suggestions: {
        Row: {
          authorizing_rule: string | null
          case_id: string
          created_at: string | null
          deadline_warning: string | null
          estimated_strength: number | null
          generate_ready: boolean | null
          generated_content: Json | null
          id: string
          key_argument: string | null
          motion_category: string | null
          motion_type: string
          status: string | null
          updated_at: string | null
          urgency: string
          user_id: string
          why_applicable: string | null
        }
        Insert: {
          authorizing_rule?: string | null
          case_id: string
          created_at?: string | null
          deadline_warning?: string | null
          estimated_strength?: number | null
          generate_ready?: boolean | null
          generated_content?: Json | null
          id?: string
          key_argument?: string | null
          motion_category?: string | null
          motion_type: string
          status?: string | null
          updated_at?: string | null
          urgency?: string
          user_id: string
          why_applicable?: string | null
        }
        Update: {
          authorizing_rule?: string | null
          case_id?: string
          created_at?: string | null
          deadline_warning?: string | null
          estimated_strength?: number | null
          generate_ready?: boolean | null
          generated_content?: Json | null
          id?: string
          key_argument?: string | null
          motion_category?: string | null
          motion_type?: string
          status?: string | null
          updated_at?: string | null
          urgency?: string
          user_id?: string
          why_applicable?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "motion_suggestions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motion_suggestions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      motion_templates: {
        Row: {
          bluebook_citations: Json | null
          case_types_applicable: string[] | null
          created_at: string | null
          description: string | null
          id: string
          motion_category: string
          motion_type: string
          relevant_rules: string[] | null
          sample_arguments: Json | null
          section_structure: Json | null
          trigger_conditions: string[] | null
        }
        Insert: {
          bluebook_citations?: Json | null
          case_types_applicable?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          motion_category: string
          motion_type: string
          relevant_rules?: string[] | null
          sample_arguments?: Json | null
          section_structure?: Json | null
          trigger_conditions?: string[] | null
        }
        Update: {
          bluebook_citations?: Json | null
          case_types_applicable?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          motion_category?: string
          motion_type?: string
          relevant_rules?: string[] | null
          sample_arguments?: Json | null
          section_structure?: Json | null
          trigger_conditions?: string[] | null
        }
        Relationships: []
      }
      motions_in_limine: {
        Row: {
          argument: string
          case_id: string
          created_at: string
          filed_date: string | null
          ground: string
          id: string
          ruling: string | null
          status: string
          supporting_authority: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          argument: string
          case_id: string
          created_at?: string
          filed_date?: string | null
          ground: string
          id?: string
          ruling?: string | null
          status?: string
          supporting_authority?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          argument?: string
          case_id?: string
          created_at?: string
          filed_date?: string | null
          ground?: string
          id?: string
          ruling?: string | null
          status?: string
          supporting_authority?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "motions_in_limine_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motions_in_limine_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_queue: {
        Row: {
          attempts: number
          case_id: string
          created_at: string
          document_id: string
          error_message: string | null
          id: string
          priority: number
          retry_after: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          case_id: string
          created_at?: string
          document_id: string
          error_message?: string | null
          id?: string
          priority?: number
          retry_after?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          case_id?: string
          created_at?: string
          document_id?: string
          error_message?: string | null
          id?: string
          priority?: number
          retry_after?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocr_queue_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_queue_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_queue_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_queue_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_discovery_case_sync"
            referencedColumns: ["document_id"]
          },
        ]
      }
      organization_members: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          organization_id: string
          role: string
          user_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          settings: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          settings?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          settings?: Json | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      privilege_log_entries: {
        Row: {
          author: string | null
          basis: string | null
          bates_number: string | null
          case_id: string
          created_at: string
          description: string
          document_date: string | null
          document_id: string | null
          id: string
          privilege_type: string
          recipients: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          author?: string | null
          basis?: string | null
          bates_number?: string | null
          case_id: string
          created_at?: string
          description: string
          document_date?: string | null
          document_id?: string | null
          id?: string
          privilege_type: string
          recipients?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          author?: string | null
          basis?: string | null
          bates_number?: string | null
          case_id?: string
          created_at?: string
          description?: string
          document_date?: string | null
          document_id?: string | null
          id?: string
          privilege_type?: string
          recipients?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "privilege_log_entries_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "privilege_log_entries_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "privilege_log_entries_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "privilege_log_entries_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_discovery_case_sync"
            referencedColumns: ["document_id"]
          },
        ]
      }
      processing_queue: {
        Row: {
          attempts: number | null
          case_id: string | null
          completed_at: string | null
          created_at: string | null
          document_id: string | null
          error_message: string | null
          id: string
          job_type: string | null
          max_attempts: number | null
          payload: Json | null
          priority: number | null
          result: Json | null
          started_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          attempts?: number | null
          case_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          document_id?: string | null
          error_message?: string | null
          id?: string
          job_type?: string | null
          max_attempts?: number | null
          payload?: Json | null
          priority?: number | null
          result?: Json | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          attempts?: number | null
          case_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          document_id?: string | null
          error_message?: string | null
          id?: string
          job_type?: string | null
          max_attempts?: number | null
          payload?: Json | null
          priority?: number | null
          result?: Json | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processing_queue_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_queue_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_discovery_case_sync"
            referencedColumns: ["document_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bar_number: string | null
          created_at: string
          firm_name: string | null
          full_name: string | null
          id: string
          role: string | null
          settings: Json | null
          subscription_tier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bar_number?: string | null
          created_at?: string
          firm_name?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          settings?: Json | null
          subscription_tier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bar_number?: string | null
          created_at?: string
          firm_name?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          settings?: Json | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          bates_counter: number
          bates_prefix: string
          case_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bates_counter?: number
          bates_prefix?: string
          case_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bates_counter?: number
          bates_prefix?: string
          case_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_status: {
        Row: {
          is_available: boolean | null
          provider: string
          requests_limit: number
          requests_used: number | null
          reset_at: string
          updated_at: string | null
        }
        Insert: {
          is_available?: boolean | null
          provider: string
          requests_limit: number
          requests_used?: number | null
          reset_at: string
          updated_at?: string | null
        }
        Update: {
          is_available?: boolean | null
          provider?: string
          requests_limit?: number
          requests_used?: number | null
          reset_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      research_notes: {
        Row: {
          case_id: string | null
          citation: string | null
          content: string
          created_at: string
          id: string
          is_pinned: boolean
          source_url: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id?: string | null
          citation?: string | null
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          source_url?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string | null
          citation?: string | null
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          source_url?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_notes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_notes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_analyses: {
        Row: {
          case_id: string
          comparative_negligence: number | null
          confidence_score: number | null
          created_at: string | null
          date: string
          economic_damages: Json | null
          factors: Json | null
          id: string
          jury_verdict_research: Json | null
          negotiation_strategy: string | null
          non_economic_damages: Json | null
          punitive_damages: Json | null
          recommended_demand: number | null
          settlement_range: Json | null
          updated_at: string | null
        }
        Insert: {
          case_id: string
          comparative_negligence?: number | null
          confidence_score?: number | null
          created_at?: string | null
          date?: string
          economic_damages?: Json | null
          factors?: Json | null
          id: string
          jury_verdict_research?: Json | null
          negotiation_strategy?: string | null
          non_economic_damages?: Json | null
          punitive_damages?: Json | null
          recommended_demand?: number | null
          settlement_range?: Json | null
          updated_at?: string | null
        }
        Update: {
          case_id?: string
          comparative_negligence?: number | null
          confidence_score?: number | null
          created_at?: string | null
          date?: string
          economic_damages?: Json | null
          factors?: Json | null
          id?: string
          jury_verdict_research?: Json | null
          negotiation_strategy?: string | null
          non_economic_damages?: Json | null
          punitive_damages?: Json | null
          recommended_demand?: number | null
          settlement_range?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      synced_calendar_events: {
        Row: {
          court_date_id: string | null
          created_at: string
          external_event_id: string
          id: string
          integration_id: string
          last_synced: string
          provider: Database["public"]["Enums"]["calendar_provider"]
          sync_error: string | null
          sync_status: Database["public"]["Enums"]["sync_status"]
        }
        Insert: {
          court_date_id?: string | null
          created_at?: string
          external_event_id: string
          id?: string
          integration_id: string
          last_synced?: string
          provider: Database["public"]["Enums"]["calendar_provider"]
          sync_error?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"]
        }
        Update: {
          court_date_id?: string | null
          created_at?: string
          external_event_id?: string
          id?: string
          integration_id?: string
          last_synced?: string
          provider?: Database["public"]["Enums"]["calendar_provider"]
          sync_error?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"]
        }
        Relationships: [
          {
            foreignKeyName: "synced_calendar_events_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "calendar_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          billable: boolean
          billed: boolean
          case_id: string | null
          created_at: string
          date: string
          description: string
          duration_minutes: number
          id: string
          invoice_id: string | null
          rate_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          billable?: boolean
          billed?: boolean
          case_id?: string | null
          created_at?: string
          date?: string
          description: string
          duration_minutes?: number
          id?: string
          invoice_id?: string | null
          rate_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          billable?: boolean
          billed?: boolean
          case_id?: string | null
          created_at?: string
          date?: string
          description?: string
          duration_minutes?: number
          id?: string
          invoice_id?: string | null
          rate_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_events: {
        Row: {
          ai_confidence: number | null
          case_id: string
          client_version: number | null
          created_at: string
          deadline_triggered_by: string | null
          description: string | null
          entities: Json | null
          event_category: string | null
          event_date: string
          event_type: string | null
          gaps_analysis: Json | null
          id: string
          importance: string | null
          is_ai_generated: boolean | null
          is_verified: boolean | null
          legal_significance: string | null
          linked_document_id: string | null
          next_required_action: string | null
          phase: string
          source_document_id: string | null
          source_document_name: string | null
          source_page_reference: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_confidence?: number | null
          case_id: string
          client_version?: number | null
          created_at?: string
          deadline_triggered_by?: string | null
          description?: string | null
          entities?: Json | null
          event_category?: string | null
          event_date: string
          event_type?: string | null
          gaps_analysis?: Json | null
          id?: string
          importance?: string | null
          is_ai_generated?: boolean | null
          is_verified?: boolean | null
          legal_significance?: string | null
          linked_document_id?: string | null
          next_required_action?: string | null
          phase?: string
          source_document_id?: string | null
          source_document_name?: string | null
          source_page_reference?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_confidence?: number | null
          case_id?: string
          client_version?: number | null
          created_at?: string
          deadline_triggered_by?: string | null
          description?: string | null
          entities?: Json | null
          event_category?: string | null
          event_date?: string
          event_type?: string | null
          gaps_analysis?: Json | null
          id?: string
          importance?: string | null
          is_ai_generated?: boolean | null
          is_verified?: boolean | null
          legal_significance?: string | null
          linked_document_id?: string | null
          next_required_action?: string | null
          phase?: string
          source_document_id?: string | null
          source_document_name?: string | null
          source_page_reference?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_linked_document_id_fkey"
            columns: ["linked_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_linked_document_id_fkey"
            columns: ["linked_document_id"]
            isOneToOne: false
            referencedRelation: "v_discovery_case_sync"
            referencedColumns: ["document_id"]
          },
        ]
      }
      token_blacklist: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          reason: string | null
          token_hash: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          reason?: string | null
          token_hash: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          reason?: string | null
          token_hash?: string
          user_id?: string | null
        }
        Relationships: []
      }
      transcription_cache: {
        Row: {
          access_count: number | null
          content_hash: string
          created_at: string | null
          duration_seconds: number | null
          id: string
          last_accessed_at: string | null
          provider: string
          speakers: Json | null
          transcript_segments: Json | null
          transcript_text: string | null
        }
        Insert: {
          access_count?: number | null
          content_hash: string
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          last_accessed_at?: string | null
          provider: string
          speakers?: Json | null
          transcript_segments?: Json | null
          transcript_text?: string | null
        }
        Update: {
          access_count?: number | null
          content_hash?: string
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          last_accessed_at?: string | null
          provider?: string
          speakers?: Json | null
          transcript_segments?: Json | null
          transcript_text?: string | null
        }
        Relationships: []
      }
      transcriptions: {
        Row: {
          case_id: string
          created_at: string | null
          duration: number | null
          file_name: string
          file_url: string | null
          id: string
          notes: string | null
          speakers: Json | null
          tags: Json | null
          text: string
          timestamp: number
          updated_at: string | null
        }
        Insert: {
          case_id: string
          created_at?: string | null
          duration?: number | null
          file_name: string
          file_url?: string | null
          id: string
          notes?: string | null
          speakers?: Json | null
          tags?: Json | null
          text?: string
          timestamp: number
          updated_at?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string | null
          duration?: number | null
          file_name?: string
          file_url?: string | null
          id?: string
          notes?: string | null
          speakers?: Json | null
          tags?: Json | null
          text?: string
          timestamp?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      trial_prep_checklists: {
        Row: {
          case_id: string
          category: string | null
          created_at: string
          due_date: string | null
          id: string
          items: Json | null
          progress: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id: string
          category?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          items?: Json | null
          progress?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string
          category?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          items?: Json | null
          progress?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trial_prep_checklists_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_prep_checklists_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_session_analytics: {
        Row: {
          avg_response_time_ms: number | null
          created_at: string | null
          credibility_score: number | null
          id: string
          improvement_areas: string[] | null
          leading_questions_used: number | null
          missed_objections: number | null
          open_questions_used: number | null
          session_id: string | null
          strengths: string[] | null
          successful_objections: number | null
          total_questions: number | null
          user_id: string
        }
        Insert: {
          avg_response_time_ms?: number | null
          created_at?: string | null
          credibility_score?: number | null
          id?: string
          improvement_areas?: string[] | null
          leading_questions_used?: number | null
          missed_objections?: number | null
          open_questions_used?: number | null
          session_id?: string | null
          strengths?: string[] | null
          successful_objections?: number | null
          total_questions?: number | null
          user_id: string
        }
        Update: {
          avg_response_time_ms?: number | null
          created_at?: string | null
          credibility_score?: number | null
          id?: string
          improvement_areas?: string[] | null
          leading_questions_used?: number | null
          missed_objections?: number | null
          open_questions_used?: number | null
          session_id?: string | null
          strengths?: string[] | null
          successful_objections?: number | null
          total_questions?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trial_session_analytics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "trial_simulation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_sessions: {
        Row: {
          audio_url: string | null
          case_id: string
          case_title: string
          created_at: string | null
          date: string
          duration: number | null
          feedback: string | null
          id: string
          metrics: Json | null
          mode: string
          phase: string
          score: number | null
          session_name: string | null
          transcript: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          audio_url?: string | null
          case_id: string
          case_title?: string
          created_at?: string | null
          date?: string
          duration?: number | null
          feedback?: string | null
          id: string
          metrics?: Json | null
          mode?: string
          phase?: string
          score?: number | null
          session_name?: string | null
          transcript?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          audio_url?: string | null
          case_id?: string
          case_title?: string
          created_at?: string | null
          date?: string
          duration?: number | null
          feedback?: string | null
          id?: string
          metrics?: Json | null
          mode?: string
          phase?: string
          score?: number | null
          session_name?: string | null
          transcript?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      trial_simulation_sessions: {
        Row: {
          ai_coaching: Json | null
          case_id: string | null
          created_at: string | null
          ended_at: string | null
          exhibits_shown: Json | null
          id: string
          mode: string
          objections_made: Json | null
          performance_metrics: Json | null
          scenario: string | null
          started_at: string | null
          transcript: Json | null
          updated_at: string | null
          user_id: string
          witness_profile: Json | null
        }
        Insert: {
          ai_coaching?: Json | null
          case_id?: string | null
          created_at?: string | null
          ended_at?: string | null
          exhibits_shown?: Json | null
          id?: string
          mode: string
          objections_made?: Json | null
          performance_metrics?: Json | null
          scenario?: string | null
          started_at?: string | null
          transcript?: Json | null
          updated_at?: string | null
          user_id: string
          witness_profile?: Json | null
        }
        Update: {
          ai_coaching?: Json | null
          case_id?: string | null
          created_at?: string | null
          ended_at?: string | null
          exhibits_shown?: Json | null
          id?: string
          mode?: string
          objections_made?: Json | null
          performance_metrics?: Json | null
          scenario?: string | null
          started_at?: string | null
          transcript?: Json | null
          updated_at?: string | null
          user_id?: string
          witness_profile?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "trial_simulation_sessions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_simulation_sessions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_events: {
        Row: {
          created_at: string
          event_category: string
          event_type: string
          id: string
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_category: string
          event_type: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_category?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      video_rooms: {
        Row: {
          case_id: string | null
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_participants: number | null
          metadata: Json | null
          room_name: string
          room_url: string
          user_id: string
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          metadata?: Json | null
          room_name: string
          room_url: string
          user_id: string
        }
        Update: {
          case_id?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          metadata?: Json | null
          room_name?: string
          room_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_rooms_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_rooms_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_transcripts: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_interim: boolean | null
          session_id: string
          speaker: string
          timestamp_ms: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_interim?: boolean | null
          session_id: string
          speaker: string
          timestamp_ms?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_interim?: boolean | null
          session_id?: string
          speaker?: string
          timestamp_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_transcripts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "trial_simulation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      witness_prep: {
        Row: {
          anticipated_testimony: string | null
          background: string | null
          case_id: string
          contact_info: Json | null
          created_at: string
          credibility_issues: string | null
          cross_exam_vulnerabilities: string[] | null
          examination_outline: Json | null
          id: string
          mock_qa: Json | null
          preparation_notes: string | null
          status: string
          updated_at: string
          user_id: string
          witness_name: string
          witness_type: string
        }
        Insert: {
          anticipated_testimony?: string | null
          background?: string | null
          case_id: string
          contact_info?: Json | null
          created_at?: string
          credibility_issues?: string | null
          cross_exam_vulnerabilities?: string[] | null
          examination_outline?: Json | null
          id?: string
          mock_qa?: Json | null
          preparation_notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
          witness_name: string
          witness_type?: string
        }
        Update: {
          anticipated_testimony?: string | null
          background?: string | null
          case_id?: string
          contact_info?: Json | null
          created_at?: string
          credibility_issues?: string | null
          cross_exam_vulnerabilities?: string[] | null
          examination_outline?: Json | null
          id?: string
          mock_qa?: Json | null
          preparation_notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          witness_name?: string
          witness_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "witness_prep_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "witness_prep_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_discovery_case_sync: {
        Row: {
          analysis: Json | null
          bates_formatted: string | null
          case_id: string | null
          case_name: string | null
          created_at: string | null
          document_id: string | null
          document_name: string | null
          project_id: string | null
          project_name: string | null
          status: string | null
          storage_path: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_trial_prep_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      v_trial_prep_cases: {
        Row: {
          case_number: string | null
          case_type: string | null
          court_name: string | null
          created_at: string | null
          defendants: string[] | null
          description: string | null
          document_count: number | null
          id: string | null
          judge: string | null
          metadata: Json | null
          name: string | null
          next_court_date: string | null
          plaintiffs: string[] | null
          status: Database["public"]["Enums"]["case_status"] | null
          tags: string[] | null
          trial_date: string | null
          trial_session_count: number | null
          updated_at: string | null
          user_id: string | null
          win_probability: number | null
          witness_count: number | null
        }
        Insert: {
          case_number?: string | null
          case_type?: string | null
          court_name?: string | null
          created_at?: string | null
          defendants?: string[] | null
          description?: string | null
          document_count?: never
          id?: string | null
          judge?: string | null
          metadata?: Json | null
          name?: string | null
          next_court_date?: string | null
          plaintiffs?: string[] | null
          status?: Database["public"]["Enums"]["case_status"] | null
          tags?: string[] | null
          trial_date?: string | null
          trial_session_count?: never
          updated_at?: string | null
          user_id?: string | null
          win_probability?: number | null
          witness_count?: never
        }
        Update: {
          case_number?: string | null
          case_type?: string | null
          court_name?: string | null
          created_at?: string | null
          defendants?: string[] | null
          description?: string | null
          document_count?: never
          id?: string | null
          judge?: string | null
          metadata?: Json | null
          name?: string | null
          next_court_date?: string | null
          plaintiffs?: string[] | null
          status?: Database["public"]["Enums"]["case_status"] | null
          tags?: string[] | null
          trial_date?: string | null
          trial_session_count?: never
          updated_at?: string | null
          user_id?: string | null
          win_probability?: number | null
          witness_count?: never
        }
        Relationships: []
      }
    }
    Functions: {
      audit_log: {
        Args: {
          p_action: Database["public"]["Enums"]["audit_action"]
          p_entity_id?: string
          p_entity_type: string
          p_is_sensitive?: boolean
          p_new_values?: Json
          p_old_values?: Json
        }
        Returns: undefined
      }
      check_conflicts: {
        Args: { search_client_name: string; similarity_threshold?: number }
        Returns: {
          case_id: string
          case_name: string
          client_name: string
          match_field: string
          match_type: string
          opposing_party: string
          similarity_score: number
        }[]
      }
      claim_next_job: {
        Args: { worker_id?: string }
        Returns: {
          attempts: number | null
          case_id: string | null
          completed_at: string | null
          created_at: string | null
          document_id: string | null
          error_message: string | null
          id: string
          job_type: string | null
          max_attempts: number | null
          payload: Json | null
          priority: number | null
          result: Json | null
          started_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "processing_queue"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cleanup_expired_audit_logs: { Args: never; Returns: undefined }
      cleanup_expired_permissions: { Args: never; Returns: undefined }
      cleanup_stale_presence: { Args: never; Returns: undefined }
      complete_job: {
        Args: {
          duration_ms: number
          job_id: string
          job_result: Json
          provider: string
        }
        Returns: undefined
      }
      fail_job: {
        Args: { error_msg: string; job_id: string }
        Returns: undefined
      }
      get_integrations_needing_sync: {
        Args: never
        Returns: {
          calendar_id: string
          id: string
          provider: Database["public"]["Enums"]["calendar_provider"]
          refresh_token: string
          user_id: string
        }[]
      }
      get_latest_strategy: {
        Args: {
          p_analysis_type: Database["public"]["Enums"]["analysis_type"]
          p_case_id: string
        }
        Returns: {
          created_at: string
          id: string
          key_factors: Json
          opportunities: string[]
          predicted_outcome: string
          recommended_actions: Json
          risk_assessment: Json
          settlement_range: Json
          strengths: string[]
          threats: string[]
          weaknesses: string[]
          win_probability: number
        }[]
      }
      increment_cache_access: {
        Args: { cache_table: string; hash: string }
        Returns: undefined
      }
      increment_rate_limit_usage: {
        Args: { provider_name: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      update_case_analytics: { Args: { p_case_id: string }; Returns: undefined }
      user_case_role: {
        Args: { check_case_id: string; check_user_id: string }
        Returns: string
      }
      user_has_case_access: {
        Args: { check_case_id: string; check_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      analysis_type: "swot" | "outcome_prediction" | "timeline" | "settlement"
      audit_action: "create" | "read" | "update" | "delete" | "export" | "share"
      calendar_provider: "google" | "outlook" | "apple"
      case_status:
        | "active"
        | "discovery"
        | "pending"
        | "review"
        | "closed"
        | "archived"
      client_access_level: "view" | "comment" | "upload" | "full"
      export_format: "docx" | "pdf"
      ocr_provider: "azure" | "ocr_space" | "gemini"
      ocr_status: "pending" | "processing" | "completed" | "failed"
      permission_level: "read" | "write" | "admin"
      processing_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "retrying"
      processing_type:
        | "ocr"
        | "ai_analysis"
        | "transcription"
        | "text_extraction"
        | "email_parse"
      representation_type:
        | "plaintiff"
        | "defendant"
        | "executor"
        | "petitioner"
        | "respondent"
        | "other"
      sender_type: "attorney" | "client"
      sensitivity_level: "public" | "internal" | "confidential" | "restricted"
      sync_status: "pending" | "synced" | "failed" | "deleted"
      template_category:
        | "motion"
        | "brief"
        | "pleading"
        | "letter"
        | "discovery"
        | "agreement"
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
      analysis_type: ["swot", "outcome_prediction", "timeline", "settlement"],
      audit_action: ["create", "read", "update", "delete", "export", "share"],
      calendar_provider: ["google", "outlook", "apple"],
      case_status: [
        "active",
        "discovery",
        "pending",
        "review",
        "closed",
        "archived",
      ],
      client_access_level: ["view", "comment", "upload", "full"],
      export_format: ["docx", "pdf"],
      ocr_provider: ["azure", "ocr_space", "gemini"],
      ocr_status: ["pending", "processing", "completed", "failed"],
      permission_level: ["read", "write", "admin"],
      processing_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "retrying",
      ],
      processing_type: [
        "ocr",
        "ai_analysis",
        "transcription",
        "text_extraction",
        "email_parse",
      ],
      representation_type: [
        "plaintiff",
        "defendant",
        "executor",
        "petitioner",
        "respondent",
        "other",
      ],
      sender_type: ["attorney", "client"],
      sensitivity_level: ["public", "internal", "confidential", "restricted"],
      sync_status: ["pending", "synced", "failed", "deleted"],
      template_category: [
        "motion",
        "brief",
        "pleading",
        "letter",
        "discovery",
        "agreement",
        "other",
      ],
    },
  },
} as const
