import React from 'react';
import { Routes, Route, Link, BrowserRouter } from 'react-router-dom';

import Home from './components/Home';
import Login from './components/Login';
import Signup from './components/Signup';
import ProtectedRoute from './components/ProtectedRoute';
import AdminUpload from './components/AdminUpload';
import AlbumDetail from './components/AlbumDetail';

import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';

const AppNavbar = () => {
    const { isAuthenticated, isAdmin, logout } = useAuth();

    return (
        <nav className="p-4 bg-white shadow-md flex justify-between items-center">
            <Link to="/" className="text-xl font-bold text-indigo-600 hover:text-indigo-800 transition duration-150">
                PhotoGallery
            </Link>
            
            <div className="flex space-x-4 items-center">
                {isAuthenticated && isAdmin && (
                    <Link 
                        to="/admin" 
                        className="px-3 py-1 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition duration-150"
                    >
                        Admin Panel
                    </Link>
                )}
                
                {isAuthenticated ? (
                    <button 
                        onClick={logout} 
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition duration-150"
                    >
                        Logout
                    </button>
                ) : (
                    <>
                        <Link to="/login" className="text-gray-600 hover:text-indigo-600">Log In</Link>
                        <Link to="/signup" className="text-white bg-indigo-500 px-3 py-1 rounded-lg shadow hover:bg-indigo-600 transition duration-150">Sign Up</Link>
                    </>
                )}
            </div>
        </nav>
    );
};


function AppContent() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppNavbar />
      <div className="p-4 max-w-7xl mx-auto">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Protected Admin Routes */}
          <Route 
              path="/admin" 
              element={
                  <ProtectedRoute>
                      <AdminUpload />
                  </ProtectedRoute>
              } 
          />
          <Route 
              path="/admin/albums/:albumId" 
              element={
                  <ProtectedRoute>
                      <AlbumDetail />
                  </ProtectedRoute>
              } 
          />

          {/* Fallback Dashboard Route */}
          <Route 
              path="/dashboard" 
              element={
                  <ProtectedRoute>
                      <h1 className="text-2xl font-semibold">Dashboard (Placeholder)</h1>
                  </ProtectedRoute>
              } 
          />
        </Routes>
      </div>
    </div>
  );
}

// FIX 2: Re-add BrowserRouter to the final export wrapper.
const App = () => (
    <BrowserRouter>
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    </BrowserRouter>
);

export default App;
