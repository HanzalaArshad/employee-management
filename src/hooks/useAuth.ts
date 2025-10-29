// src/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { type RootState, type AppDispatch } from '../store';
import { supabase } from '../utils/supabaseClient';
import { setCredentials, logout, setUser } from '../store/authSlice';
import { useGetProfileQuery } from '../store/supabaseApi';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, token, refreshToken } = useSelector((state: RootState) => state.auth);
  const { data: profile, refetch } = useGetProfileQuery(undefined, { skip: !user });
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    const accessToken = localStorage.getItem('sb-access-token');
    const savedRefreshToken = localStorage.getItem('sb-refresh-token');
    const savedUser = localStorage.getItem('sb-user');

    if (savedUser && !user) {
      dispatch(setUser(JSON.parse(savedUser)));
    }

    const restore = async () => {
      try {
        if (!accessToken && !savedRefreshToken) {
          setIsRestoring(false);
          return;
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        let finalSession = session;

        if ((!session || error) && savedRefreshToken) {
          const { data, error: refreshError } = await supabase.auth.refreshSession({
            refresh_token: savedRefreshToken,
          });
          if (refreshError || !data.session) throw refreshError;
          finalSession = data.session;
        }

        if (!finalSession) throw new Error('No active session');

        const { data: emp } = await supabase
          .from('employees')
          .select('role')
          .eq('id', finalSession.user.id)
          .maybeSingle();

        // 4️⃣ Save to Redux + localStorage
        dispatch(
          setCredentials({
            user: { ...finalSession.user, role: emp?.role || 'employee' },
            token: finalSession.access_token,
            refreshToken: finalSession.refresh_token,
          })
        );

        refetch();
      } catch (err) {
        console.warn('Session restore failed:', err);
        dispatch(logout());
      } finally {
        setIsRestoring(false);
      }
    };

    restore();
  }, [dispatch, refetch]);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && session) {
        dispatch(
          setCredentials({
            user: { ...session.user, role: user?.role || 'employee' },
            token: session.access_token,
            refreshToken: session.refresh_token,
          })
        );
      } else if (event === 'SIGNED_OUT') {
        dispatch(logout());
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [dispatch, user?.role]);

  const signOut = async () => {
    await supabase.auth.signOut();
    dispatch(logout());
  };

  return { user, profile, signOut, isRestoring, token, refreshToken };
};
