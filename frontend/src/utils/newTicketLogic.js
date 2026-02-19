import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const MAX_CHARACTERS = 2048;

export const useNewTicket = (userEmail) => {
    const { API_URL } = useAuth();
    const [requestText, setRequestText] = useState('');
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleTextChange = (e) => {
        setRequestText(e.target.value);
        if (status.message) setStatus({ type: '', message: '' });
    };

    const submitRequestText = async (e) => {
        e.preventDefault();
        const trimmedText = requestText.trim();

        if (!trimmedText) {
            setStatus({ type: 'error', message: 'Please enter the request message.' });
            return;
        }

        setIsSubmitting(true);
        setStatus({ type: '', message: '' });

        try {
            const response = await fetch(`${API_URL}/tickets/request`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fromEmail: userEmail,
                    requestText: trimmedText.substring(0, MAX_CHARACTERS)
                }),
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                const trackingToken = data.trackingToken;
                setRequestText('');
                // Note: Returning the token so the component can construct the success message and link
                return { success: true, trackingToken };
            } else {
                setStatus({ type: 'error', message: `Server Error: ${response.status}` });
                return { success: false };
            }
        } catch (err) {
            setStatus({
                type: 'error',
                message: err instanceof TypeError ? "Network error: Connection failed." : "An unexpected error occurred."
            });
            return { success: false };
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        requestText,
        status, setStatus,
        isSubmitting,
        handleTextChange,
        submitRequestText,
        MAX_CHARACTERS
    };
};
