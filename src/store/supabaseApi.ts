import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { supabase } from '../utils/supabaseClient';
import type { User, Employee, EmployeeInsert, EmployeeUpdate, Attendance, Leave, Payroll } from '../types';
import { uploadEmployeeFile, listEmployeeFiles } from '../utils/storage';

export const supabaseApi = createApi({
  reducerPath: 'supabaseApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['User', 'Employee', 'Attendance', 'Leave', 'Payroll'],
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
      const { data: existingLeaves, error: checkError } = await supabase
        .from('leaves')
        .select('id, status, type')
        .eq('employee_id', leave.employee_id)
        .eq('start_date', leave.start_date);

      if (checkError) {
        console.error('Duplicate check error:', checkError);
        return { error: checkError };
      }

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


getPayroll: builder.query<Payroll[], { employeeId?: string; month?: string }>({
  queryFn: async ({ employeeId, month }) => {
    let query = supabase
      .from('payroll')
      .select('*, employees!employee_id(full_name, position)')
      .order('generated_at', { ascending: false });

    if (employeeId) query = query.eq('employee_id', employeeId);
    if (month) {
      const formattedMonth = month.includes('-01') ? month : `${month}-01`;
      query = query.eq('month', formattedMonth);
    }

    const { data, error } = await query;
    if (error) return { error };
    return { data: data as Payroll[] };
  },
  providesTags: (result) =>
    result
      ? [...result.map(({ id }) => ({ type: 'Payroll' as const, id })), { type: 'Payroll', id: 'LIST' }]
      : [{ type: 'Payroll', id: 'LIST' }],
}),





generatePayroll: builder.mutation<Payroll, { employeeId: string; month: string }>({
  queryFn: async ({ employeeId, month }) => {
    try {
      const monthStr = month.length === 7 ? month : month.substring(0, 7);
      
      const { data: emp, error: empError } = await supabase
        .from('employees')
        .select('salary')
        .eq('id', employeeId)
        .single();
      
      if (empError || !emp) return { error: { message: 'Employee not found' } };

      const year = parseInt(monthStr.split('-')[0]);
      const monthNum = parseInt(monthStr.split('-')[1]);
      const startDate = new Date(Date.UTC(year, monthNum - 1, 1));
      const endDate = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59));

      const { data: attendance } = await supabase
        .from('attendance')
        .select('is_late, hours_worked, check_in')
        .eq('employee_id', employeeId)
        .gte('check_in', startDate.toISOString())
        .lte('check_in', endDate.toISOString());

      const lateCount = attendance?.filter(a => a.is_late).length || 0;

      const { data: leaves } = await supabase
        .from('leaves')
        .select('start_date, end_date')
        .eq('employee_id', employeeId)
        .eq('status', 'approved')
        .gte('start_date', startDate.toISOString().split('T')[0])
        .lte('start_date', endDate.toISOString().split('T')[0]);

      const leaveDays = leaves?.length || 0;
      const excessLeaves = Math.max(0, leaveDays - 2); // 2 free leaves per month

      const baseSalary = emp.salary;
      const lateDeduction = lateCount * (baseSalary * 0.05); // 5% per late day
      const leaveDeduction = excessLeaves * (baseSalary * 0.1); // 10% per excess leave
      const netSalary = baseSalary - lateDeduction - leaveDeduction;

      const { data: existing } = await supabase
        .from('payroll')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('month', `${monthStr}-01`)
        .single();

      if (existing) {
        return { error: { message: 'Payroll already exists for this month' } };
      }

      const { data, error } = await supabase
        .from('payroll')
        .insert({
          employee_id: employeeId,
          month: `${monthStr}-01`, 
          base_salary: baseSalary,
          late_hours: lateCount,
          late_deduction: parseFloat(lateDeduction.toFixed(2)),
          leave_days_taken: leaveDays,
          excess_leaves: excessLeaves,
          leave_deduction: parseFloat(leaveDeduction.toFixed(2)),
          net_salary: parseFloat(netSalary.toFixed(2)),
          status: 'draft',
        })
        .select('*, employees!employee_id(full_name, position)')
        .single();

      if (error) return { error };
      return { data: data as Payroll };
    } catch (err) {
      console.error('generatePayroll error:', err);
      return { error: { message: 'Failed to generate payroll' } };
    }
  },
  invalidatesTags: [{ type: 'Payroll', id: 'LIST' }],
}),


