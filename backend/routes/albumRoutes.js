// backend/routes/albumRoutes.js

const express = require('express');
const multer = require('multer'); 
const { v4: uuidv4 } = require('uuid'); 
const { supabase } = require('../config/supabase'); 
const sharp = require('sharp');

// Setup Multer to store files in memory (buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 }});
const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'album-images';

module.exports = (pool) => {
    const router = express.Router();
    
    // Load the middleware factory and instantiate the functions with the pool
    const authMiddleware = require('../middleware/authMiddleware')(pool);
    const protect = authMiddleware.protect;
    const admin = authMiddleware.admin;

    // --- Public Route: GET ALL ALBUMS ---
    router.get('/', async (req, res) => {
        try {
            // Fetch albums along with a count of pictures for the dashboard/home view
            const result = await pool.query(`
                SELECT 
                    a.*, 
                    COALESCE(count(p.id), 0) AS photo_count 
                FROM albums a
                LEFT JOIN pictures p ON a.id = p.album_id
                GROUP BY a.id
                ORDER BY a.created_at DESC
            `);
            res.json(result.rows);
        } catch (err) {
            console.error('Error fetching albums:', err);
            res.status(500).json({ message: 'Error fetching albums' });
        }
    });
    
    // --- Admin Route: GET SINGLE ALBUM (Protected read for admin detail page) ---
    router.get('/:albumId', protect, admin, async (req, res) => {
        const { albumId } = req.params;
        try {
            const result = await pool.query('SELECT * FROM albums WHERE id = $1', [albumId]);
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Album not found.' });
            }
            res.json(result.rows[0]);
        } catch (err) {
            console.error('Error fetching single album:', err);
            res.status(500).json({ message: 'Error fetching album' });
        }
    });


    // --- Public Route: GET PICTURES FOR A SPECIFIC ALBUM ---
    router.get('/:albumId/pictures', async (req, res) => {
        const albumId = req.params.albumId;
        try {
            const result = await pool.query(
                'SELECT * FROM pictures WHERE album_id = $1 ORDER BY uploaded_at ASC',
                [albumId]
            );
            res.json(result.rows);
        } catch (err) {
            console.error('Error fetching pictures:', err);
            res.status(500).json({ message: 'Error fetching album pictures' });
        }
    });

    // --- Admin Route: CREATE NEW ALBUM ---
    router.post('/', protect, admin, upload.single('coverImage'), async (req, res) => {
        const { title, description } = req.body;
        const userId = req.user.id;
        const file = req.file; // This is the uploaded file buffer
        
        if (!title) {
            return res.status(400).json({ message: 'Album title is required.' });
        }

        let coverImageUrl = null;

        try {
            // 1. UPLOAD COVER IMAGE to Supabase if file exists
            if (file) {
                // --- CONVERSION STEP: Convert to WebP using Sharp ---
                const webpBuffer = await sharp(file.buffer)
                    .webp({ quality: 80 }) 
                    .toBuffer();

                // Generate new unique file path with .webp extension
                const filePath = `covers/${uuidv4()}.webp`; 
                
                // Upload the converted WebP buffer
                const { error: uploadError } = await supabase.storage
                    .from(BUCKET_NAME) 
                    .upload(filePath, webpBuffer, { 
                        contentType: 'image/webp', // Set correct MIME type
                        upsert: false 
                    });

                if (uploadError) {
                    console.error("Supabase Cover Upload Error:", uploadError);
                    throw new Error('Cover image upload failed.');
                }
                
                const { data: publicURLData } = supabase
                    .storage
                    .from(BUCKET_NAME)
                    .getPublicUrl(filePath);
                
                coverImageUrl = publicURLData.publicUrl;
            }

            // 2. INSERT Album record with the cover URL
            const result = await pool.query(
                'INSERT INTO albums (title, description, user_id, cover_image_url) VALUES ($1, $2, $3, $4) RETURNING *',
                [title, description, userId, coverImageUrl]
            );
            res.status(201).json(result.rows[0]);

        } catch (err) {
            console.error('Error creating album:', err);
            // If upload failed, ensure no database record is created
            res.status(500).json({ message: err.message || 'Error creating album' });
        }
    });

    // --- Admin Route: UPLOAD PICTURES TO ALBUM (Add photos to existing album) ---
    router.post('/:albumId/pictures', protect, admin, upload.array('pictures', 10), async (req, res) => {
        const albumId = req.params.albumId;
        const files = req.files; 
        
        if (!files || files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded.' });
        }
        
        try {
            const uploadedPictures = [];

            for (const file of files) {
                // 1. Convert Image to WebP using Sharp
                const webpBuffer = await sharp(file.buffer)
                    .webp({ quality: 80 }) // Set quality (80 is a good balance)
                    .toBuffer();

                // 2. Generate new unique file path and name
                // Note: The file extension is now always .webp
                const filePath = `albums/${albumId}/${uuidv4()}.webp`; 
                
                // --- Supabase Upload Operation ---
                const { error: uploadError } = await supabase.storage
                    .from(BUCKET_NAME) 
                    // CRITICAL: Upload the webpBuffer, not the original file.buffer
                    .upload(filePath, webpBuffer, {
                        contentType: 'image/webp', // CRITICAL: Mime type is now image/webp
                        upsert: false, 
                    });

                if (uploadError) {
                    console.error("Supabase Upload Error:", uploadError);
                    throw new Error('Image upload failed to cloud storage.');
                }
                
                // 3. Get the public URL for the file
                const { data: publicURLData } = supabase
                    .storage
                    .from(BUCKET_NAME)
                    .getPublicUrl(filePath);
                
                const storageUrl = publicURLData.publicUrl;

                // 4. PostgreSQL Insertion (Save the original filename but the new URL)
                const result = await pool.query(
                    'INSERT INTO pictures (album_id, filename, storage_url, mime_type) VALUES ($1, $2, $3, $4) RETURNING *',
                    [albumId, file.originalname, storageUrl, 'image/webp'] // CRITICAL: Save mime_type as webp
                );
                uploadedPictures.push(result.rows[0]);
            }

            res.status(201).json({ message: 'Pictures uploaded successfully', pictures: uploadedPictures });
            
        } catch (err) {
            console.error('Error processing upload:', err);
            res.status(500).json({ message: err.message || 'Error processing picture upload' });
        }
    });

    // --- Admin Route: DELETE PICTURE ---
    router.delete('/pictures/:pictureId', protect, admin, async (req, res) => {
        const { pictureId } = req.params;

        try {
            // 1. Get the picture details to find the file path
            const picResult = await pool.query('SELECT storage_url FROM pictures WHERE id = $1', [pictureId]);
            if (picResult.rows.length === 0) {
                return res.status(404).json({ message: 'Picture not found.' });
            }

            const storageUrl = picResult.rows[0].storage_url;
            // Extract file path from the full public URL (path starts after the bucket name)
            const filePath = storageUrl.split(`${BUCKET_NAME}/`)[1];
            
            // 2. Delete the record from the database
            await pool.query('DELETE FROM pictures WHERE id = $1', [pictureId]);

            // 3. Delete the file from Supabase Storage
            if (filePath) {
                const { error: deleteError } = await supabase.storage
                    .from(BUCKET_NAME)
                    .remove([filePath]);

                if (deleteError) {
                    console.warn('Supabase cleanup warning:', deleteError);
                }
            }

            res.status(200).json({ message: 'Picture and associated file deleted.' });

        } catch (err) {
            console.error('Error deleting picture:', err);
            res.status(500).json({ message: 'Failed to delete picture.' });
        }
    });

    // --- Admin Route: DELETE ALBUM (Cascading Deletion) ---
    router.delete('/:albumId', protect, admin, async (req, res) => {
        const { albumId } = req.params;

        try {
            // 1. Get ALL file paths: bulk photos AND the cover image URL
            const albumResult = await pool.query('SELECT cover_image_url FROM albums WHERE id = $1', [albumId]);
            const coverUrl = albumResult.rows.length > 0 ? albumResult.rows[0].cover_image_url : null;
            
            const picsResult = await pool.query('SELECT storage_url FROM pictures WHERE album_id = $1', [albumId]);
            
            // Collect all URLs (bulk photos + cover)
            let allStorageUrls = picsResult.rows.map(row => row.storage_url);
            if (coverUrl) {
                allStorageUrls.push(coverUrl);
            }

            // 2. Map URLs to Supabase file paths (path starts after the bucket name)
            const filePaths = allStorageUrls
                .map(url => url.split(`${BUCKET_NAME}/`)[1])
                .filter(Boolean); // Filter out any null/undefined paths

            // 3. Delete the Album (PostgreSQL CASCADE handles pictures table cleanup)
            await pool.query('DELETE FROM albums WHERE id = $1', [albumId]);

            // 4. Delete files from Supabase Storage
            if (filePaths.length > 0) {
                const { error: deleteError } = await supabase.storage
                    .from(BUCKET_NAME)
                    .remove(filePaths);

                if (deleteError) {
                    console.warn('Supabase cleanup warning during album deletion:', deleteError);
                }
            }

            res.status(200).json({ message: 'Album and all contents deleted successfully.' });

        } catch (err) {
            console.error('Error deleting album:', err);
            res.status(500).json({ message: 'Failed to delete album.' });
        }
    });

    return router;
};
