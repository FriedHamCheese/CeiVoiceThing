import express from 'express';
import mysqlConnection from '../utils/mysqlConnection.js'

const router = express.Router();

router.get('/', async (request, response) => {
   /*
    Endpoint returning all User Objects (Users, Specialists, Admins) in the system.
    
    Returns:
    - HTTP Status 200 with [
        {
            email: str[1-64],
            name: str[1-128],
            perm: int:
                - 1: regular user,
                - 2: specialist,
                - 4: admin
        },
        ...
    ]
    - HTTP status 500 for undocumented errors
    */   
    
    const [allUsers] = await mysqlConnection.execute("SELECT * FROM Users");
    response.json(allUsers);
});

router.post('/setUserRole', async (request, response) => {
   /*
    Endpoint setting permission of a user. 
    Demoting a specialist to a user will remove their associated scope tags.
    
    Input:{
        userEmail: str,
        perm: int: 1, 2, 4
    }
    
    Returns:
    - HTTP status 200 with {}
    - HTTP status 400 with .message if data for the request is invalid
    - HTTP status 500 for undocumented errors
    */   
    
    const USER_PERM = 2;
    const HTTP_STATUS_FOR_OK = 200;
    const HTTP_STATUS_FOR_BAD_REQUEST = 400;
    
    const {userEmail, perm} = request.body;
    if((typeof perm) !== 'number')
        return response.status(HTTP_STATUS_FOR_BAD_REQUEST).json({
            message: "received perm attribute not a number"
        });
    if((typeof userEmail) !== 'string')
        return response.status(HTTP_STATUS_FOR_BAD_REQUEST).json({
            message: "received userEmail attribute not a string"
        });
    if(!(Number.isInteger(perm)))
        return response.status(HTTP_STATUS_FOR_BAD_REQUEST).json({
            message: "received perm attribute not an integer"
        });
    
    let connection;
    try{
        connection = await mysqlConnection.getConnection();
        await connection.beginTransaction();
        await mysqlConnection.execute("UPDATE Users SET perm = ? WHERE email = ?", [perm, userEmail]);
        
        const removeScopeTags = perm === USER_PERM;
        if(removeScopeTags)
            await mysqlConnection.execute("DELETE FROM AssigneeScope WHERE userEmail = ?", [userEmail]);
        await connection.commit();
    }catch(err){
        if(connection) connection.rollback();
        console.log("admin/users/setUserRole: Failed to write to database.");        
        response.json({message: "Failed to write to database."});
    }finally{
        if (connection) connection.release();
    }
    
    response.status(HTTP_STATUS_FOR_OK).json({});
});

router.get('/getScopeTags', async (request, response) => {
    /*
    Endpoint returning all scope tags of a specialist.
    
    headers:{
        email: str
    }
    
    Returns:
    - HTTP status 200 with Array(str[1-64])
    - HTTP status 400 with .message if data for the request is invalid
    - HTTP status 500 for undocumented errors
    */

    const HTTP_STATUS_FOR_OK = 200;
    const HTTP_STATUS_FOR_BAD_REQUEST = 400;    

    const {email} = request.headers;
    if((typeof email) !== 'string')
        return response.status(HTTP_STATUS_FOR_BAD_REQUEST).json({
            message: "received userEmail attribute not a string"
        });
    
    const [usersFromEmail] = await mysqlConnection.execute("SELECT perm FROM Users WHERE email = ?", [email]);
    const invalidEmail = usersFromEmail.length === 0;
    if(invalidEmail)
        return response.status(HTTP_STATUS_FOR_BAD_REQUEST).json({
            message: "received userEmail is invalid"
        });    
    
    const [scopeTagsSql] = await mysqlConnection.execute('SELECT scopeTag FROM AssigneeScope WHERE userEmail = ?', [email]);
    
    const scopeTags = [];
    for (const scopeTagSql of scopeTagsSql)
        scopeTags.push(scopeTagSql.scopeTag);
    response.json(scopeTags);
});

router.post('/setScopeTags', async (request, response) => {
   /*
    Endpoint for setting scope tags of a user.
    
    input:{
        email: str[1-64]
        scopeTags: Array(str[1-64])
    }
    
    - HTTP status 200 with {}
    - HTTP status 400 with .message if data for the request is invalid
    - HTTP status 500 for undocumented errors    
    */
    
    const FIRST_CHARACTER = 0;
    const MAX_SCOPE_TAG_CHARACTERS = 64;
    const HTTP_STATUS_FOR_OK = 200;
    const HTTP_STATUS_FOR_BAD_REQUEST = 400;    
    
    const PREDEFINED_TAGS = [
        'Scholarship',
        'Internship',
        'Medical',
        'Building',
        'Finance',
        'Academics',
        'Transporation',
        'Administration',
        'Facility',
        'Organised Events',
    ];
    
    const {email, scopeTags} = request.body;
    if((typeof email) !== 'string')
        return response.status(HTTP_STATUS_FOR_BAD_REQUEST).json({
            message: "received email attribute not a string"
        });
    if(!(scopeTags instanceof Array))
        return response.status(HTTP_STATUS_FOR_BAD_REQUEST).json({
            message: "received scopeTags attribute not an Array"
        });
    
    let invalidScopeTagType = false;
    //Don't want duplicating tags
    const scopeTagsSet = new Set();
    for(const scopeTag of scopeTags){
        if((typeof scopeTag) !== 'string') {
            invalidScopeTagType = true;
            continue;
        }
        const trimmedTag = scopeTag.substr(FIRST_CHARACTER, MAX_SCOPE_TAG_CHARACTERS);
        if(trimmedTag.length > 0) scopeTagsSet.add(trimmedTag);
    }
    if(invalidScopeTagType) 
        console.log("admin/users/setScopeTags: invalid scope tag type in " + scopeTags);
    
    
    let connection;
    try{
        connection = await mysqlConnection.getConnection();
        await connection.beginTransaction();
        await mysqlConnection.execute("DELETE FROM AssigneeScope WHERE userEmail = ?", [email]);
        
        for(const scopeTag of scopeTagsSet){
            await mysqlConnection.execute("INSERT INTO AssigneeScope (userEmail, scopeTag) VALUES (?, ?)", [
                email, scopeTag
            ]);
        }
        await connection.commit();
    }catch(err){
        if(connection) connection.rollback();
        console.log("admin/users/setScopeTags: Failed to write to database.");        
        response.json({message: "Failed to write to database."});
    }finally{
        if (connection) connection.release();
        response.status(HTTP_STATUS_FOR_OK)
    }
});

export default router;