getPayslip: builder.query<Payroll, { employeeId: string; month: string }>({
  queryFn: async ({ employeeId, month }) => {
    // Ensure month format is YYYY-MM-01
    const formattedMonth = month.includes('-01') ? month : `${month}-01`;
    
    const { data, error } = await supabase
      .from('payroll')
      .select('*, employees!employee_id(full_name, position)')
      .eq('employee_id', employeeId)
      .eq('month', formattedMonth)
      .single();
    
    if (error) return { error };
    return { data: data as Payroll };
  },
  providesTags: (result, error, { employeeId, month }) => [
    { type: 'Payroll', id: `${employeeId}-${month}` }
  ],
}),

approvePayroll: builder.mutation<Payroll, { id: string }>({
  queryFn: async ({ id }) => {
    const { data, error } = await supabase
      .from('payroll')
      .update({ 
        status: 'approved', 
        approved_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select('*, employees!employee_id(full_name, position)')
      .single();
    
    if (error) return { error };
    return { data: data as Payroll };
  },
  invalidatesTags: [{ type: 'Payroll', id: 'LIST' }],
}),

exportPayslipPDF: builder.mutation<string, { payrollId: string }>({
  queryFn: async ({ payrollId }) => {
    try {
      const { data: payroll, error } = await supabase
        .from('payroll')
        .select('*, employees!employee_id(full_name, position)')
        .eq('id', payrollId)
        .single();
      
      if (error || !payroll) return { error: { message: 'Payroll not found' } };

      const { jsPDF } = await import('jspdf');

      const doc = new jsPDF();
      
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('PAYSLIP', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Employee: ${payroll.employees?.full_name || 'N/A'}`, 20, 40);
      doc.text(`Position: ${payroll.employees?.position || 'N/A'}`, 20, 48);
      doc.text(`Month: ${new Date(payroll.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`, 20, 56);
      doc.text(`Generated: ${new Date(payroll.generated_at).toLocaleDateString()}`, 20, 64);
      
      doc.setLineWidth(0.5);
      doc.line(20, 70, 190, 70);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Salary Details', 20, 80);
      doc.setFont('helvetica', 'normal');
      
      doc.text('Base Salary:', 20, 90);
      doc.text(`Rs ${payroll.base_salary.toFixed(2)}`, 150, 90, { align: 'right' });
      
      doc.setFont('helvetica', 'bold');
      doc.text('Deductions', 20, 105);
      doc.setFont('helvetica', 'normal');
      
      doc.text(`Late Days (${payroll.late_hours}):`, 20, 115);
      doc.text(`- Rs ${payroll.late_deduction.toFixed(2)}`, 150, 115, { align: 'right' });
      
      doc.text(`Excess Leaves (${payroll.excess_leaves}):`, 20, 123);
      doc.text(`- Rs ${payroll.leave_deduction.toFixed(2)}`, 150, 123, { align: 'right' });
      
      doc.line(20, 130, 190, 130);
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Net Salary:', 20, 142);
      doc.text(`Rs ${payroll.net_salary.toFixed(2)}`, 150, 142, { align: 'right' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text(`Status: ${payroll.status.toUpperCase()}`, 20, 155);
      if (payroll.approved_at) {
        doc.text(`Approved on: ${new Date(payroll.approved_at).toLocaleDateString()}`, 20, 162);
      }

      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      return { data: pdfUrl };
    } catch (err) {
      console.error('PDF generation error:', err);
      return { error: { message: 'PDF generation failed' } };
    }
  },
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
  useGetPayrollQuery,
  useGeneratePayrollMutation,
  useGetPayslipQuery,
  useApprovePayrollMutation,
  useExportPayslipPDFMutation,
} = supabaseApi;