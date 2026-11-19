import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { API_BASE_URL } from '../config/api';

const AdminUpload = () => {
    const navigate = useNavigate();
    const { isAuthenticated, isAdmin } = useAuth();

    const [title, setTitle] = useState('');
    const [coverFile, setCoverFile] = useState(null); // CRITICAL: New state for cover file
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [albums, setAlbums] = useState([]);

    const token = localStorage.getItem('token');

    // --- Fetch Albums for Display ---
    const fetchAlbums = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/albums`);
            setAlbums(res.data);
        } catch (err) {
            setError('Failed to fetch albums list.');
            console.error(err);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            fetchAlbums();
        }
    }, [isAdmin]);
    
    // --- Create Album Logic (Handles Multipart Form Data) ---
    const createAlbum = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', 'Gallery album for user view.');
        
        // CRITICAL: Append the file using the name 'coverImage' as expected by Express
        if (coverFile) {
            formData.append('coverImage', coverFile); 
        }

        try {
            const res = await axios.post(`${API_BASE_URL}/albums`, 
                formData, // Send as FormData
                { 
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        // axios automatically sets 'Content-Type': 'multipart/form-data'
                    } 
                }
            );
            setMessage(`Album "${res.data.title}" created successfully!`);
            setTitle('');
            setCoverFile(null); // Clear file input
            fetchAlbums(); // Refresh list
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create album.');
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated || !isAdmin) {
        return <div className="max-w-3xl mx-auto p-10 text-red-500 text-center">Access Denied. Must be an Admin.</div>;
    }

    return (
        <div className="max-w-6xl mx-auto my-10 p-8 bg-white shadow-2xl rounded-2xl">
            <h2 className="text-3xl font-bold text-red-700 mb-6 border-b pb-3">Admin Dashboard</h2>
            
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4">{error}</div>}
            {message && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mb-4">{message}</div>}

            {/* --- 1. Create Album Form (Updated) --- */}
            <div className="border p-6 rounded-lg bg-gray-50 mb-8">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">1. Create New Album</h3>
                <form onSubmit={createAlbum}>
                    <input
                        type="text"
                        placeholder="Album Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="w-full px-3 py-2 border rounded-lg mb-3"
                        disabled={loading}
                    />
                    
                    <label className="block text-sm font-medium text-gray-700 mb-1">Album Cover Image (Optional)</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setCoverFile(e.target.files[0])} // Store the single file
                        className="w-full text-sm text-gray-500 file:py-1 file:px-3 file:rounded-full file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        disabled={loading}
                    />
                    
                    <button 
                        type="submit"
                        disabled={loading || title.length < 3}
                        className="mt-4 w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-150 disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : 'Create Album'}
                    </button>
                </form>
            </div>
            
            {/* --- 2. Existing Albums List --- */}
            <h3 className="text-2xl font-semibold mb-4 text-gray-800 border-b pb-2">2. Manage Existing Albums ({albums.length})</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {albums.length > 0 ? (
                    albums.map(album => (
                        <div key={album.id} className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col justify-between">
                            {/* CRITICAL UPDATE: Display Cover Image */}
                            {album.cover_image_url ? (
                                <img 
                                    src={album.cover_image_url} 
                                    alt={`Cover for ${album.title}`} 
                                    className="w-full h-24 object-cover rounded-lg mb-3"
                                />
                            ) : (
                                <div className="w-full h-24 flex items-center justify-center bg-gray-100 rounded-lg mb-3 text-gray-400 text-sm">
                                    No Cover
                                </div>
                            )}

                            <div>
                                <h4 className="font-bold text-lg truncate">{album.title}</h4>
                                <p className="text-sm text-gray-500 mt-1">Photos: {album.photo_count || 0}</p>
                            </div>
                            <button 
                                onClick={() => navigate(`/admin/albums/${album.id}`)}
                                className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-150"
                            >
                                View / Add Photos
                            </button>
                        </div>
                    ))
                ) : (
                    <p className="col-span-3 text-center py-5 text-gray-500">No albums created yet.</p>
                )}
            </div>
            
        </div>
    );
};

export default AdminUpload;