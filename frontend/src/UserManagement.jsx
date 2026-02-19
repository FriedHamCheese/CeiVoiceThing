import React, { useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Select,
    MenuItem,
    TextField,
    CircularProgress,
    Alert,
    Chip,
    InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useUserManagement } from './utils/userManagementLogic';

const ROLE_MAP = {
    1: { label: 'User', color: 'default' },
    2: { label: 'Specialist', color: 'primary' },
    4: { label: 'Admin', color: 'secondary' }
};

export default function UserManagement() {
    const { users, loading, error, updateUserRole } = useUserManagement();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleRoleChange = async (email, newPerm) => {
        await updateUserRole(email, parseInt(newPerm));
    };

    if (loading && users.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box p={4}>
            <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                User Management
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
                Manage user roles and permissions across the system.
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Box mb={3}>
                    <TextField
                        fullWidth
                        placeholder="Search by name or email..."
                        variant="outlined"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Box>

                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Current Role</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredUsers.map((user) => (
                                <TableRow key={user.id} hover>
                                    <TableCell>{user.name || 'N/A'}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={ROLE_MAP[user.perm]?.label || 'Unknown'}
                                            color={ROLE_MAP[user.perm]?.color || 'default'}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={user.perm}
                                            onChange={(e) => handleRoleChange(user.email, e.target.value)}
                                            size="small"
                                            sx={{ minWidth: 120 }}
                                        >
                                            <MenuItem value={1}>User</MenuItem>
                                            <MenuItem value={2}>Specialist</MenuItem>
                                            <MenuItem value={4}>Admin</MenuItem>
                                        </Select>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredUsers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                                        <Typography color="textSecondary">No users found matching your search.</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
}
