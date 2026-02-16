import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export const useLogin = () => {
    const { login, API_URL } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [captchaToken, setCaptchaToken] = useState(null);
    const [error, setError] = useState('');
    const captchaRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Please fill in all fields.');
            return;
        }
        if (!captchaToken) {
            setError('Please complete the CAPTCHA.');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password, captchaToken }),
            });

            const data = await response.json();

            if (!response.ok) {
                captchaRef.current.reset();
                setCaptchaToken(null);
                setError(data.message || 'Login failed.');
                return;
            }

            if (data.success) {
                login(data.user);
            }
        } catch (err) {
            setError('Network error: Could not connect to the server.');
            console.error(err);
        }
    };

    const handleGoogleLogin = () => {
        window.location.href = `${API_URL}/auth/google`;
    };

    return {
        email, setEmail,
        password, setPassword,
        setCaptchaToken,
        error,
        captchaRef,
        handleSubmit,
        handleGoogleLogin,
        API_URL
    };
};

export const useRegister = () => {
    const { login, API_URL } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [captchaToken, setCaptchaToken] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const captchaRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

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
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password, captchaToken }),
            });

            const data = await response.json();

            if (!response.ok) {
                captchaRef.current.reset();
                setCaptchaToken(null);
                setError(data.message || 'Registration failed.');
                return;
            }

            if (data.success) {
                setSuccess(true);
                login(data.user);
            }
        } catch (err) {
            setError('Network error: Could not connect to the server.');
            console.error(err);
        }
    };

    const handleGoogleRegister = () => {
        window.location.href = `${API_URL}/auth/google`;
    };

    return {
        email, setEmail,
        password, setPassword,
        confirmPassword, setConfirmPassword,
        setCaptchaToken,
        error,
        success,
        captchaRef,
        handleSubmit,
        handleGoogleRegister,
        API_URL
    };
};
