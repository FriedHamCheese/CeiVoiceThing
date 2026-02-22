import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogActions,
    DialogContent,
    Button,
    Chip,
    Select,
    MenuItem,
    Box,
    Typography,
    Grid,
    ToggleButtonGroup,
    ToggleButton,
} from '@mui/material';
import CreateIcon from '@mui/icons-material/Create';

export function UserElement({ userObject, setErrorMessage, API_URL, refreshPage, editScopeTagWindow }) {
    async function changePermission(value) {
        if (value === userObject.perm) return;

        let response;
        try {
            response = await fetch(`${API_URL}/admin/users/setUserRole/`, {
                method: "POST",
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userEmail: userObject.email,
                    perm: value
                })
            });
        } catch (err) {
            if (err instanceof TypeError) {
                setErrorMessage("Couldn't connect to server.");
                return false;
            }
            throw err;
        }

        setErrorMessage('');
        if (response.ok) return true;
        let objectFromResponse;
        try {
            objectFromResponse = await response.json();
            setErrorMessage(objectFromResponse.message
                || `Received HTTP status ${response.status} from server.`);
        } catch (err) {
            if (err instanceof TypeError) {
                setErrorMessage("Couldn't decode server response.");
                return false;
            } if (err instanceof SyntaxError) {
                setErrorMessage("Server returned invalid JSON.");
                return false;
            } throw err;
        }
    }

    const WAIT_FOR_SERVER_TO_WRITE_MS = 200;

    return (
        <Grid container sx={{ mb: '5px', alignItems: 'center', rowGap: 1 }}>
            <Grid size={{ xs: 12, sm: 4 }} sx={{ mr: '20px' }}>
                <Typography variant='h6' sx={{ color: '#666666' }}>{userObject.name}</Typography>
                <Typography variant='subtitle2' sx={{ color: '#AAAAAA' }}>{userObject.email}</Typography>
            </Grid>

            <ToggleButtonGroup
                value={userObject.perm}
                exclusive
                onChange={async (_, value) => {
                    changePermission(value);
                    await new Promise(r => setTimeout(r, WAIT_FOR_SERVER_TO_WRITE_MS));
                    await refreshPage();
                }}
                sx={{ mr: '10px' }}
            >
                <ToggleButton value={1} color='primary'>User</ToggleButton>
                <ToggleButton value={2} color='primary'>Specialist</ToggleButton>
                <ToggleButton value={4} color='primary'>Admin</ToggleButton>
            </ToggleButtonGroup>

            {
                (userObject.perm === 2) ? <Button
                    onClick={(e) => { editScopeTagWindow(userObject); }}
                    variant="outlined"
                    sx={{ borderRadius: '30px', mt: '10px', minWidth: 0, width: '30px', height: '30px' }}
                >
                    <CreateIcon sx={{ width: '15px', padding: 0 }} />
                </Button> : null
            }
        </Grid>
    );
}



export function ScopeTagEditWindow({ userObject, windowOpen, closeSelf, API_URL }) {
    const [errorMessage, setErrorMessage] = useState('');
    const [scopeTags, setScopeTags] = useState([]);
    const [availableCategories, setAvailableCategories] = useState([]);

    function removeScopeTag(scopeTagStr) {
        const REMOVE_ELEMENT_AT_INDEX = 1;
        const indexOfStr = scopeTags.indexOf(scopeTagStr);
        setScopeTags(scopeTags.toSpliced(indexOfStr, REMOVE_ELEMENT_AT_INDEX));
    }

    function addScopeTag(scopeTagStr) {
        if (scopeTags.includes(scopeTagStr)) return;
        setScopeTags(scopeTags.concat([scopeTagStr]));
    }

    async function getScopeTags() {
        let response;
        try {
            response = await fetch(`${API_URL}/admin/users/getScopeTags/`, {
                method: "GET",
                credentials: 'include',
                headers: { email: userObject.email },
            });
        } catch (err) {
            if (err instanceof TypeError)
                return setErrorMessage("Couldn't connect to server.");
            throw err;
        }

        setErrorMessage('');
        let objectFromResponse;
        try {
            objectFromResponse = await response.json();
        } catch (err) {
            if (err instanceof TypeError)
                return setErrorMessage("Couldn't decode server response.");
            if (err instanceof SyntaxError)
                return setErrorMessage("Server returned invalid JSON.");
            throw err;
        }
        if (!(response.ok))
            return setErrorMessage(objectFromResponse.message
                || `Received HTTP status ${response.status} from server.`);


        if (!(objectFromResponse instanceof Array))
            return setErrorMessage("Received object from response not an Array.");
        setScopeTags(objectFromResponse);
    }

    async function sendScopeTags() {
        let response;
        try {
            response = await fetch(`${API_URL}/admin/users/setScopeTags/`, {
                method: "POST",
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: userObject.email,
                    scopeTags: scopeTags
                })
            });
        } catch (err) {
            if (err instanceof TypeError) {
                setErrorMessage("Couldn't connect to server.");
                return false;
            }
            throw err;
        }

        setErrorMessage('');
        if (response.ok) return true;

        let objectFromResponse;
        try {
            objectFromResponse = await response.json();
        } catch (err) {
            if (err instanceof TypeError) {
                setErrorMessage("Couldn't decode server response.");
                return false;
            }
            if (err instanceof SyntaxError) {
                setErrorMessage("Server returned invalid JSON.");
                return false;
            }
            throw err;
        }

        setErrorMessage(objectFromResponse.message
            || `Received HTTP status ${response.status} from server.`);
        return false;
    }

    async function getCategories() {
        try {
            const response = await fetch(`${API_URL}/tickets/scope/`, {
                method: "GET",
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                if (data instanceof Array) setAvailableCategories(data);
            }
        } catch (err) {
            console.error("Failed to fetch categories:", err);
        }
    }

    const RUN_FIRST_TIME = [];
    useEffect(() => {
        getScopeTags();
        getCategories();
    }, RUN_FIRST_TIME);

    return (
        <Dialog open={windowOpen} onClose={closeSelf} fullWidth maxWidth='sm'>
            <DialogTitle variant='h5' sx={{ mt: '15px' }}>{userObject.name}</DialogTitle>
            <DialogContent>
                <Typography variant="subtitle2" sx={{ mb: '30px', color: '#AAAAAA' }}>{userObject.email}</Typography>
                <Box sx={{ mt: '10px', mb: '15px' }}>
                    <Typography sx={{ display: 'inline-block', mr: '10px' }}>Scope Tags</Typography>
                    <Select value="" displayEmpty onChange={(e) => { addScopeTag(e.target.value) }}>
                        <MenuItem value="" disabled sx={{ display: 'none' }}>Select category</MenuItem>
                        {
                            availableCategories.map((tag, i) => <MenuItem key={i} value={tag}>{tag}</MenuItem>)
                        }
                    </Select>
                </Box>
                <Box>
                    {
                        scopeTags.map((scopeTag, i) => <Chip
                            key={i}
                            onDelete={() => { removeScopeTag(scopeTag) }}
                            label={scopeTag}
                            sx={{ mr: '5px', mb: '5px' }}
                        />)
                    }
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={closeSelf}>Close</Button>
                <Button onClick={(e) => {
                    if (sendScopeTags()) closeSelf();
                }}>
                    Submit Changes
                </Button>
            </DialogActions>
            <p style={{ color: 'red' }}>{errorMessage}</p>
        </Dialog>
    );
}