import React from 'react';
import {
    Container, Typography, Box, Button, TextField, Stack,
    Paper, CircularProgress, Alert, Chip, IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import { useAssigneeProfile } from './utils/assigneeProfileLogic';

export default function AssigneeProfile() {
    const {
        profile, setProfile,
        newTag, setNewTag,
        isLoading, isSaving,
        message, setMessage,
        handleSave, handleAddTag, handleDeleteTag
    } = useAssigneeProfile();

    const handleBack = () => {
        window.history.back();
    };

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" alignItems="center" mb={3}>
                <IconButton onClick={handleBack} sx={{ mr: 2 }}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h4" component="h1" fontWeight="bold">
                    My Profile & Specialization
                </Typography>
            </Box>

            {message.text && (
                <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage({ type: '', text: '' })}>
                    {message.text}
                </Alert>
            )}

            <Paper sx={{ p: 4, borderRadius: 2 }}>
                <Stack spacing={3}>
                    <Box display="flex" gap={2}>
                        <TextField
                            label="Name"
                            value={profile.name}
                            variant="outlined"
                            fullWidth
                            disabled
                        />
                        <TextField
                            label="Email"
                            value={profile.email}
                            variant="outlined"
                            fullWidth
                            disabled
                        />
                    </Box>

                    <TextField
                        label="Contact Information (Phone, Slack, etc.)"
                        value={profile.contact}
                        onChange={(e) => setProfile({ ...profile, contact: e.target.value })}
                        variant="outlined"
                        fullWidth
                        placeholder="e.g. +1 234 567 890 or @username"
                    />

                    <Box>
                        <Typography variant="h6" gutterBottom>
                            My Specializations / Scope Tags
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mb={2}>
                            Add tags that represent your areas of expertise. These help in auto-assigning tickets to you.
                        </Typography>

                        <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {profile.scope.map((tag) => (
                                <Chip
                                    key={tag}
                                    label={tag}
                                    onDelete={() => handleDeleteTag(tag)}
                                    color="primary"
                                    variant="outlined"
                                />
                            ))}
                            {profile.scope.length === 0 && (
                                <Typography variant="body2" fontStyle="italic" color="text.secondary">
                                    No tags added yet.
                                </Typography>
                            )}
                        </Box>

                        <Box display="flex" gap={1}>
                            <TextField
                                size="small"
                                placeholder="Add a new tag (e.g. UI, Database, Bug)"
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                            />
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={handleAddTag}
                                disabled={!newTag.trim()}
                            >
                                Add
                            </Button>
                        </Box>
                    </Box>

                    <Box display="flex" justifyContent="flex-end" mt={2}>
                        <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </Box>
                </Stack>
            </Paper>
        </Container>
    );
}
