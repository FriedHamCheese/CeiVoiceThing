import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export const useAssigneeProfile = () => {
    const { user, API_URL } = useAuth();
    const [profile, setProfile] = useState({
        email: '',
        name: '',
        contact: '',
        scope: []
    });
    const [newTag, setNewTag] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const fetchProfile = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/assignees/self-scope`, {
                credentials: 'include'
            });
            if (!response.ok) throw new Error(`Server returned status ${response.status}`);
            const data = await response.json();
            setProfile({
                email: data.email || '',
                name: data.name || '',
                contact: data.contact || '',
                scope: data.scope || []
            });
            setMessage({ type: '', text: '' });
        } catch (error) {
            console.error('Failed to fetch profile:', error);
            setMessage({ type: 'error', text: 'Failed to load profile data.' });
        } finally {
            setIsLoading(false);
        }
    }, [API_URL, user]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleSave = async () => {
        setIsSaving(true);
        setMessage({ type: '', text: '' });
        try {
            const response = await fetch(`${API_URL}/api/assignees/self-scope`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contact: profile.contact,
                    scope: profile.scope
                }),
                credentials: 'include'
            });
            if (!response.ok) throw new Error(`Server returned status ${response.status}`);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (error) {
            console.error('Failed to update profile:', error);
            setMessage({ type: 'error', text: 'Failed to update profile.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddTag = () => {
        if (newTag.trim() && !profile.scope.includes(newTag.trim())) {
            setProfile(prev => ({ ...prev, scope: [...prev.scope, newTag.trim()] }));
            setNewTag('');
        }
    };

    const handleDeleteTag = (tagToDelete) => {
        setProfile(prev => ({ ...prev, scope: prev.scope.filter(tag => tag !== tagToDelete) }));
    };

    return {
        profile, setProfile,
        newTag, setNewTag,
        isLoading, isSaving,
        message, setMessage,
        handleSave, handleAddTag, handleDeleteTag
    };
};
