export interface Profile {
    id: string;
    full_name: string | null;
    phone_number: string | null;
    emergency_contact_one_name: string | null;
    emergency_contact_one_number: string | null;
    emergency_contact_two_name: string | null;
    emergency_contact_two_number: string | null;
    created_at: string;
    updated_at: string;
}

export interface SuspiciousNumber {
    phone_number: string;
    report_count: number;
    last_reported_at: string;
    created_at: string;
}

export interface UserAnalytics {
    id: string;
    total_calls: number;
    total_call_duration_seconds: number;
    total_scam_calls: number;
    total_suspicious_calls: number;
    total_safe_calls: number;
    total_alerts_sent: number;
    total_scams_blocked: number;
    total_questions_generated: number;
    weekly_stats: Record<string, { calls: number; duration: number; scams: number }> | null;
    daily_stats: Record<string, { calls: number; scams: number }> | null;
    high_risk_calls: number;
    medium_risk_calls: number;
    low_risk_calls: number;
    unique_callers_count: number;
    recent_callers: string[] | null;
    first_call_at: string | null;
    last_call_at: string | null;
    last_scam_detected_at: string | null;
    created_at: string;
    updated_at: string;
}

// Supabase database types - using explicit structure for proper type inference

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: Profile;
                Insert: {
                    id: string;
                    full_name?: string | null;
                    phone_number?: string | null;
                    emergency_contact_one_name?: string | null;
                    emergency_contact_one_number?: string | null;
                    emergency_contact_two_name?: string | null;
                    emergency_contact_two_number?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    full_name?: string | null;
                    phone_number?: string | null;
                    emergency_contact_one_name?: string | null;
                    emergency_contact_one_number?: string | null;
                    emergency_contact_two_name?: string | null;
                    emergency_contact_two_number?: string | null;
                    updated_at?: string;
                };
                Relationships: [];
            };
            suspicious_numbers: {
                Row: SuspiciousNumber;
                Insert: {
                    phone_number: string;
                    report_count?: number;
                    last_reported_at?: string;
                    created_at?: string;
                };
                Update: {
                    report_count?: number;
                    last_reported_at?: string;
                };
                Relationships: [];
            };
            user_analytics: {
                Row: UserAnalytics;
                Insert: {
                    id: string;
                    total_calls?: number;
                    total_call_duration_seconds?: number;
                    total_scam_calls?: number;
                    total_suspicious_calls?: number;
                    total_safe_calls?: number;
                    total_alerts_sent?: number;
                    total_scams_blocked?: number;
                    total_questions_generated?: number;
                    weekly_stats?: Record<string, { calls: number; blocked: number }> | null;
                    daily_stats?: Record<string, { calls: number; blocked: number }> | null;
                    high_risk_calls?: number;
                    medium_risk_calls?: number;
                    low_risk_calls?: number;
                    unique_callers_count?: number;
                    recent_callers?: string[] | null;
                    first_call_at?: string | null;
                    last_call_at?: string | null;
                    last_scam_detected_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: Partial<Omit<UserAnalytics, 'id' | 'created_at'>>;
                Relationships: [];
            };
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: Record<string, never>;
    };
}
