export interface Profile {
    id: string;
    full_name: string | null;
    phone_number: string | null;
    emergency_contact_1_name: string | null;
    emergency_contact_1_phone: string | null;
    emergency_contact_2_name: string | null;
    emergency_contact_2_phone: string | null;
    created_at: string;
    updated_at: string;
}

export interface SuspiciousNumber {
    phone_number: string;
    report_count: number;
    last_reported_at: string;
    created_at: string;
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
                    emergency_contact_1_name?: string | null;
                    emergency_contact_1_phone?: string | null;
                    emergency_contact_2_name?: string | null;
                    emergency_contact_2_phone?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    full_name?: string | null;
                    phone_number?: string | null;
                    emergency_contact_1_name?: string | null;
                    emergency_contact_1_phone?: string | null;
                    emergency_contact_2_name?: string | null;
                    emergency_contact_2_phone?: string | null;
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
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: Record<string, never>;
    };
}
