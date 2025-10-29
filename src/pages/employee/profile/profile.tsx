// src/pages/employee/profile/Profile.tsx
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box, Typography, Card, CardContent, TextField, Button, Grid, Divider, List, ListItem, ListItemText, IconButton, CircularProgress
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useGetProfileQuery, useUpdateEmployeeMutation, useGetEmployeeFilesQuery, useUploadEmployeeFileMutation } from '../../../store/supabaseApi';
import { formatPKR } from '../../../utils/formatters';

const schema = z.object({
  full_name: z.string().min(2, 'Full name required'),
  phone: z.string().optional(),
  address: z.string().optional(),
  date_of_birth: z.string().optional(),  // ISO or null
});

type FormData = z.infer<typeof schema>;

export default function EmployeeProfile() {
  const { data: profile, isLoading: profileLoading } = useGetProfileQuery();
  const { data: files, isLoading: filesLoading } = useGetEmployeeFilesQuery(profile?.id || '', { skip: !profile });
  const [updateEmployee] = useUpdateEmployeeMutation();
  const [uploadFile] = useUploadEmployeeFileMutation();

  const { register, handleSubmit, control, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (profile) {
      reset({
        full_name: profile.full_name,
        phone: profile.phone,
        address: profile.address,
        date_of_birth: profile.date_of_birth || '',  // Empty string for optional
      });
    }
  }, [profile, reset]);

  const onSubmit = async (data: FormData) => {
    if (!profile?.id) return;

    // Fix: Convert empty string to null for date field (DB DATE type can't handle "")
    const updateData = {
      ...data,
      date_of_birth: data.date_of_birth === '' ? null : data.date_of_birth,
    };

    await updateEmployee({ id: profile.id, ...updateData }).unwrap();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'cv' | 'id' | 'contract') => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;
    await uploadFile({ file, employeeId: profile.id, type }).unwrap();
  };

  if (profileLoading) return <CircularProgress />;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ maxWidth: 800 }}>
        <Typography variant="h4" gutterBottom>Employee Profile</Typography>
        <Card>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                {/* <Avatar sx={{ width: 100, height: 100, mx: 'auto', mb: 2 }} src={profile?.avatar_url} /> */}
                <input type="file" id="cv-upload" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'cv')} />
                <Button fullWidth variant="outlined" component="label" htmlFor="cv-upload">
                  Upload CV
                </Button>
              </Grid>
              <Grid item xs={12} md={8}>
                <form onSubmit={handleSubmit(onSubmit)}>
                  <TextField fullWidth label="Full Name" {...register('full_name')} error={!!errors.full_name} helperText={errors.full_name?.message} sx={{ mb: 2 }} />
                  <TextField fullWidth label="Position" value={profile?.position} InputProps={{ readOnly: true }} sx={{ mb: 2 }} />
                  <TextField fullWidth label="Salary" value={formatPKR(profile?.salary || 0)} InputProps={{ readOnly: true }} sx={{ mb: 2 }} />
                  <TextField fullWidth label="Phone" {...register('phone')} error={!!errors.phone} sx={{ mb: 2 }} />
                  <TextField fullWidth label="Address" {...register('address')} error={!!errors.address} sx={{ mb: 2 }} />
                  <DatePicker
                    label="Date of Birth"
                    value={control._getWatch('date_of_birth') ? new Date(control._getWatch('date_of_birth')) : null}
                    onChange={(date) => control._setValue('date_of_birth', date ? date.toISOString().split('T')[0] : '')}
                    slotProps={{ textField: { fullWidth: true, error: !!errors.date_of_birth, helperText: errors.date_of_birth?.message, sx: { mb: 2 } } }}
                  />
                  <LoadingButton
                    type="submit"
                    fullWidth
                    variant="contained"
                    loading={false}
                    disabled={!isDirty}
                    sx={{ mt: 2 }}
                  >
                    Update Profile
                  </LoadingButton>
                </form>
              </Grid>
            </Grid>
            <Divider sx={{ my: 3 }} />
            <Typography variant="h6">Role: {profile?.role}</Typography>
            <Typography>Join Date: {new Date(profile?.join_date || '').toLocaleDateString()}</Typography>
          </CardContent>
        </Card>

        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Uploaded Files</Typography>
            {filesLoading ? <CircularProgress /> : (
              <List>
                {files?.map((file) => (
                  <ListItem key={file.id} secondaryAction={
                    <IconButton edge="end" href={file.signedUrl} target="_blank">
                      View
                    </IconButton>
                  }>
                    <ListItemText primary={file.name} secondary={new Date(file.created_at).toLocaleDateString()} />
                  </ListItem>
                )) || <Typography>No files uploaded.</Typography>}
              </List>
            )}
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={4}>
                <input type="file" id="id-upload" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'id')} />
                <Button fullWidth variant="outlined" component="label" htmlFor="id-upload">
                  Upload ID
                </Button>
              </Grid>
              <Grid item xs={4}>
                <input type="file" id="contract-upload" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'contract')} />
                <Button fullWidth variant="outlined" component="label" htmlFor="contract-upload">
                  Upload Contract
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </LocalizationProvider>
  );
}