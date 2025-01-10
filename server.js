const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Serve the `public` directory statically
app.use(express.static(path.join(__dirname, 'public')));

// Configure the images directory
const IMAGES_DIR = path.join(__dirname, 'images');

// Ensure the images folder exists
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR);
}

// Multer config for large uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, IMAGES_DIR);
    },
    filename: (req, file, cb) => {
        // Unique filenames: timestamp-originalName
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/bmp', 'image/tiff', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images are allowed.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB per file
    },
}).any(); // Accept unlimited files

// Serve uploaded images statically
app.use('/images', express.static(IMAGES_DIR));

/**
 * POST /api/upload
 * Handle image uploads (multer)
 */
app.post('/api/upload', (req, res) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // Multer-specific errors
            return res.status(400).json({ error: err.message });
        } else if (err) {
            // Other errors
            return res.status(400).json({ error: err.message });
        }

        // Successfully uploaded files
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        console.log(`${req.files.length} files uploaded.`);
        return res.status(200).json({
            message: 'Images uploaded successfully',
            // Return original names or final file paths
            files: req.files.map((file) => file.filename),
        });
    });
});

/**
 * GET /api/list-images
 * Returns an array of image paths in the /images folder
 */
app.get('/api/list-images', (req, res) => {
    fs.readdir(IMAGES_DIR, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Unable to read images directory' });
        }
        // Filter to image file extensions only
        const images = files.filter(file =>
            /\.(jpg|jpeg|png|bmp|tiff|webp)$/i.test(file)
        );
        // Map filenames to their accessible URLs
        res.json(images.map(file => `/images/${file}`));
    });
});

/**
 * DELETE /api/delete-all-images
 * Removes every file in the /images directory (for "hard reset")
 */
app.delete('/api/delete-all-images', async (req, res) => {
    try {
        const files = await fs.promises.readdir(IMAGES_DIR);

        // Delete each file
        await Promise.all(
            files.map(file => {
                const filePath = path.join(IMAGES_DIR, file);
                return fs.promises.unlink(filePath);
            })
        );

        res.status(200).json({ message: 'All images deleted successfully' });
    } catch (err) {
        console.error('Error deleting images:', err);
        res.status(500).json({ error: 'Unable to delete images' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
