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

function Register({ onRegister }) {
    // 1. State for registration fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [captchaToken, setCaptchaToken] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    
    // Ref to reset captcha if registration fails
    const captchaRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // 2. Validation
        if (!email || !password || !confirmPassword) {
            setError('Please fill in all fields.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (!captchaToken) {
            setError('Please complete the CAPTCHA.');
            return;
        }

        try {
            // 3. Send Registration Request
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', 
                body: JSON.stringify({ 
                    email, 
                    password, 
                    captchaToken 
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Reset captcha on failure
                captchaRef.current.reset();
                setCaptchaToken(null);
                setError(data.message || 'Registration failed.');
                return;
            }

            if (data.success) {
                setSuccess(true);
                // 4. Success: Pass user object or redirect
                if (onRegister) onRegister(data.user); 
            }
        } catch (err) {
            setError('Network error: Could not connect to the server.');
            console.error(err);
        }
    };

    // 5. Handle Google Redirect (Registration usually uses same flow as Login)
    const handleGoogleRegister = () => {
        window.location.href = `${API_URL}/auth/google`;
    };

    return (
        <div style={{ maxWidth: '400px', margin: '2rem auto', textAlign: 'center' }}>
            <h2>Create Account</h2>
            
            {success ? (
                <p style={{ color: 'green' }}>Registration successful! Logging you in...</p>
            ) : (
                <>
                    {/* --- LOCAL REGISTRATION FORM --- */}
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                        <TextField
                            label="Confirm Password"
                            variant="outlined"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />

                        {/* Captcha Widget */}
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <ReCAPTCHA
                                ref={captchaRef}
                                sitekey={RECAPTCHA_SITE_KEY}
                                onChange={(token) => setCaptchaToken(token)}
                            />
                        </div>

                        <Button variant="contained" color="primary" type="submit" size="large">
                            Register with Email
                        </Button>
                    </form>

                    {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}

                    {/* --- DIVIDER --- */}
                    <Divider style={{ margin: '2rem 0' }}>OR</Divider>

                    {/* --- GOOGLE REGISTRATION --- */}
                    <Button 
                        variant="outlined" 
                        color="secondary" 
                        fullWidth 
                        onClick={handleGoogleRegister}
                        style={{ textTransform: 'none' }}
                    >
                        Sign up with Google
                    </Button>
                </>
            )}
        </div>
    );
}

export default Register;