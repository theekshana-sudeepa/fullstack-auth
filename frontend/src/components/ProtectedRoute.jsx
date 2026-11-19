// frontend/src/components/ProtectedRoute.jsx

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <div>Loading...</div>; // Show a loading indicator while checking auth status
    }

    if (!isAuthenticated) {
        // Redirect them to the /login page, but save the current location they were trying to go
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;