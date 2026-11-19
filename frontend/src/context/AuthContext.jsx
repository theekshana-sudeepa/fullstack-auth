import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { AuthContext } from './useAuth';

const AUTH_API_URL = `${API_BASE_URL}/auth`;

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedUserString = localStorage.getItem('user');

        if (token && storedUserString) {
            try {
                const storedUser = JSON.parse(storedUserString);

                if (storedUser && storedUser.id) {
                    setUser(storedUser);
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                } else {
                    throw new Error('Invalid stored user data.');
                }
            } catch (error) {
                console.error('Error parsing stored user data:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setUser(null);
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const res = await axios.post(`${AUTH_API_URL}/login`, { email, password });
            const { token, user: userData } = res.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));

            setUser(userData);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            return true;
        } catch (error) {
            console.error('Login failed:', error.response?.data?.message || 'Network Error');
            throw error.response?.data?.message || 'Login failed.';
        }
    };

    const signup = async (email, password) => {
        try {
            const res = await axios.post(`${AUTH_API_URL}/signup`, { email, password });
            const { token, user: userData } = res.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            return true;
        } catch (error) {
            console.error('Signup failed:', error.response?.data?.message || 'Network Error');
            throw error.response?.data?.message || 'Signup failed.';
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
    };

    const value = {
        user,
        isLoading,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
        isAdmin: user ? !!user.is_admin : false,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
