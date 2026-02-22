import React, { useState } from 'react';
import SideBar from "./components/SideBar";
import TopBar from "./components/TopBar";
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
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
        captchaRef,
        handleSubmit,
        handleGoogleLogin,
    } = useLogin();

    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
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
                <main className="panel">
                    <div className="auth-container">
                        <h2>Login</h2>

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
                            <TextField
                                label="Password"
                                variant="outlined"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />

                            {/* Captcha Widget */}
                            <div className="captcha-container">
                                <ReCAPTCHA
                                    ref={captchaRef}
                                    sitekey={RECAPTCHA_SITE_KEY}
                                    onChange={(token) => setCaptchaToken(token)}
                                />
                            </div>

                            <Button variant="contained" color="primary" type="submit" size="large">
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
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Login;
