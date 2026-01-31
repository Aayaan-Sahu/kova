import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../types/database.types';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    loading: boolean;
    signUp: (email: string, password: string, profileData: Partial<Profile>) => Promise<{ error: AuthError | Error | null }>;
    signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signOut: () => Promise<void>;
    updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch profile from database
    const fetchProfile = async (userId: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return null;
        }
        return data as Profile;
    };

    // Refresh profile data
    const refreshProfile = async () => {
        if (user) {
            const profileData = await fetchProfile(user.id);
            setProfile(profileData);
        }
    };

    // Initialize auth state
    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                const profileData = await fetchProfile(session.user.id);
                setProfile(profileData);
            }

            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    const profileData = await fetchProfile(session.user.id);
                    setProfile(profileData);
                } else {
                    setProfile(null);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    // Sign up with email and password, then create profile
    const signUp = async (
        email: string,
        password: string,
        profileData: Partial<Profile>
    ): Promise<{ error: AuthError | Error | null }> => {
        const { data, error: authError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (authError) {
            return { error: authError };
        }

        if (data.user) {
            // Create profile row
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: data.user.id,
                    full_name: profileData.full_name ?? null,
                    phone_number: profileData.phone_number ?? null,
                    emergency_contact_1_name: profileData.emergency_contact_1_name ?? null,
                    emergency_contact_1_phone: profileData.emergency_contact_1_phone ?? null,
                    emergency_contact_2_name: profileData.emergency_contact_2_name ?? null,
                    emergency_contact_2_phone: profileData.emergency_contact_2_phone ?? null,
                } as never);

            if (profileError) {
                console.error('Error creating profile:', profileError);
                return { error: new Error(profileError.message) };
            }
        }

        return { error: null };
    };

    // Sign in with email and password
    const signIn = async (email: string, password: string): Promise<{ error: AuthError | null }> => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error };
    };

    // Sign out
    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
    };

    // Update profile
    const updateProfile = async (updates: Partial<Profile>): Promise<{ error: Error | null }> => {
        if (!user) {
            return { error: new Error('No user logged in') };
        }

        const { error } = await supabase
            .from('profiles')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            } as never)
            .eq('id', user.id);

        if (error) {
            return { error: new Error(error.message) };
        }

        // Refresh profile after update
        await refreshProfile();
        return { error: null };
    };

    const value = {
        user,
        session,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        updateProfile,
        refreshProfile,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
