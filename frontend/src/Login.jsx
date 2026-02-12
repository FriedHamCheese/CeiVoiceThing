import React, { useState, useRef } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import ReCAPTCHA from "react-google-recaptcha";


// Construct API URL
const API_HOST = import.meta.env.VITE_API_HOST || 'localhost';
const API_PORT = import.meta.env.VITE_API_PORT || '3001';
const API_URL = `http://${API_HOST}:${API_PORT}`;
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

function Login({ onLogin }) {
    // 1. State for new fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [captchaToken, setCaptchaToken] = useState(null);
    const [error, setError] = useState('');

    // Ref to reset captcha if login fails
    const captchaRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // 2. Validation
        if (!email || !password) {
            setError('Please fill in all fields.');
            return;
        }
        if (!captchaToken) {
            setError('Please complete the CAPTCHA.');
            return;
        }

        try {
            // 3. Send Login Request
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // IMPORTANT: Send cookie/session data
                credentials: 'include',
                body: JSON.stringify({
                    email,
                    password,
                    captchaToken
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Reset captcha on failure so user can try again
                captchaRef.current.reset();
                setCaptchaToken(null);
                setError(data.message || 'Login failed.');
                return;
            }

            if (data.success) {
                // 4. Success: Pass full user object to parent
                // Note: We do NOT use localStorage for auth anymore (Cookies handle it)
                onLogin(data.user);
            }
        } catch (err) {
            setError('Network error: Could not connect to the server.');
            console.error(err);
        }
    };

    // 5. Handle Google Redirect
    const handleGoogleLogin = () => {
        // Simple redirect to backend endpoint
        window.location.href = `${API_URL}/auth/google`;
    };

    return (
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
    );
}

export default Login;