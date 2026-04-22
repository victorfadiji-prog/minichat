import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

/**
 * AuthProvider — manages authentication state using Supabase Auth.
 * Provides user, session, login, register, logout to all children.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile details from the profiles table
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      console.log('🔐 Initializing Auth...');
      try {
        // 1. Check active session with a timeout to prevent infinite hang
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth Timeout')), 5000)
        );

        const { data: { session }, error: sessionError } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]);
        
        if (sessionError) throw sessionError;

        if (mounted) {
          setSession(session);
          if (session?.user) {
            console.log('👤 User session found, fetching profile...');
            const profile = await fetchProfile(session.user.id);
            setUser({ ...session.user, ...profile });
          } else {
            console.log('ℹ️ No active session found.');
          }
        }
      } catch (error) {
        console.error('⚠️ Auth initialization failed or timed out:', error);
      } finally {
        if (mounted) {
          console.log('✅ Auth initialization complete.');
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('🔄 Auth state changed:', _event);
      if (!mounted) return;

      try {
        setSession(session);
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          setUser({ ...session.user, ...profile });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('⚠️ Auth change handler failed:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const handleLogin = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, user: data.user };
  }, []);

  const handleRegister = useCallback(async (username, email, password) => {
    // 1. Sign up user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username } // Stored in auth.users metadata
      }
    });

    if (error) {
      return { success: false, message: error.message };
    }

    // 2. Insert into profiles table
    // Note: In a production app, you might use a Postgres Trigger to do this automatically.
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        { 
          id: data.user.id, 
          username, 
          email,
          status: 'online' 
        }
      ]);

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Even if profile fails, user was created in Auth
    }

    return { success: true, user: data.user };
  }, []);

  const handleLogout = useCallback(async () => {
    // Set offline in DB before logout
    if (user) {
      await supabase
        .from('profiles')
        .update({ status: 'offline', last_seen: new Date() })
        .eq('id', user.id);
    }
    
    await supabase.auth.signOut();
  }, [user]);

  const value = {
    user,
    session,
    token: session?.access_token,
    loading,
    isAuthenticated: !!session?.user,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
