import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SideBar from "./components/SideBar";
import TopBar from "./components/TopBar";
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import ReCAPTCHA from "react-google-recaptcha";
import "./styles/main.css";
import { useLogin } from './utils/authLogic';


function Login() {
    const {
        email, setEmail,
        password, setPassword,
        setCaptchaToken,
        error,
        emailError,
        captchaRef,
        handleSubmit,
        handleGoogleLogin,
    } = useLogin();

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

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
                            <form onSubmit={handleSubmit} className="auth-form">
                                <TextField
                                    label="Email"
                                    variant="outlined"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
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
                                    required
                                />
                                <p
                                    className="password-hint"
                                    style={{
                                        fontSize: '0.75rem',
                                        marginTop: '-6px',
                                        marginBottom: 0,
                                        color: password.length === 0
                                            ? 'var(--text-secondary)'
                                            : password.length >= 8
                                                ? 'var(--success-color)'
                                                : 'var(--error-color)',
                                    }}
                                >
                                    {password.length === 0
                                        ? 'The password must be 8 digits long or more.'
                                        : password.length >= 8
                                            ? 'Valid Password.'
                                            : 'The password must be 8 digits long or more.'}
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
                                    disabled={!!emailError || password.length < 8}
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
