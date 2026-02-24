import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
        emailError,
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
            <Typography variant="h4" align='center' component="h1" gutterBottom fontWeight="bold" color="primary">
                Create an Account
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
                        <Typography
                            component="p"
                            variant="caption"
                            sx={{
                                fontSize: '0.75rem',
                                mt: -1.5,
                                color: email.length === 0 ? 'text.secondary' : emailError ? 'error.main' : 'success.main',
                            }}
                        >
                            {email.length === 0 ? 'Enter a valid email address' : emailError ?? 'Valid Email.'}
                        </Typography>
                        <TextField
                            label="Password"
                            variant="outlined"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            fullWidth
                            required
                        />
                        <Typography
                            component="p"
                            variant="caption"
                            sx={{
                                fontSize: '0.75rem',
                                mt: -1.5,
                                color: password.length === 0
                                    ? 'text.secondary'
                                    : password.length >= 8
                                        ? 'success.main'
                                        : 'error.main',
                            }}
                        >
                            {password.length === 0
                                ? 'The password must be 8 digits long or more.'
                                : password.length >= 8
                                    ? 'Valid Password.'
                                    : 'The password must be 8 digits long or more.'}
                         </Typography>
                        <TextField
                            label="Confirm Password"
                            variant="outlined"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            fullWidth
                            required
                        />
                        <Typography
                            component="p"
                            variant="caption"
                            sx={{
                                fontSize: '0.75rem',
                                mt: -1.5,
                                color: confirmPassword.length === 0 ? 'text.secondary' : password !== confirmPassword ? 'error.main' : 'success.main',
                            }}
                        >
                            {confirmPassword.length === 0 ? '' : password !== confirmPassword ? 'Passwords do not match.' : 'Password Matches.'}
                        </Typography>

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
                            disabled={!!emailError || password.length < 8 || password !== confirmPassword}
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
                        <p className="auth-footer">
                            Have an account? <Link to="/login">Login.</Link>
                        </p>
                    </Stack>

                </Box>
            )}
        </Container>
    );
}

export default Register;
