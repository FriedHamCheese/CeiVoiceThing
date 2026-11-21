// middleware/auth.js

// --- PART 1: AUTHENTICATION (The Gatekeeper) ---
export const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    // Fail fast
    res.status(401).json({ message: 'Unauthorized: Please log in' });
};

// --- PART 2: AUTHORIZATION (The Guard) ---
// This is a "Higher Order Function" - it takes arguments and returns middleware
export const restrictTo = (...allowedRoles) => {
    return (req, res, next) => {
        // 1. Failsafe: Ensure user exists (in case isAuthenticated wasn't called first)
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized: Not logged in' });
        }

        // 2. check if the user's permission matches one of the allowed roles
        if (allowedRoles.includes(req.user.perm)) {
            return next(); // Access Granted
        }

        // 3. Access Denied
        res.status(403).json({ message: 'Forbidden: You do not have permission' });
    };
};