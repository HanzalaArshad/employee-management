import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { supabase } from '../utils/supabaseClient';
import type { User, Employee, EmployeeInsert, EmployeeUpdate, Attendance, Leave } from '../types';
import { uploadEmployeeFile, listEmployeeFiles } from '../utils/storage';

export const supabaseApi = createApi({
  reducerPath: 'supabaseApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['User', 'Employee', 'Attendance', 'Leave'],
  endpoints: (builder) => ({
    login: builder.mutation<
      { user: User; session: any },
      { email: string; password: string }>({
      queryFn: async ({ email, password }) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) return { error };
        if (!data.session) return { error: { message: 'No session' } };

        const { data: empData } = await supabase
          .from('employees')
          .select('role')
          .eq('id', data.user!.id)
          .single();

        const role = empData?.role || 'employee';

        return {
          data: {
            user: { ...data.user!, role },
            session: data.session,
          },
        };
      },
    }),

    register: builder.mutation<{ user: User; session: any }, { email: string; password: string; full_name: string; position?: string }>({
      queryFn: async ({ email, password, full_name, position = 'Employee' }) => {
        try {
          const { data: signupData, error: signupError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { role: 'employee', full_name, position } },
          });
          if (signupError || !signupData.user) return { error: signupError || { message: 'Signup failed' } };

          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
          if (loginError) return { error: loginError };

          const insertData: EmployeeInsert = {
            id: loginData.user.id,
            full_name,
            position,
            salary: 0,
            join_date: new Date().toISOString().split('T')[0],
            role: 'employee',
          };

          const { error: insertError } = await supabase.from('employees').insert(insertData);
          if (insertError) {
            await supabase.auth.signOut();
            return { error: insertError };
          }

          const userWithRole = { ...loginData.user, role: 'employee' };
          return { data: { user: userWithRole, session: loginData.session } };
        } catch (err) {
          return { error: { message: 'Registration failed' } };
        }
      },
      invalidatesTags: ['User', 'Employee'],
    }),

    getProfile: builder.query<Employee | null, void>({
      queryFn: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null };

        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) return { error };
        return { data: data as Employee };
      },
      providesTags: ['Employee'],
    }),

    getEmployees: builder.query<Employee[], { search?: string; position?: string }>({
      queryFn: async ({ search, position }) => {
        let query = supabase.from('employees').select('*').order('full_name');
        if (search) query = query.ilike('full_name', `%${search}%`);
        if (position) query = query.eq('position', position);
        const { data, error } = await query;
        if (error) return { error };
        return { data: data as Employee[] };
      },
      providesTags: ['Employee'],
    }),

    updateEmployee: builder.mutation<Employee, { id: string } & Partial<EmployeeUpdate>>({
      queryFn: async ({ id, ...updates }) => {
        const { data, error } = await supabase
          .from('employees')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        if (error) return { error };
        return { data: data as Employee };
      },
      invalidatesTags: ['Employee'],
    }),

    deleteEmployee: builder.mutation<void, string>({
      queryFn: async (id) => {
        const { error } = await supabase.from('employees').delete().eq('id', id);
        if (error) return { error };
        return { data: undefined };
      },
      invalidatesTags: ['Employee'],
    }),

    // ==================== FILES ====================
    uploadEmployeeFile: builder.mutation<string, { file: File; employeeId: string; type: 'cv' | 'id' | 'contract' }>({
      queryFn: async ({ file, employeeId, type }) => {
        const signedUrl = await uploadEmployeeFile(file, employeeId, type);
        if (!signedUrl) return { error: { message: 'Upload failed' } };
        return { data: signedUrl };
      },
      invalidatesTags: ['Employee'],
    }),

    getEmployeeFiles: builder.query<any[], string>({
      queryFn: async (employeeId) => {
        const files = await listEmployeeFiles(employeeId);
        return { data: files };
      },
      providesTags: (result, error, employeeId) => [{ type: 'Employee', id: employeeId }],
    }),

    getAttendance: builder.query<
      Attendance[],
      { employeeId?: string; startDate?: string; endDate?: string; search?: string }
    >({
      queryFn: async ({ employeeId, startDate, endDate, search }) => {
        try {
          let query = supabase
            .from('attendance')
            .select(`
              id,
              employee_id,
              check_in,
              check_out,
              is_late,
              hours_worked,
              created_at,
              employees!employee_id (full_name)
            `)
            .order('check_in', { ascending: false });

          if (employeeId) query = query.eq('employee_id', employeeId);
          
          if (startDate) {
            const utcStart = new Date(`${startDate}T00:00:00`);
            utcStart.setHours(utcStart.getHours() - 5);
            query = query.gte('check_in', utcStart.toISOString());
          }
          
          if (endDate) {
            const utcEnd = new Date(`${endDate}T23:59:59`);
            utcEnd.setHours(utcEnd.getHours() - 5);
            query = query.lte('check_in', utcEnd.toISOString());
          }
          
          if (search) query = query.ilike('employees.full_name', `%${search}%`);

          const { data, error } = await query;
          if (error) {
            console.error('getAttendance error:', error);
            return { error };
          }
          
          return { data: (data || []) as Attendance[] };
        } catch (err) {
          console.error('getAttendance exception:', err);
          return { error: err as any };
        }
      },
      providesTags: (result) =>
        result
          ? [...result.map((r) => ({ type: 'Attendance' as const, id: r.id })), { type: 'Attendance', id: 'LIST' }]
          : [{ type: 'Attendance', id: 'LIST' }],
    }),

    checkIn: builder.mutation<Attendance, { employeeId: string }>({
      queryFn: async ({ employeeId }) => {
        try {
          const now = new Date();
          const pkTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);
          const startOfDay = new Date(pkTime);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(pkTime);
          endOfDay.setHours(23, 59, 59, 999);

          const { data: existing, error: selectErr } = await supabase
            .from('attendance')
            .select('*')
            .eq('employee_id', employeeId)
            .gte('check_in', startOfDay.toISOString())
            .lte('check_in', endOfDay.toISOString())
            .maybeSingle();

          if (selectErr && selectErr.code !== 'PGRST116') return { error: selectErr };
          if (existing && !existing.check_out) {
            return { error: { message: 'Already checked in today' } };
          }

          const isLate = pkTime.getHours() >= 9 && (pkTime.getHours() > 9 || pkTime.getMinutes() > 0);
          const payload = {
            employee_id: employeeId,
            check_in: now.toISOString(),
            is_late: isLate,
            hours_worked: 0,
          };

          if (existing) {
            const { data, error } = await supabase
              .from('attendance')
              .update(payload)
              .eq('id', existing.id)
              .select()
              .single();
            if (error) return { error };
            return { data: data as Attendance };
          } else {
            const { data, error } = await supabase
              .from('attendance')
              .insert(payload)
              .select()
              .single();
            if (error) return { error };
            return { data: data as Attendance };
          }
        } catch (err) {
          return { error: err as any };
        }
      },
      invalidatesTags: [{ type: 'Attendance', id: 'LIST' }],
    }),

    checkOut: builder.mutation<Attendance, { employeeId: string }>({
      queryFn: async ({ employeeId }) => {
        try {
          const now = new Date();
          const pkTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);
          const today = pkTime.toISOString().split('T')[0];

          const { data: openRecord, error: fetchError } = await supabase
            .from('attendance')
            .select('*')
            .eq('employee_id', employeeId)
            .gte('check_in', `${today}T00:00:00Z`)
            .lte('check_in', `${today}T23:59:59Z`)
            .is('check_out', null)
            .maybeSingle();

          if (fetchError) return { error: fetchError };
          if (!openRecord) {
            return { error: { message: 'No active check-in found. Please refresh.' } };
          }

          const checkInTime = new Date(openRecord.check_in);
          const hoursWorked = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

          const { data: updatedRecord, error: updateError } = await supabase
            .from('attendance')
            .update({
              check_out: now.toISOString(),
              hours_worked: Number(hoursWorked.toFixed(2)),
            })
            .eq('id', openRecord.id)
            .select()
            .single();

          if (updateError) return { error: updateError };
          if (!updatedRecord) {
            return { error: { message: 'Update returned no data. Check RLS policies.' } };
          }

          return { data: updatedRecord as Attendance };
        } catch (err) {
          return { error: { message: 'Unexpected error: ' + (err as Error).message } };
        }
      },
      invalidatesTags: [{ type: 'Attendance', id: 'LIST' }],
    }),

    // ==================== LEAVES ====================
    getLeaves: builder.query<Leave[], { employeeId?: string; status?: string }>({
  queryFn: async ({ employeeId, status }) => {
    let query = supabase
      .from('leaves')
  .select(`
  *,
  employees!employee_id(full_name, position),
  approver:employees!approved_by(full_name)
`)



      .order('created_at', { ascending: false });

    if (employeeId) query = query.eq('employee_id', employeeId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return { error };
    return { data: data as Leave[] };
  },
  providesTags: (result) =>
    result
      ? [
          ...result.map(({ id }) => ({ type: 'Leave' as const, id })),
          { type: 'Leave', id: 'LIST' },
        ]
      : [{ type: 'Leave', id: 'LIST' }],
}),




applyLeave: builder.mutation<Leave, Omit<Leave, 'id' | 'status' | 'created_at' | 'updated_at' | 'approved_by' | 'employees' | 'end_date'> & { end_date?: string }>({
  queryFn: async (leave) => {
    try {
      // Check for duplicate leave on the same date
      const { data: existingLeaves, error: checkError } = await supabase
        .from('leaves')
        .select('id, status, type')
        .eq('employee_id', leave.employee_id)
        .eq('start_date', leave.start_date);

      if (checkError) {
        console.error('Duplicate check error:', checkError);
        return { error: checkError };
      }

      // If leave exists for this date
      if (existingLeaves && existingLeaves.length > 0) {
        const existingLeave = existingLeaves[0];
        return { 
          error: { 
            message: `You already have a ${existingLeave.type} leave application for this date (Status: ${existingLeave.status})`,
            code: 'DUPLICATE_LEAVE',
            details: existingLeave
          } 
        };
      }

      // Insert new leave application
      const { data, error } = await supabase
        .from('leaves')
        .insert({ 
          ...leave, 
          status: 'pending' 
        })
        .select('*, employees!employee_id(full_name, position)')
        .single();
      
      if (error) {
        console.error('Insert leave error:', error);
        return { error };
      }
      
      return { data: data as Leave };
    } catch (err) {
      console.error('applyLeave exception:', err);
      return { 
        error: { 
          message: 'Failed to apply leave. Please try again.',
          code: 'APPLY_LEAVE_ERROR'
        } 
      };
    }
  },
  invalidatesTags: [{ type: 'Leave', id: 'LIST' }],
}),



    updateLeaveStatus: builder.mutation<Leave, { id: string; status: 'approved' | 'rejected'; approved_by: string }>({
      queryFn: async ({ id, status, approved_by }) => {
        const { data, error } = await supabase
          .from('leaves')
          .update({
            status,
            approved_by,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select('*, employees!employee_id(full_name, position)')
          .single();
        if (error) return { error };
        return { data: data as Leave };
      },
      invalidatesTags: (result, error, { id }) => [
        { type: 'Leave', id },
        { type: 'Leave', id: 'LIST' },
      ],
    }),

deleteLeave: builder.mutation<void, string>({
  queryFn: async (id) => {    
    const { error, count } = await supabase
      .from('leaves')
      .delete()
      .eq('id', id);
    
    if (error) {
      return { error };
    }
    
    return { data: undefined };
  },
  // CRITICAL: Must invalidate BOTH tags
  invalidatesTags: (result, error, id) => [
    { type: 'Leave', id },
    { type: 'Leave', id: 'LIST' },
  ],
}),

  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetProfileQuery,
  useGetEmployeesQuery,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
  useUploadEmployeeFileMutation,
  useGetEmployeeFilesQuery,
  useGetAttendanceQuery,
  useCheckInMutation,
  useCheckOutMutation,
  useGetLeavesQuery,
  useApplyLeaveMutation,
  useUpdateLeaveStatusMutation,
  useDeleteLeaveMutation,
} = supabaseApi;