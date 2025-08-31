import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Box, Button, TextField, Typography, Container, LinearProgress } from '@mui/material';
import { useToast } from '../contexts/ToastContext';

const LOGIN_VIEW = {
    SIGN_IN: 'Sign In',
    SIGN_UP: 'Sign Up',
    FORGOT_PASSWORD: 'Forgot Password',
};

export default function Login() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [view, setView] = useState(LOGIN_VIEW.SIGN_IN);
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: '' });

    const showToast = useToast();

    const checkPasswordStrength = (pwd) => {
        let score = 0;
        let feedback = 'Very Weak';

        if (pwd.length > 0) {
            score++; // Has some length
        }
        if (pwd.length >= 8) {
            score++; // Good length
        }
        if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) {
            score++; // Mixed case
        }
        if (/\d/.test(pwd)) {
            score++; // Has numbers
        }
        if (/[^A-Za-z0-9]/.test(pwd)) {
            score++; // Has special characters
        }

        switch (score) {
            case 0:
            case 1:
                feedback = 'Very Weak';
                break;
            case 2:
                feedback = 'Weak';
                break;
            case 3:
                feedback = 'Medium';
                break;
            case 4:
                feedback = 'Strong';
                break;
            case 5:
                feedback = 'Very Strong';
                break;
            default:
                feedback = '';
        }
        return { score, feedback };
    };

    const handlePasswordChange = (e) => {
        const newPassword = e.target.value;
        setPassword(newPassword);
        if (view === LOGIN_VIEW.SIGN_UP) {
            setPasswordStrength(checkPasswordStrength(newPassword));
        }
    };

    const handleLogin = async (event) => {
        event.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (event) => {
        event.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.auth.signUp({ email, password });
            if (error) throw error;
            showToast('Check your email for the confirmation link!', 'success');
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (event) => {
        event.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin,
            });
            if (error) throw error;
            showToast('Check your email for the password reset link!', 'success');
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const renderForm = () => {
        switch (view) {
            case LOGIN_VIEW.SIGN_IN:
            case LOGIN_VIEW.SIGN_UP:
                const isSignUpView = view === LOGIN_VIEW.SIGN_UP;
                const isSignUpButtonDisabled = isSignUpView && passwordStrength.score < 3;

                return (
                    <Box component="form" onSubmit={view === LOGIN_VIEW.SIGN_IN ? handleLogin : handleSignUp} noValidate sx={{ mt: 1 }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="Email Address"
                            name="email"
                            autoComplete="email"
                            autoFocus
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type="password"
                            id="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={handlePasswordChange}
                        />
                        {isSignUpView && password.length > 0 && (
                            <Box sx={{ width: '100%', mt: 1 }} aria-live="polite">
                                <LinearProgress variant="determinate" value={(passwordStrength.score / 5) * 100} sx={{ height: 5, borderRadius: 5 }} />
                                <Typography variant="caption" color="text.secondary">
                                    Strength: {passwordStrength.feedback}
                                </Typography>
                            </Box>
                        )}
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                            disabled={loading || isSignUpButtonDisabled}
                        >
                            {loading ? 'Loading...' : view}
                        </Button>
                    </Box>
                );
            case LOGIN_VIEW.FORGOT_PASSWORD:
                return (
                    <Box component="form" onSubmit={handleForgotPassword} noValidate sx={{ mt: 1 }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="Email Address"
                            name="email"
                            autoComplete="email"
                            autoFocus
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                            disabled={loading}
                        >
                            {loading ? 'Loading...' : 'Send Reset Link'}
                        </Button>
                    </Box>
                );
            default:
                return null;
        }
    };

    const renderLinks = () => {
        switch (view) {
            case LOGIN_VIEW.SIGN_IN:
                return (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <Button variant="text" onClick={() => setView(LOGIN_VIEW.FORGOT_PASSWORD)}>
                            Forgot password?
                        </Button>
                        <Button variant="text" onClick={() => setView(LOGIN_VIEW.SIGN_UP)}>
                            Don't have an account? Sign Up
                        </Button>
                    </Box>
                );
            case LOGIN_VIEW.SIGN_UP:
                return (
                    <Button variant="text" onClick={() => setView(LOGIN_VIEW.SIGN_IN)}>
                        Already have an account? Sign In
                    </Button>
                );
            case LOGIN_VIEW.FORGOT_PASSWORD:
                 return (
                    <Button variant="text" onClick={() => setView(LOGIN_VIEW.SIGN_IN)}>
                        Back to Sign In
                    </Button>
                );
            default:
                return null;
        }
    }

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
                    {view}
                </Typography>
                {renderForm()}
                {renderLinks()}
            </Box>
        </Container>
    );
}