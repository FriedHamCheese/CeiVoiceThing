export const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: 'Unauthorized: Please log in' });
};

export const isUser = async (req, res, next) => {
    if (!req.isAuthenticated()){
        return res.status(401).json({ message: 'Unauthorized: Please log in' });
    }

    if (req.user.perm === 1) {
        return next();
    }

    res.status(403).json({ message: 'Forbidden: User access required' });
}

export const isAssignee = async (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Unauthorized: Please log in' });
    }

    if (req.user.perm === 2) {
        return next();
    }

    res.status(403).json({ message: 'Forbidden: Assignee access required' });
};


//teamporary. will remove later
export const isSpecialist = async (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Unauthorized: Please log in' });
    }

    if (req.user.perm === 2) {
        return next();
    }

    res.status(403).json({ message: 'Forbidden: Specialist access required' });
};
//end temporary

export const isAdmin = async (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Unauthorized: Please log in' });
    }

    if (req.user.perm === 4) {
        return next();
    }

    res.status(403).json({ message: 'Forbidden: Admin access required' });
};
