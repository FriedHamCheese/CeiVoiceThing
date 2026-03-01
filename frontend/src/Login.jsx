import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import SideBar from "./components/SideBar";
import TopBar from "./components/TopBar";
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import ReCAPTCHA from "react-google-recaptcha";
import { z } from 'zod';
import "./styles/main.css";
import { useLogin } from './utils/authLogic';

const loginSchema = z.object({
    email: z.email('Enter a valid email address.').min(1, 'Email is required.'),
    password: z.string().min(8, 'The password must be 8 characters or more.')
});

function Login() {
    const {
        email, setEmail,
        password, setPassword,
        setCaptchaToken,
        error,
        emailError,
        captchaRef,
        handleSubmit: authHandleSubmit,
        handleGoogleLogin,
    } = useLogin();

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const [touched, setTouched] = useState({ email: false, password: false });

    const validation = useMemo(() => {
        const result = loginSchema.safeParse({ email, password });
        if (result.success) return { isValid: true, errors: {} };
        const fieldErrors = {};
        for (const issue of result.error.issues) {
            const field = issue.path[0];
            if (!fieldErrors[field]) fieldErrors[field] = issue.message;
        }
        return { isValid: false, errors: fieldErrors };
    }, [email, password]);

    const handleBlur = (field) => {
        setTouched((prev) => ({ ...prev, [field]: true }));
    };

    const onSubmit = (e) => {
        e.preventDefault();
        setTouched({ email: true, password: true });
        if (!validation.isValid) return;
        authHandleSubmit(e);
    };

    const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

    return (
        <div className={`viewport ${!isSidebarOpen ? "sidebar-hidden" : ""}`}>
            {/* Mobile overlay */}
            <div
                className={`sidebar-overlay ${isSidebarOpen ? "active" : ""}`}
                onClick={() => setIsSidebarOpen(false)}
            ></div>
            <SideBar toggleSidebar={toggleSidebar} />
            <div className="main-layout">
                <TopBar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
                <main className="panel auth-panel">
                    <div className="page-transition auth-page">
                        <div className="auth-container">
                            <Typography variant="h4" align='center' component="h1" gutterBottom fontWeight="bold" color="primary">
                                Login
                            </Typography>

                            {/* --- LOCAL LOGIN FORM --- */}
                            <form onSubmit={onSubmit} className="auth-form" noValidate>
                                <TextField
                                    label="Email"
                                    variant="outlined"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onBlur={() => handleBlur('email')}
                                    error={touched.email && !!validation.errors.email}
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
                                    required
                                />
                                <p
                                    className="password-hint"
                                    style={{
                                        fontSize: '0.75rem',
                                        marginTop: '-6px',
                                        marginBottom: 0,
                                        color: touched.password && validation.errors.password
                                            ? 'var(--error-color)'
                                            : (!touched.password && password.length === 0)
                                                ? 'var(--text-secondary)'
                                                : 'var(--success-color)'
                                    }}
                                >
                                    {touched.password && validation.errors.password
                                        ? validation.errors.password
                                        : (!touched.password && password.length === 0)
                                            ? 'The password must be 8 characters long or more.'
                                            : 'Valid Password.'}
                                </p>

                                {/* Captcha Widget */}
                                <div className="captcha-container" style={{ display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                                    <ReCAPTCHA
                                        ref={captchaRef}
                                        sitekey={RECAPTCHA_SITE_KEY}
                                        onChange={(token) => setCaptchaToken(token)}
                                        size="normal"
                                    />
                                </div>

                                <Button
                                    variant="contained"
                                    color="primary"
                                    type="submit"
                                    size="large"
                                    disabled={!validation.isValid || !!emailError}
                                >
                                    Login with Email
                                </Button>
                            </form>

                            {error && <p className="auth-error">{error}</p>}

                            {/* --- DIVIDER --- */}
                            <Divider className="auth-divider">OR</Divider>

                            {/* --- GOOGLE LOGIN --- */}
                            <Button
                                variant="outlined"
                                color="secondary"
                                fullWidth
                                onClick={handleGoogleLogin}
                                className="google-btn"
                            >
                                Continue with Google
                            </Button>

                            <p className="auth-footer">
                                No account? <Link to="/register">Register.</Link>
                            </p>
                            <p className="auth-footer" style={{ marginTop: '8px' }}>
                                Need help without login? <Link to="/request">Submit a request</Link>
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Login;
