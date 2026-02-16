import mysqlConnection from '../utils/mysqlConnection.js';

export const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: 'Unauthorized: Please log in' });
};

export const isSpecialist = async (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Unauthorized: Please log in' });
    }

    try {
        const [rows] = await mysqlConnection.execute(
            'SELECT perm FROM Users WHERE email = ?',
            [req.user.email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: 'User not found' });
        }

        const userPerm = rows[0].perm;

        // Allow Admin (4) or Specialist (2)
        if (userPerm >= 2) {
            req.user.perm = userPerm;
            return next();
        }

        res.status(403).json({ message: 'Forbidden: Specialist access required' });
    } catch (error) {
        console.error('Specialist check error:', error);
        res.status(500).json({ message: 'Internal server error during auth check' });
    }
};

export const isAdmin = async (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Unauthorized: Please log in' });
    }

    try {
        const [rows] = await mysqlConnection.execute(
            'SELECT perm FROM Users WHERE email = ?',
            [req.user.email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: 'User not found' });
        }

        const userPerm = rows[0].perm;

        // Strict comparison as requested
        if (userPerm === 4) {
            // Update session user to match DB (good practice)
            req.user.perm = userPerm;
            return next();
        }

        res.status(403).json({ message: 'Forbidden: Admin access required' });
    } catch (error) {
        console.error('Admin check error:', error);
        res.status(500).json({ message: 'Internal server error during auth check' });
    }
};
