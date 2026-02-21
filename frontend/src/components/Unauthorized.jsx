import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Unauthorized = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => {
            navigate('/');
        }, 3000); // Redirect after 3 seconds

        return () => clearTimeout(timer); // Cleanup timer on unmount
    }, [navigate]);

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
            <h1 className="text-4xl font-bold text-red-600 mb-4">403 - Unauthorized</h1>
            <p className="text-lg text-gray-700 mb-2">You do not have permission to view this page.</p>
            <p className="text-sm text-gray-500 mb-8">Redirecting to home in 3 seconds...</p>
            <Link to="/" className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-300">
                Go to Home
            </Link>
        </div>
    );
};

export default Unauthorized;
