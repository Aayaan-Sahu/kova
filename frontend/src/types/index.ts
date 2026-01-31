export interface User {
    id: string;
    email: string;
    full_name: string;
    phone_number: string;
    emergency_contacts: {
        name: string;
        phone: string;
    }[];
}

export interface CallAnalysis {
    transcript: string;
    risk_score: number; // 0-100
    status: 'safe' | 'warning' | 'danger';
    suggestions: string[];
}
