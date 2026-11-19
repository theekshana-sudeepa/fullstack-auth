import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/useAuth';
import { API_BASE_URL } from '../config/api';

// --- Helper Components (Defined inside Home for simplicity) ---

// Component to display pictures within an album (reused logic)
const AlbumView = ({ albumId }) => {
    const [pictures, setPictures] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPictures = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`${API_BASE_URL}/albums/${albumId}/pictures`);
                setPictures(res.data);
            } catch (error) {
                console.error("Failed to fetch pictures:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPictures();
    }, [albumId]);

    if (loading) {
        return <div className="text-center p-8 text-indigo-600">Loading album pictures...</div>;
    }

    return (
        <div>
            <h4 className="text-xl font-semibold mb-4 border-b pb-2 text-gray-800">Pictures</h4>
            
            {pictures.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {pictures.map(pic => (
                        <div key={pic.id} className="aspect-square rounded-lg overflow-hidden shadow-md group">
                            <img 
                                src={pic.storage_url} 
                                alt={pic.filename} 
                                className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                                // Placeholder for missing images
                                onError={(e) => {
                                    e.target.onerror = null; 
                                    e.target.src = `https://placehold.co/400x400/777777/ffffff?text=Image%20Missing`;
                                }}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 bg-white rounded-lg border border-dashed">
                    <p className="text-lg text-gray-500">No pictures have been uploaded to this album.</p>
                </div>
            )}
        </div>
    );
};


// Main Home Component
const Home = () => {
    const { user, isAuthenticated, isAdmin } = useAuth();
    const [albums, setAlbums] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAlbumId, setSelectedAlbumId] = useState(null);

    useEffect(() => {
        const fetchAlbums = async () => {
            try {
                // Fetch albums list
                const res = await axios.get(`${API_BASE_URL}/albums`);
                setAlbums(res.data);
            } catch (error) {
                console.error("Failed to fetch albums:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAlbums();
    }, []);

    const AlbumCard = ({ album }) => (
        <div 
            onClick={() => setSelectedAlbumId(album.id)}
            className="bg-white rounded-xl shadow-lg hover:shadow-xl transition duration-300 cursor-pointer border border-gray-100 overflow-hidden"
        >
            {/* --- CRITICAL UPDATE: Display Cover Image --- */}
            <div className="w-full h-40 bg-gray-200 flex items-center justify-center overflow-hidden">
                {album.cover_image_url ? (
                    <img 
                        src={album.cover_image_url} 
                        alt={`Cover for ${album.title}`} 
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <span className="text-gray-500 text-sm p-4 text-center">
                        No Cover Image
                    </span>
                )}
            </div>
            
            <div className="p-4">
                <h4 className="text-xl font-semibold text-gray-800 truncate">{album.title}</h4>
                <p className="text-sm text-gray-500 mt-1">
                    {album.photo_count} {album.photo_count === 1 ? 'Photo' : 'Photos'}
                </p>
                <p className="text-xs text-indigo-500 mt-3 font-medium hover:text-indigo-600 transition">
                    View Gallery &rarr;
                </p>
            </div>
        </div>
    );

    if (loading) {
        return <div className="text-center p-8 text-lg text-indigo-600 font-semibold">Loading gallery...</div>;
    }
    
    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-8">
            {/* Welcome Banner */}
            <div className="bg-indigo-50 p-6 rounded-xl shadow-inner mb-8">
                <h2 className="text-4xl font-extrabold text-indigo-800 mb-1">
                    Welcome {isAuthenticated ? user.email : 'Guest'}!
                </h2>
                <p className="text-indigo-600">
                    Explore the latest photo albums below.
                    {isAuthenticated && isAdmin && <span className="text-red-600 ml-2">(Admin Role Active)</span>}
                </p>
            </div>
            
            <div className="flex justify-between items-center border-b pb-4 mb-8">
                <h3 className="text-2xl font-semibold text-gray-800">
                    {selectedAlbumId ? 'Album Content' : 'Available Photo Albums'}
                </h3>
                <button 
                    onClick={() => setSelectedAlbumId(null)}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                    disabled={!selectedAlbumId}
                >
                    &larr; Back to Album List
                </button>
            </div>

            {selectedAlbumId ? (
                // Display single album content
                <AlbumView albumId={selectedAlbumId} />
            ) : (
                // Display album list grid
                albums.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {albums.map(album => (
                            <AlbumCard key={album.id} album={album} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-white rounded-lg border border-dashed">
                        <p className="text-lg text-gray-500">No albums have been published yet.</p>
                        {isAdmin && <p className="mt-2 text-red-500">Go to Admin panel to start creating albums!</p>}
                    </div>
                )
            )}
        </div>
    );
};

export default Home;