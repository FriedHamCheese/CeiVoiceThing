import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Typography,
    Box,
    Button,
    TextField,
    Divider,
    Alert,
    Paper,
    Stack
} from '@mui/material';
import ReCAPTCHA from "react-google-recaptcha";
import "./styles/main.css";
import { useRegister } from './utils/authLogic';

function Register() {
    const {
        email, setEmail,
        password, setPassword,
        confirmPassword, setConfirmPassword,
        setCaptchaToken,
        error,
        success,
        captchaRef,
        handleSubmit,
        handleGoogleRegister,
    } = useRegister();

    const navigate = useNavigate();

    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => {
                navigate('/');
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [success, navigate]);

    const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

    return (
        <Container maxWidth="sm" sx={{ py: 4 }}>
            <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
                <Typography variant="h4" component="h1" gutterBottom fontWeight="bold" textAlign="center">
                    Create Account
                </Typography>

                {success ? (
                    <Alert severity="success" sx={{ mt: 2 }}>
                        Registration successful! Logging you in...
                    </Alert>
                ) : (
                    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                        <Stack spacing={3}>
                            <TextField
                                label="Email"
                                variant="outlined"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                fullWidth
                                required
                            />
                            <TextField
                                label="Password"
                                variant="outlined"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                fullWidth
                                required
                            />
                            <TextField
                                label="Confirm Password"
                                variant="outlined"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                fullWidth
                                required
                            />

                            {/* Captcha Widget */}
                            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                <ReCAPTCHA
                                    ref={captchaRef}
                                    sitekey={RECAPTCHA_SITE_KEY}
                                    onChange={(token) => setCaptchaToken(token)}
                                />
                            </Box>

                            <Button
                                variant="contained"
                                color="primary"
                                type="submit"
                                size="large"
                                fullWidth
                                sx={{ py: 1.5, fontWeight: 'bold' }}
                            >
                                Register with Email
                            </Button>

                            {error && <Alert severity="error">{error}</Alert>}

                            <Divider sx={{ my: 2 }}>
                                <Typography variant="body2" color="text.secondary">OR</Typography>
                            </Divider>

                            <Button
                                variant="outlined"
                                color="secondary"
                                fullWidth
                                onClick={handleGoogleRegister}
                                sx={{ py: 1.5 }}
                            >
                                Sign up with Google
                            </Button>
                        </Stack>
                    </Box>
                )}
            </Paper>
        </Container>
    );
}

export default Register;
