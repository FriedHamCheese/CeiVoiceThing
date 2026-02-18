import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export const useDashboardTicketsSpecialist = () => {
    const { user, API_URL } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [viewingTicket, setViewingTicket] = useState(null);

    const [specialists, setSpecialists] = useState([]);
    const [comments, setComments] = useState([]);
    const [history, setHistory] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [isCommentInternal, setIsCommentInternal] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);

    const fetchAllTickets = useCallback(async () => {
        setIsLoading(true);
        if (!user) return;

        try {
            const endpoint = `${API_URL}/specialist/tickets`;
            const response = await fetch(endpoint, {
                credentials: 'include'
            });

            if (!response.ok) throw new Error(`Server returned status ${response.status}`);
            const data = await response.json();

            if (!Array.isArray(data.tickets)) throw new Error("Invalid data format.");
            setTickets(data.tickets);
            setErrorMessage('');
        } catch (err) {
            setErrorMessage(err.message || "Network error");
        } finally {
            setIsLoading(false);
        }
    }, [API_URL, user]);

    const fetchSpecialists = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/tickets/specialists`, { credentials: 'include' });
            if (response.ok) setSpecialists(await response.json());
        } catch (err) { console.error("Failed to fetch specialists", err); }
    }, [API_URL]);

    useEffect(() => {
        if (user) {
            fetchAllTickets();
        }
    }, [fetchAllTickets, user]);

    useEffect(() => {
        if (user) {
            fetchSpecialists();
        }
    }, [fetchSpecialists, user]);

    // Sub-fetchers
    const fetchComments = async (id) => {
        try {
            const response = await fetch(`${API_URL}/tickets/${id}/comments`, { credentials: 'include' });
            if (response.ok) setComments(await response.json());
        } catch (err) { console.error("Failed to fetch comments", err); }
    };

    const fetchHistory = async (id) => {
        try {
            const response = await fetch(`${API_URL}/specialist/tickets/${id}/history`, { credentials: 'include' });
            if (response.ok) setHistory(await response.json());
        } catch (err) { console.error("Failed to fetch history", err); }
    };

    const fetchFollowStatus = async (id) => {
        try {
            const response = await fetch(`${API_URL}/tickets/${id}/is_following`, { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                setIsFollowing(data.isFollowing);
            }
        } catch (err) { console.error("Failed to fetch follow status", err); }
    };

    useEffect(() => {
        if (viewingTicket) {
            fetchComments(viewingTicket.id);
            fetchHistory(viewingTicket.id);
            fetchFollowStatus(viewingTicket.id);
        }
    }, [viewingTicket]);

    const handleUpdateTicket = async (id, updates) => {
        setIsUpdating(true);
        try {
            const response = await fetch(`${API_URL}/specialist/tickets/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
                credentials: 'include'
            });
            if (response.ok) {
                fetchAllTickets();
                fetchHistory(id);
                setViewingTicket(prev => ({ ...prev, ...updates }));
            } else {
                const error = await response.json();
                setErrorMessage(error.message || "Failed to update status");
            }
        } catch (err) { console.error("Failed to update ticket", err); }
        setIsUpdating(false);
    };

    const handleAddComment = async (id) => {
        if (!newComment.trim()) return;
        try {
            const response = await fetch(`${API_URL}/tickets/${id}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: newComment,
                    authorEmail: user?.email,
                    isInternal: isCommentInternal
                }),
                credentials: 'include'
            });
            if (response.ok) {
                setNewComment('');
                setIsCommentInternal(false);
                fetchComments(id);
            }
        } catch (err) { console.error("Failed to add comment", err); }
    };

    const handleToggleFollow = async (id) => {
        try {
            const response = await fetch(`${API_URL}/tickets/${id}/follow`, {
                method: 'POST',
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setIsFollowing(data.isFollowing);
            }
        } catch (err) { console.error("Failed to toggle follow", err); }
    };

    return {
        tickets, errorMessage, setErrorMessage, isLoading,
        viewingTicket, setViewingTicket,
        specialists,
        comments, history,
        newComment, setNewComment,
        isUpdating,
        isCommentInternal, setIsCommentInternal,
        fetchAllTickets,
        handleUpdateTicket, handleAddComment,
        handleToggleFollow, isFollowing,
        user
    };
};
