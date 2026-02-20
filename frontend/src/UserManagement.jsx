import {UserElement, ScopeTagEditWindow} from './components/UserManagementComponents.jsx'

import {Box, Typography} from '@mui/material';
import {useState, useEffect} from 'react';
import { useAuth } from './context/AuthContext';

export default function ViewAllUsers(){
    const [editingScopeTag, setEditingScopeTag] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [userObjects, setUserObjects] = useState([]);
    const [scopeEditingUserObject, setScopeEditingUserObject] = useState({});
    const [scope, setScope] = useState([]);
    
    const {API_URL} = useAuth();
    
    async function getAllUsers(){
        let response;
        try{
            response = await fetch(`${API_URL}/admin/users/`, {method: "GET", credentials: 'include'});
        }catch(err){
            if(err instanceof TypeError) 
                return setErrorMessage("Couldn't connect to server.");
            throw err;
        }
        
        let objectFromResponse;
        try{
            objectFromResponse = await response.json();
        }catch(err){
            if(err instanceof TypeError)
                return setErrorMessage("Couldn't decode server response.")
            if(err instanceof SyntaxError) 
                return setErrorMessage("Server returned invalid JSON.")
            throw err;
        }
        
        if(!(response.ok))
            return setErrorMessage(`Received HTTP status ${response.status} from server.`);
        
        if(!(objectFromResponse instanceof Array))
            return setErrorMessage("Object from response not an Array.");
        setUserObjects(objectFromResponse);
        setErrorMessage("");
    }

    async function getAllScopeTags(){
        let response;
        try{
            response = await fetch(`${API_URL}/admin/scope-tags/`, {method: "GET", credentials: 'include'});
        }catch(err){
            if(err instanceof TypeError) 
                return setErrorMessage("Couldn't connect to server.");
            throw err;
        }
        
        let objectFromResponse;
        try{
            objectFromResponse = await response.json();
        }catch(err){
            if(err instanceof TypeError)
                return setErrorMessage("Couldn't decode server response.")
            if(err instanceof SyntaxError) 
                return setErrorMessage("Server returned invalid JSON.")
            throw err;
        }
        
        if(!(response.ok))
            return setErrorMessage(`Received HTTP status ${response.status} from server.`);
        
        if(!(objectFromResponse instanceof Array))
            return setErrorMessage("Object from response not an Array.");
        setScope(objectFromResponse);
        setErrorMessage("");
    }
    
    const RUN_FIRST_TIME = [];
    useEffect(() => {getAllUsers();}, RUN_FIRST_TIME);

    return(
        <Box>
        {
            //Wrap in conditional so the useEffect in the window is triggered per window opening, 
            //fetching the scope tags
            editingScopeTag && <ScopeTagEditWindow 
                userObject={scopeEditingUserObject} 
                windowOpen={editingScopeTag}
                closeSelf={() => {
                    setEditingScopeTag(editingScopeTag => false);
                }}
                API_URL={API_URL}
            />
        }
        <Typography variant='h4' sx={{mb: '40px'}}>All Users in the System</Typography>
        
        <Typography variant='h5' sx={{mb: '20px'}}>Admins</Typography>
        <Box sx={{mb: '40px'}}>
            {
                userObjects.map(userObject => ((userObject.perm === 4) ?
                    <UserElement 
                        userObject={userObject} 
                        refreshPage={getAllUsers}
                        setErrorMessage={setErrorMessage}
                        API_URL={API_URL}
                        editScopeTagWindow={(userObject) => {
                            setEditingScopeTag(true);
                            setScopeEditingUserObject(userObject);
                        }}
                    /> : null
                ))
            }
        </Box>
        
        <Typography variant='h5' sx={{mb: '20px'}}>Specialists</Typography>        
        <Box sx={{mb: '40px'}}>
            {
                userObjects.map(userObject => ((userObject.perm === 2) ?
                    <UserElement 
                        userObject={userObject} 
                        refreshPage={getAllUsers}
                        setErrorMessage={setErrorMessage}
                        API_URL={API_URL}
                        editScopeTagWindow={(userObject) => {
                            setEditingScopeTag(true);
                            setScopeEditingUserObject(userObject);
                        }}
                    /> : null
                ))
            }
        </Box>
        
        <Typography variant='h5' sx={{mb: '20px'}}>Users</Typography>        
        <Box sx={{mb: '40px'}}>
            {
                userObjects.map(userObject => ((userObject.perm === 1) ?
                    <UserElement 
                        userObject={userObject} 
                        refreshPage={getAllUsers}
                        setErrorMessage={setErrorMessage}
                        API_URL={API_URL}
                        editScopeTagWindow={(userObject) => {
                            setEditingScopeTag(true);
                            setScopeEditingUserObject(userObject);
                        }}
                    /> : null
                ))
            }
        </Box>
        <p style={{color: 'red'}}>{errorMessage}</p> 
        </Box>
    );
}