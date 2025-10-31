import { useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useDispatch } from 'react-redux';
import { supabaseApi } from '../store/supabaseApi';

export const useRealtimeAttendance = (employeeId?: string) => {
  const dispatch = useDispatch();

  useEffect(() => {
    const channelName = employeeId ? `attendance:employee:${employeeId}` : 'attendance:all';
    const filter = employeeId
      ? {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `employee_id=eq.${employeeId}`,
        }
      : { event: '*', schema: 'public', table: 'attendance' };

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', filter, (payload) => {
        console.log('Realtime attendance update:', payload);
        // Invalidate Attendance list — triggers refetch in queries
        dispatch(supabaseApi.util.invalidateTags([{ type: 'Attendance', id: 'LIST' }]));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employeeId, dispatch]);

  return null;
};
