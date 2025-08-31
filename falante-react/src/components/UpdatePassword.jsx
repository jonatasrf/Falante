import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Box, Button, TextField, Typography, Container } from '@mui/material';
import { useToast } from '../contexts/ToastContext';

export default function UpdatePassword() {
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const showToast = useToast();

    const handleUpdatePassword = async (event) => {
        event.preventDefault();
        setLoading(true);

        if (password !== confirmPassword) {
            showToast('Passwords do not match.', 'error');
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) throw error;
            showToast('Your password has been updated successfully!', 'success');
            setPassword('');
            setConfirmPassword('');
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container component="main" maxWidth="xs">
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Typography component="h1" variant="h5">
                    Update Password
                </Typography>
                <Box component="form" onSubmit={handleUpdatePassword} noValidate sx={{ mt: 1 }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="New Password"
                        type="password"
                        id="new-password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="confirm-password"
                        label="Confirm New Password"
                        type="password"
                        id="confirm-new-password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                        disabled={loading}
                    >
                        {loading ? 'Updating...' : 'Update Password'}
                    </Button>
                </Box>
            </Box>
        </Container>
    );
}