import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { API_BASE_URL } from '../config/api';

const AlbumDetail = () => {
    const { albumId } = useParams(); // Get ID from URL
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    
    const [album, setAlbum] = useState(null);
    const [pictures, setPictures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [newFiles, setNewFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);

    const token = localStorage.getItem('token');
    
    // --- Data Fetching ---
    const fetchAlbumData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch Album details
            const albumRes = await axios.get(`${API_BASE_URL}/albums/${albumId}`);
            setAlbum(albumRes.data);

            // Fetch Pictures
            const picsRes = await axios.get(`${API_BASE_URL}/albums/${albumId}/pictures`);
            setPictures(picsRes.data);
            
            setError('');
        } catch (err) {
            setError('Failed to load album data.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [albumId]);

    useEffect(() => {
        if (albumId) {
            fetchAlbumData();
        }
    }, [albumId, fetchAlbumData]);


    // --- Actions ---

    const handleDeleteAlbum = async () => {
        if (!window.confirm(`Are you sure you want to permanently delete the album "${album.title}" and ALL its photos?`)) {
            return;
        }

        try {
            await axios.delete(`${API_BASE_URL}/albums/${albumId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            alert('Album deleted successfully! All photos removed from Supabase.');
            navigate('/admin'); // Redirect back to admin dashboard
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete album.');
            console.error(err);
        }
    };

    const handleDeletePicture = async (pictureId) => {
        if (!window.confirm("Are you sure you want to delete this photo?")) {
            return;
        }

        try {
            await axios.delete(`${API_BASE_URL}/albums/pictures/${pictureId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            alert('Photo deleted successfully.');
            // Remove picture from local state
            setPictures(pictures.filter(p => p.id !== pictureId));
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete picture.');
            console.error(err);
        }
    };

    const handleAddPhotos = async () => {
        if (newFiles.length === 0) {
            setError('Please select files to upload.');
            return;
        }

        setIsUploading(true);
        setError('');
        
        const formData = new FormData();
        newFiles.forEach(file => {
            formData.append('pictures', file); // 'pictures' must match the Multer field name
        });

        try {
            const res = await axios.post(`${API_BASE_URL}/albums/${albumId}/pictures`, 
                formData,
                {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
                    },
                    onUploadProgress: (progressEvent) => {
                         console.log(`Uploading... ${Math.round((progressEvent.loaded * 100) / progressEvent.total)}%`);
                    }
                }
            );
            
            alert(`Successfully added ${res.data.pictures.length} photos.`);
            setNewFiles([]); // Clear file input
            fetchAlbumData(); // Refresh the list
            
        } catch (err) {
             setError(err.response?.data?.message || 'Photo upload failed.');
             console.error(err);
        } finally {
            setIsUploading(false);
        }
    };


    if (!isAdmin) {
        return <div className="max-w-7xl mx-auto p-8 text-center text-red-600">You must be logged in as an Admin to view this page.</div>;
    }

    if (loading) {
        return <div className="max-w-7xl mx-auto p-8 text-center">Loading album details...</div>;
    }

    if (!album) {
        return <div className="max-w-7xl mx-auto p-8 text-center text-red-600">Error: {error || 'Album not found.'}</div>;
    }
    
    return (
        <div className="max-w-7xl mx-auto p-4">
            <button onClick={() => navigate('/admin')} className="text-indigo-600 hover:underline mb-4">&larr; Back to Admin Dashboard</button>

            <div className="bg-white shadow-xl rounded-xl p-6 mb-8 border-t-4 border-indigo-600">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{album.title}</h1>
                <p className="text-gray-600 mb-4">{album.description}</p>
                <p className="text-sm text-gray-400">Album ID: {album.id} | Created: {new Date(album.created_at).toLocaleDateString()}</p>

                <div className="mt-6 flex space-x-4">
                    <button 
                        onClick={handleDeleteAlbum} 
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                        Delete Album (Deletes ALL Photos)
                    </button>
                    {/* Add an Update Album Title/Description Modal/Form here if needed */}
                </div>
            </div>

            {/* --- Add Photos Section --- */}
            <div className="bg-gray-100 p-6 rounded-xl mb-8">
                 <h2 className="text-xl font-semibold mb-4 text-gray-800">Add More Photos</h2>
                 <input 
                    type="file" 
                    multiple 
                    onChange={(e) => setNewFiles(Array.from(e.target.files))} 
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    disabled={isUploading}
                />
                <button 
                    onClick={handleAddPhotos} 
                    disabled={newFiles.length === 0 || isUploading}
                    className="mt-3 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                    {isUploading ? 'Uploading...' : `Upload ${newFiles.length} Photos`}
                </button>
            </div>

            {/* --- Photo Grid --- */}
            <h2 className="text-2xl font-semibold mb-4">Photos ({pictures.length})</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {pictures.map(pic => (
                    <div key={pic.id} className="relative aspect-square rounded-lg overflow-hidden shadow-lg group">
                        <img 
                            src={pic.storage_url} 
                            alt={pic.filename} 
                            className="w-full h-full object-cover"
                            // Temporary placeholder for missing images
                            onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/400x400/888888/ffffff?text=Image%20Missing`; }}
                        />
                        <button
                            onClick={() => handleDeletePicture(pic.id)}
                            className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition duration-200"
                            title="Delete Photo"
                        >
                            {/* Simple X icon */}
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>
            {pictures.length === 0 && <p className="text-center py-10 text-gray-500">No photos in this album yet.</p>}
        </div>
    );
};

export default AlbumDetail;