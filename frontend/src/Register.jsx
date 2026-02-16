import React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
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

    const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

    return (
        <div className="auth-container">
            <h2>Create Account</h2>

            {success ? (
                <p className="auth-success">Registration successful! Logging you in...</p>
            ) : (
                <>
                    {/* --- LOCAL REGISTRATION FORM --- */}
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
                        <TextField
                            label="Confirm Password"
                            variant="outlined"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
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
                            Register with Email
                        </Button>
                    </form>

                    {error && <p className="auth-error">{error}</p>}

                    {/* --- DIVIDER --- */}
                    <Divider className="auth-divider">OR</Divider>

                    {/* --- GOOGLE REGISTRATION --- */}
                    <Button
                        variant="outlined"
                        color="secondary"
                        fullWidth
                        onClick={handleGoogleRegister}
                        className="google-btn"
                    >
                        Sign up with Google
                    </Button>
                </>
            )}
        </div>
    );
}

export default Register;
