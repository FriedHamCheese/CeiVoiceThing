import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export const useDashboardTickets = () => {
    const { user, API_URL } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDraftIds, setSelectedDraftIds] = useState(new Set());
    const [showMergeWindow, setShowMergeWindow] = useState(false);
    const [viewingTicket, setViewingTicket] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [isRecommending, setIsRecommending] = useState(false);

    const [assignees, setAssignees] = useState([]);
    const [categories, setCategories] = useState([]);
    const [comments, setComments] = useState([]);
    const [history, setHistory] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [linkedRequests, setLinkedRequests] = useState([]);
    const [isCommentInternal, setIsCommentInternal] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const hasFetched = useRef(false);

    const fetchAllTickets = useCallback(async () => {
        setIsLoading(true);
        if (!user) return;

        try {
            const endpoint = user.perm === 4 ? `${API_URL}/admin/tickets` : `${API_URL}/assignee/tickets`;
            const response = await fetch(endpoint, {
                credentials: 'include' // Ensure cookies are sent for auth check
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

    const fetchRecommendations = useCallback(async () => {
        setIsRecommending(true);
        try {
            const response = await fetch(`${API_URL}/admin/tickets/recommend-merges`, { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                setRecommendations(data.recommendations || []);
            }
        } catch (err) {
            console.error("Recommendations fetch failed:", err);
        } finally {
            setIsRecommending(false);
        }
    }, [API_URL]);

    const fetchAssignees = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/admin/tickets/assignees`, { credentials: 'include' });
            if (response.ok) setAssignees(await response.json());
        } catch (err) { console.error("Failed to fetch assignees", err); }
    }, [API_URL]);

    const fetchCategories = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/tickets/scope`, { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                setCategories(data);
            }
        } catch (err) { console.error("Failed to fetch categories", err); }
    }, [API_URL]);

    useEffect(() => {
        if (!user || hasFetched.current) return;
        hasFetched.current = true;

        fetchAllTickets();
        if (user.perm >= 4) {
            fetchRecommendations();
        }
        fetchAssignees();
        fetchCategories();
    }, [user, fetchAllTickets, fetchRecommendations, fetchAssignees, fetchCategories]);

    // Sub-fetchers
    const fetchComments = async (id) => {
        try {
            const response = await fetch(`${API_URL}/tickets/${id}/comments`, { credentials: 'include' });
            if (response.ok) setComments(await response.json());
        } catch (err) { console.error("Failed to fetch comments", err); }
    };

    const fetchHistory = async (id) => {
        try {
            const response = await fetch(`${API_URL}/admin/tickets/${id}/history`, { credentials: 'include' });
            if (response.ok) setHistory(await response.json());
        } catch (err) { console.error("Failed to fetch history", err); }
    };

    const fetchLinkedRequests = async (id) => {
        try {
            const response = await fetch(`${API_URL}/admin/tickets/${id}/requests`, { credentials: 'include' });
            if (response.ok) setLinkedRequests(await response.json());
        } catch (err) { console.error("Failed to fetch linked requests", err); }
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
        if (viewingTicket?.id) {
            if (viewingTicket.status === 'draft') {
                fetchLinkedRequests(viewingTicket.id);
            } else {
                fetchComments(viewingTicket.id);
                fetchHistory(viewingTicket.id);
                fetchFollowStatus(viewingTicket.id);
            }
        }
    }, [viewingTicket?.id, viewingTicket?.status]);

    // Actions
    const handleUpdateDraft = async (id, updates) => {
        setIsUpdating(true);
        try {
            const response = await fetch(`${API_URL}/admin/tickets/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
                credentials: 'include'
            });
            if (response.ok) {
                fetchAllTickets();
                setViewingTicket(prev => ({ ...prev, ...updates }));
            }
        } catch (err) { console.error("Failed to update draft", err); }
        setIsUpdating(false);
    };

    const handleUnlinkRequest = async (ticketId, requestId) => {
        try {
            const response = await fetch(`${API_URL}/admin/tickets/${ticketId}/unlink/${requestId}`, {
                method: 'POST',
                credentials: 'include'
            });
            if (response.ok) {
                fetchAllTickets();
                fetchLinkedRequests(ticketId);
            } else {
                const error = await response.json();
                setErrorMessage(error.error || "Failed to unlink");
            }
        } catch (err) { console.error("Failed to unlink", err); }
    };

    const handleUpdateTicket = async (id, updates) => {
        setIsUpdating(true);
        try {
            const response = await fetch(`${API_URL}/admin/tickets/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
                credentials: 'include'
            });
            if (response.ok) {
                fetchAllTickets();
                fetchHistory(id);
                setViewingTicket(prev => ({ ...prev, ...updates }));
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
    const promoteTicket = async () => {
        if (!viewingTicket) return;
        try {
            const response = await fetch(`${API_URL}/admin/tickets/${viewingTicket.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'New' }),
                credentials: 'include'
            });
            if (response.ok) {
                setViewingTicket(null);
                fetchAllTickets();
            }
        } catch (err) { console.error(err); }
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

    const handleToggleSelect = (id) => {
        const newSet = new Set(selectedDraftIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedDraftIds(newSet);
    };

    return {
        tickets, errorMessage, setErrorMessage, isLoading,
        selectedDraftIds, setSelectedDraftIds, handleToggleSelect,
        showMergeWindow, setShowMergeWindow,
        viewingTicket, setViewingTicket,
        recommendations,
        assignees, categories,
        comments, history, linkedRequests,
        newComment, setNewComment,
        isUpdating,
        isCommentInternal, setIsCommentInternal,
        fetchAllTickets,
        handleUpdateDraft, handleUnlinkRequest,
        handleUpdateTicket, handleAddComment,
        promoteTicket, handleToggleFollow, isFollowing,
        user, isAdmin: user?.perm >= 4
    };
};
