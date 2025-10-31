import type { Database } from './supabase';

export * from './supabase';

// Aliases for easy use
export type Employee = Database['public']['Tables']['employees']['Row'];
export type Attendance = Database['public']['Tables']['attendance']['Row'];
// export type Leave = Database['public']['Tables']['leaves']['Row'];
// export type Payroll = Database['public']['Tables']['payroll']['Row'];

export type EmployeeInsert = Database['public']['Tables']['employees']['Insert'];
export type EmployeeUpdate = Database['public']['Tables']['employees']['Update'];

export interface User {
  id: string;
  email: string;
  role?: 'employee' | 'admin';
}

export type AuthRole = 'employee' | 'admin';

export interface AttendanceSummary {
  employee_id: string;
  full_name: string;
  date: string;
  hours_worked: number;
  is_late: boolean;
}


export interface Leave {
  id: string;
  employee_id: string;
  type: 'sick' | 'casual' | 'annual' | 'emergency';
  start_date: string;
  end_date?: string; // Make it optional
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  created_at: string;
  updated_at: string;
  employees?: {
    full_name: string;
    position: string;
  };
  approver?: {
    full_name: string;
  };
}


export type Payroll = {
  id: string;
  employee_id: string;
  month: string; // '2025-10-01'
  base_salary: number;
  late_hours: number;
  late_deduction: number;
  leave_days_taken: number;
  leave_allowance: number;
  excess_leaves: number;
  leave_deduction: number;
  net_salary: number;
  status: 'draft' | 'approved' | 'paid';
  generated_at: string;
  approved_at?: string;
  paid_at?: string;
  employees?: { full_name: string; position: string };
};
export type LeaveType = 'sick' | 'personal';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type PayrollStatus = 'draft' | 'approved' | 'paid';
