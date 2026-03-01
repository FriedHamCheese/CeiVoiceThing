import { useState, useEffect, useMemo } from 'react';
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
import { z } from 'zod';
import "./styles/main.css";
import { useRegister } from './utils/authLogic';

const registerSchema = z.object({
    email: z.email('Enter a valid email address.').min(1, 'Email is required.'),
    password: z.string().min(8, 'The password must be 8 characters or more.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.')
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
});

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
        handleSubmit: authHandleSubmit,
        handleGoogleRegister,
    } = useRegister();

    const navigate = useNavigate();

    const [touched, setTouched] = useState({ email: false, password: false, confirmPassword: false });

    const validation = useMemo(() => {
        const result = registerSchema.safeParse({ email, password, confirmPassword });
        if (result.success) return { isValid: true, errors: {} };
        const fieldErrors = {};
        for (const issue of result.error.issues) {
            const field = issue.path[0];
            if (!fieldErrors[field]) fieldErrors[field] = issue.message;
        }
        return { isValid: false, errors: fieldErrors };
    }, [email, password, confirmPassword]);

    const handleBlur = (field) => {
        setTouched((prev) => ({ ...prev, [field]: true }));
    };

    const onSubmit = (e) => {
        e.preventDefault();
        setTouched({ email: true, password: true, confirmPassword: true });
        if (!validation.isValid) return;
        authHandleSubmit(e);
    };

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
                <Box component="form" onSubmit={onSubmit} sx={{ mt: 2 }} noValidate>
                    <Stack spacing={3}>
                        <TextField
                            label="Email"
                            variant="outlined"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onBlur={() => handleBlur('email')}
                            error={touched.email && !!validation.errors.email}
                            fullWidth
                            required
                        />
                        <Typography
                            component="p"
                            variant="caption"
                            sx={{
                                fontSize: '0.75rem',
                                mt: -1.5,
                                color: touched.email && validation.errors.email
                                    ? 'error.main'
                                    : emailError
                                        ? 'error.main'
                                        : (!touched.email && email.length === 0)
                                            ? 'text.secondary'
                                            : 'success.main',
                            }}
                        >
                            {touched.email && validation.errors.email
                                ? validation.errors.email
                                : emailError
                                    ? emailError
                                    : (!touched.email && email.length === 0)
                                        ? 'Enter a valid email address'
                                        : 'Valid Email.'}
                        </Typography>
                        <TextField
                            label="Password"
                            variant="outlined"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onBlur={() => handleBlur('password')}
                            error={touched.password && !!validation.errors.password}
                            fullWidth
                            required
                        />
                        <Typography
                            component="p"
                            variant="caption"
                            sx={{
                                fontSize: '0.75rem',
                                mt: -1.5,
                                color: touched.password && validation.errors.password
                                    ? 'error.main'
                                    : (!touched.password && password.length === 0)
                                        ? 'text.secondary'
                                        : 'success.main',
                            }}
                        >
                            {touched.password && validation.errors.password
                                ? validation.errors.password
                                : (!touched.password && password.length === 0)
                                    ? 'The password must be 8 characters long or more.'
                                    : 'Valid Password.'}
                        </Typography>
                        <TextField
                            label="Confirm Password"
                            variant="outlined"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            onBlur={() => handleBlur('confirmPassword')}
                            error={touched.confirmPassword && !!validation.errors.confirmPassword}
                            fullWidth
                            required
                        />
                        <Typography
                            component="p"
                            variant="caption"
                            sx={{
                                fontSize: '0.75rem',
                                mt: -1.5,
                                color: touched.confirmPassword && validation.errors.confirmPassword
                                    ? 'error.main'
                                    : (!touched.confirmPassword && confirmPassword.length === 0)
                                        ? 'text.secondary'
                                        : 'success.main',
                            }}
                        >
                            {touched.confirmPassword && validation.errors.confirmPassword
                                ? validation.errors.confirmPassword
                                : (!touched.confirmPassword && confirmPassword.length === 0)
                                    ? ''
                                    : 'Password Matches.'}
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
                            disabled={!validation.isValid || !!emailError}
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
                        <p className="auth-footer" style={{ marginTop: '8px' }}>
                            Want to submit only email + problem? <Link to="/request">Submit a request</Link>
                        </p>
                    </Stack>

                </Box>
            )}
        </Container>
    );
}

export default Register;
