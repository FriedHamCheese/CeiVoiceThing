import { UserElement, ScopeTagEditWindow } from './components/UserManagementComponents.jsx'

import { Box, Typography, Grid, Paper } from '@mui/material';
import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';

export default function ViewAllUsers() {
    const [editingScopeTag, setEditingScopeTag] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [userObjects, setUserObjects] = useState([]);
    const [scopeEditingUserObject, setScopeEditingUserObject] = useState({});
    const [scope, setScope] = useState([]);

    const { API_URL } = useAuth();

    async function getAllUsers() {
        let response;
        try {
            response = await fetch(`${API_URL}/admin/users/`, { method: "GET", credentials: 'include' });
        } catch (err) {
            if (err instanceof TypeError)
                return setErrorMessage("Couldn't connect to server.");
            throw err;
        }

        let objectFromResponse;
        try {
            objectFromResponse = await response.json();
        } catch (err) {
            if (err instanceof TypeError)
                return setErrorMessage("Couldn't decode server response.")
            if (err instanceof SyntaxError)
                return setErrorMessage("Server returned invalid JSON.")
            throw err;
        }

        if (!(response.ok))
            return setErrorMessage(`Received HTTP status ${response.status} from server.`);

        if (!(objectFromResponse instanceof Array))
            return setErrorMessage("Object from response not an Array.");
        setUserObjects(objectFromResponse);
        setErrorMessage("");
    }

    async function getAllScopeTags() {
        let response;
        try {
            response = await fetch(`${API_URL}/admin/scope-tags/`, { method: "GET", credentials: 'include' });
        } catch (err) {
            if (err instanceof TypeError)
                return setErrorMessage("Couldn't connect to server.");
            throw err;
        }

        let objectFromResponse;
        try {
            objectFromResponse = await response.json();
        } catch (err) {
            if (err instanceof TypeError)
                return setErrorMessage("Couldn't decode server response.")
            if (err instanceof SyntaxError)
                return setErrorMessage("Server returned invalid JSON.")
            throw err;
        }

        if (!(response.ok))
            return setErrorMessage(`Received HTTP status ${response.status} from server.`);

        if (!(objectFromResponse instanceof Array))
            return setErrorMessage("Object from response not an Array.");
        setScope(objectFromResponse);
        setErrorMessage("");
    }

    const RUN_FIRST_TIME = [];
    useEffect(() => { getAllUsers(); }, RUN_FIRST_TIME);

    return (
        <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0, px: { xs: 1, sm: 2 }, py: 1, boxSizing: 'border-box' }}>
            {
                editingScopeTag && <ScopeTagEditWindow
                    userObject={scopeEditingUserObject}
                    windowOpen={editingScopeTag}
                    closeSelf={() => {
                        setEditingScopeTag(editingScopeTag => false);
                    }}
                    API_URL={API_URL}
                />
            }
            <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mb: 3 }}>
                All Users in the System
            </Typography>

            <Typography variant="h5" sx={{ mb: 2, mt: 3 }}>Admins</Typography>
            <Grid container spacing={2} sx={{ width: '100%', mb: 4 }}>
                {userObjects.filter(u => u.perm === 4).map(userObject => (
                    <Grid item xs={12} sm={6} lg={4} key={userObject.email}>
                        <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                            <UserElement
                                userObject={userObject}
                                refreshPage={getAllUsers}
                                setErrorMessage={setErrorMessage}
                                API_URL={API_URL}
                                editScopeTagWindow={(obj) => {
                                    setEditingScopeTag(true);
                                    setScopeEditingUserObject(obj);
                                }}
                            />
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            <Typography variant="h5" sx={{ mb: 2, mt: 3 }}>Specialists</Typography>
            <Grid container spacing={2} sx={{ width: '100%', mb: 4 }}>
                {userObjects.filter(u => u.perm === 2).map(userObject => (
                    <Grid item xs={12} sm={6} lg={4} key={userObject.email}>
                        <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                            <UserElement
                                userObject={userObject}
                                refreshPage={getAllUsers}
                                setErrorMessage={setErrorMessage}
                                API_URL={API_URL}
                                editScopeTagWindow={(obj) => {
                                    setEditingScopeTag(true);
                                    setScopeEditingUserObject(obj);
                                }}
                            />
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            <Typography variant="h5" sx={{ mb: 2, mt: 3 }}>Users</Typography>
            <Grid container spacing={2} sx={{ width: '100%', mb: 4 }}>
                {userObjects.filter(u => u.perm === 1).map(userObject => (
                    <Grid item xs={12} sm={6} lg={4} key={userObject.email}>
                        <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                            <UserElement
                                userObject={userObject}
                                refreshPage={getAllUsers}
                                setErrorMessage={setErrorMessage}
                                API_URL={API_URL}
                                editScopeTagWindow={(obj) => {
                                    setEditingScopeTag(true);
                                    setScopeEditingUserObject(obj);
                                }}
                            />
                        </Paper>
                    </Grid>
                ))}
            </Grid>
            {errorMessage && <Typography color="error" sx={{ mt: 2 }}>{errorMessage}</Typography>}
        </Box>
    );
}