// Ce fichier sera remplacé par la commande :
// npx supabase gen types typescript --project-id <id> > src/types/database.ts
// Les types ci-dessous permettent le développement avant de connecter Supabase.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      agencies: {
        Row: {
          id: string
          name: string
          slug: string
          owner_id: string
          stripe_customer_id: string | null
          logo_url: string | null
          website_url: string | null
          phone: string | null
          address: string | null
          referral_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          owner_id: string
          stripe_customer_id?: string | null
          logo_url?: string | null
          website_url?: string | null
          phone?: string | null
          address?: string | null
          referral_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          owner_id?: string
          stripe_customer_id?: string | null
          logo_url?: string | null
          website_url?: string | null
          phone?: string | null
          address?: string | null
          referral_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string | null
          avatar_url?: string | null
          onboarding_completed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      agency_members: {
        Row: {
          id: string
          agency_id: string
          profile_id: string
          role: 'owner' | 'agent'
          invited_by: string | null
          joined_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          profile_id: string
          role?: 'owner' | 'agent'
          invited_by?: string | null
          joined_at?: string
        }
        Update: {
          role?: 'owner' | 'agent'
        }
        Relationships: [
          { foreignKeyName: 'agency_members_agency_id_fkey'; columns: ['agency_id']; referencedRelation: 'agencies'; referencedColumns: ['id'] },
          { foreignKeyName: 'agency_members_profile_id_fkey'; columns: ['profile_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }
      subscriptions: {
        Row: {
          id: string
          agency_id: string
          plan: 'starter' | 'pro' | 'agence'
          status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete'
          stripe_subscription_id: string | null
          stripe_price_id: string | null
          trial_ends_at: string | null
          current_period_start: string | null
          current_period_end: string | null
          leads_this_month: number
          leads_month_reset_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          plan?: 'starter' | 'pro' | 'agence'
          status?: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete'
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          trial_ends_at?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          leads_this_month?: number
          leads_month_reset_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          plan?: 'starter' | 'pro' | 'agence'
          status?: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete'
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          trial_ends_at?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          leads_this_month?: number
          leads_month_reset_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          id: string
          agency_id: string
          assigned_to: string | null
          first_name: string
          last_name: string | null
          email: string | null
          phone: string | null
          status: 'nouveau' | 'contacte' | 'qualifie' | 'rdv_planifie' | 'proposition' | 'gagne' | 'perdu'
          source: 'widget' | 'manuel' | 'seloger' | 'leboncoin' | 'logicimmo' | 'import' | 'autre'
          message: string | null
          budget: number | null
          property_type: string | null
          location_desired: string | null
          ai_score: number | null
          ai_analysis: Json | null
          tags: string[]
          notes: string | null
          last_contacted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          assigned_to?: string | null
          first_name: string
          last_name?: string | null
          email?: string | null
          phone?: string | null
          status?: 'nouveau' | 'contacte' | 'qualifie' | 'rdv_planifie' | 'proposition' | 'gagne' | 'perdu'
          source?: 'widget' | 'manuel' | 'seloger' | 'leboncoin' | 'logicimmo' | 'import' | 'autre'
          message?: string | null
          budget?: number | null
          property_type?: string | null
          location_desired?: string | null
          ai_score?: number | null
          ai_analysis?: Json | null
          tags?: string[]
          notes?: string | null
          last_contacted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          first_name?: string
          last_name?: string | null
          email?: string | null
          phone?: string | null
          status?: 'nouveau' | 'contacte' | 'qualifie' | 'rdv_planifie' | 'proposition' | 'gagne' | 'perdu'
          source?: 'widget' | 'manuel' | 'seloger' | 'leboncoin' | 'logicimmo' | 'import' | 'autre'
          message?: string | null
          budget?: number | null
          property_type?: string | null
          location_desired?: string | null
          ai_score?: number | null
          ai_analysis?: Json | null
          tags?: string[]
          notes?: string | null
          last_contacted_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          id: string
          agency_id: string
          lead_id: string
          channel: 'email' | 'sms' | 'whatsapp' | 'note'
          last_message_at: string
          created_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          lead_id: string
          channel: 'email' | 'sms' | 'whatsapp' | 'note'
          last_message_at?: string
          created_at?: string
        }
        Update: {
          last_message_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          agency_id: string
          conversation_id: string
          lead_id: string
          sender_id: string | null
          channel: 'email' | 'sms' | 'whatsapp' | 'note'
          direction: 'entrant' | 'sortant'
          content: string
          subject: string | null
          is_ai_generated: boolean
          external_id: string | null
          status: string
          sent_at: string | null
          delivered_at: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          conversation_id: string
          lead_id: string
          sender_id?: string | null
          channel: 'email' | 'sms' | 'whatsapp' | 'note'
          direction?: 'entrant' | 'sortant'
          content: string
          subject?: string | null
          is_ai_generated?: boolean
          external_id?: string | null
          status?: string
          sent_at?: string | null
          delivered_at?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          status?: string
          delivered_at?: string | null
          read_at?: string | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          id: string
          agency_id: string
          lead_id: string
          agent_id: string | null
          title: string
          description: string | null
          status: 'planifie' | 'confirme' | 'annule' | 'effectue'
          scheduled_at: string
          duration_min: number
          location: string | null
          calcom_uid: string | null
          calcom_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          lead_id: string
          agent_id?: string | null
          title: string
          description?: string | null
          status?: 'planifie' | 'confirme' | 'annule' | 'effectue'
          scheduled_at: string
          duration_min?: number
          location?: string | null
          calcom_uid?: string | null
          calcom_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          status?: 'planifie' | 'confirme' | 'annule' | 'effectue'
          scheduled_at?: string
          duration_min?: number
          location?: string | null
          calcom_uid?: string | null
          calcom_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sequences: {
        Row: {
          id: string
          agency_id: string
          name: string
          description: string | null
          status: 'actif' | 'pause' | 'archive'
          trigger_on: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          name: string
          description?: string | null
          status?: 'actif' | 'pause' | 'archive'
          trigger_on?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          status?: 'actif' | 'pause' | 'archive'
          trigger_on?: string
          updated_at?: string
        }
        Relationships: []
      }
      sequence_steps: {
        Row: {
          id: string
          sequence_id: string
          agency_id: string
          step_order: number
          delay_hours: number
          channel: 'email' | 'sms' | 'whatsapp' | 'note'
          subject: string | null
          content_template: string
          is_ai_generated: boolean
          created_at: string
        }
        Insert: {
          id?: string
          sequence_id: string
          agency_id: string
          step_order: number
          delay_hours?: number
          channel: 'email' | 'sms' | 'whatsapp' | 'note'
          subject?: string | null
          content_template: string
          is_ai_generated?: boolean
          created_at?: string
        }
        Update: {
          step_order?: number
          delay_hours?: number
          channel?: 'email' | 'sms' | 'whatsapp' | 'note'
          subject?: string | null
          content_template?: string
          is_ai_generated?: boolean
        }
        Relationships: []
      }
      sequence_enrollments: {
        Row: {
          id: string
          sequence_id: string
          agency_id: string
          lead_id: string
          status: 'actif' | 'termine' | 'stoppe'
          current_step: number
          next_step_at: string | null
          enrolled_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          sequence_id: string
          agency_id: string
          lead_id: string
          status?: 'actif' | 'termine' | 'stoppe'
          current_step?: number
          next_step_at?: string | null
          enrolled_at?: string
          completed_at?: string | null
        }
        Update: {
          status?: 'actif' | 'termine' | 'stoppe'
          current_step?: number
          next_step_at?: string | null
          completed_at?: string | null
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          id: string
          agency_id: string
          month: string
          input_tokens: number
          output_tokens: number
          request_count: number
          updated_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          month: string
          input_tokens?: number
          output_tokens?: number
          request_count?: number
          updated_at?: string
        }
        Update: {
          input_tokens?: number
          output_tokens?: number
          request_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          id: string
          agency_id: string
          event_type: string
          entity_type: string | null
          entity_id: string | null
          metadata: Json | null
          occurred_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          event_type: string
          entity_type?: string | null
          entity_id?: string | null
          metadata?: Json | null
          occurred_at?: string
        }
        Update: {
          metadata?: Json | null
        }
        Relationships: []
      }
      widget_configs: {
        Row: {
          id: string
          agency_id: string
          primary_color: string
          button_text: string
          title: string
          fields: Json
          allowed_domains: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          primary_color?: string
          button_text?: string
          title?: string
          fields?: Json
          allowed_domains?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          primary_color?: string
          button_text?: string
          title?: string
          fields?: Json
          allowed_domains?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      availability_settings: {
        Row: {
          id: string
          agency_id: string
          days: number[]
          start_hour: number
          end_hour: number
          slot_duration: number
          advance_days: number
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          days?: number[]
          start_hour?: number
          end_hour?: number
          slot_duration?: number
          advance_days?: number
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          days?: number[]
          start_hour?: number
          end_hour?: number
          slot_duration?: number
          advance_days?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          id: string
          referrer_agency_id: string
          referee_agency_id: string
          used_at: string
          reward_applied_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          referrer_agency_id: string
          referee_agency_id: string
          used_at?: string
          reward_applied_at?: string | null
          created_at?: string
        }
        Update: {
          reward_applied_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      lead_stats: {
        Row: {
          agency_id: string | null
          total: number | null
          nouveaux: number | null
          qualifies: number | null
          rdv_planifies: number | null
          gagnes: number | null
          today: number | null
          conversion_rate: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_my_agency_id: {
        Args: Record<string, unknown>
        Returns: string
      }
    }
    Enums: {
      plan_id: 'starter' | 'pro' | 'agence'
      lead_status: 'nouveau' | 'contacte' | 'qualifie' | 'rdv_planifie' | 'proposition' | 'gagne' | 'perdu'
      message_channel: 'email' | 'sms' | 'whatsapp' | 'note'
      agency_member_role: 'owner' | 'agent'
    }
    CompositeTypes: Record<string, unknown>
  }
}
