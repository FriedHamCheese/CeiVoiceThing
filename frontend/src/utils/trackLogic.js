import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const useTrackTicket = (propToken, urlToken, searchParamsEmail) => {
    const { user, API_URL } = useAuth();
    const tokenFromParams = propToken || urlToken;

    // State
    const [inputToken, setInputToken] = useState(tokenFromParams || '');
    const [email, setEmail] = useState(searchParamsEmail || (user ? user.email : ''));
    const [ticketStatus, setTicketStatus] = useState(null);
    const [userTickets, setUserTickets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [newComment, setNewComment] = useState('');
    const [commentError, setCommentError] = useState('');
    const [viewMode, setViewMode] = useState(tokenFromParams ? 'details' : (user ? 'list' : 'search'));

    useEffect(() => {
        if (tokenFromParams) {
            if (email || user) {
                fetchStatus(null, tokenFromParams, user ? user.email : email);
            } else {
                setViewMode('search');
            }
        } else if (user) {
            fetchUserTickets();
            setViewMode('list');
        }
    }, [tokenFromParams, user]);

    const fetchUserTickets = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/tickets/requests`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: user.email }),
            });
            if (response.ok) {
                setUserTickets(await response.json());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStatus = async (e, tOverride, eOverride) => {
        if (e) e.preventDefault();
        const t = tOverride || inputToken;
        const em = eOverride || email;

        if (!em || !t) return;

        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${API_URL}/public/tickets/track/${t}?email=${encodeURIComponent(em)}`, {
                credentials: 'include'
            });
            const data = await response.json();

            if (response.ok) {
                setTicketStatus(data);
                setViewMode('details');
            } else {
                setError(data.error || "Failed to fetch status.");
            }
        } catch (err) {
            setError("Network error. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        setCommentError('');
        const currentToken = tokenFromParams || inputToken || (ticketStatus ? ticketStatus.token : null);

        try {
            const response = await fetch(`${API_URL}/public/tickets/track/${currentToken}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user ? user.email : email, text: newComment }),
                credentials: 'include'
            });
            if (response.ok) {
                setNewComment('');
                fetchStatus(null, currentToken, user ? user.email : email);
            } else {
                const data = await response.json();
                setCommentError(data.error || "Failed to post comment.");
            }
        } catch (err) {
            setCommentError("Network error.");
        }
    };

    const getStep = (status) => {
        switch (status) {
            case 'Draft': return 1;
            case 'New': return 2;
            case 'Assigned': return 2;
            case 'Solving': return 3;
            case 'Solved': return 4;
            case 'Failed': return 4;
            default: return 0;
        }
    };

    return {
        inputToken, setInputToken,
        email, setEmail,
        ticketStatus, setTicketStatus,
        userTickets,
        loading,
        error,
        newComment, setNewComment,
        commentError,
        viewMode, setViewMode,
        fetchStatus,
        fetchUserTickets,
        handleAddComment,
        getStep,
        user
    };
};
