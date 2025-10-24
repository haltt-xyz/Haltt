import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../firebase';

const PrivateRoute = ({ children }) => {
    const { user, loading } = useAuth();
  
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen text-lg font-medium text-gray-600">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Checking Authentication...
        </div>
      ); 
    }
  
    // If user is logged in, show children; otherwise, redirect to sign-in page (/)
    return user ? children : <Navigate to="/" />;
};

export default PrivateRoute;
  