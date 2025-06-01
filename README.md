# Image Ranking Application

This application provides a **web-based interface** for uploading, viewing, and ranking images. Users can rate images on a **1–5 star (tier) scale**, skip images, undo actions, and reset their rankings. You can also optionally delete images from the server folder entirely.

## Features

- **Upload Multiple Images**: Supports common image file types (JPEG, PNG, BMP, TIFF, WebP).  
- **Star/Tier Rating**: Rank each image from **1 to 5** stars (or tiers).  
- **Skipping & Undo**: Move through images quickly, skip if unsure, and undo if you make a mistake.  
- **Soft/Hard Reset**: Choose to reset the local ranking data only (soft reset), or delete all images on the server (hard reset).  
- **Export**: Download your rankings as a JSON file for further analysis or integration.

## Installation

1. **Clone the Repository**  
   ```bash
   git clone https://github.com/YourUsername/your-repo-name.git
   ```
2. **Install Dependencies**  
   Navigate to the project folder and install the required Node.js dependencies (Express, Multer, etc.):
   ```bash
   cd your-repo-name
   npm install
   ```
3. **Folder Structure**  
   - **server.js**: Node.js server that handles file uploads and serves the `/images` folder statically.  
   - **public/**: Contains `index.html`, `style.css`, `script.js`, and possibly other client-side assets.  
   - **images/**: Where uploaded images are stored. The server automatically creates this folder if it doesn’t exist.  

4. **Start the Server**  
   ```bash
   node server.js
   ```
   By default, it runs on **http://localhost:3000** (adjustable in the code).

## Usage

1. **Open the App**  
   In your browser, go to:
   ```
   http://localhost:3000
   ```

2. **Uploading Images**  
   - Click the **Upload Images** button.  
   - Select one or more image files.  
   - Once uploaded, they will appear in the app, ready for ranking.

3. **Ranking Images**  
   - Each image can be assigned a rating from **1–5** stars.  
   - The current (center) image is displayed prominently.  
   - Use the keyboard **1–5** keys, or click/drag (if implemented), to assign a rating.  
   - **Skip**: If you’re unsure, click “Skip” (or press the right arrow key) to move on without assigning a rating.  
   - **Undo**: Click “Undo” (or press the left arrow key) to reverse the most recent rating or skip.

4. **Reset**  
   - Click **Reset** to open a modal.  
   - **Soft Reset**: Clears local ranking data but retains images on the server.  
   - **Hard Reset**: Deletes all images from the server’s `/images` folder, removing everything.  

5. **Export**  
   - Click **Export JSON** to download a file containing your current ranking map (which images are in each tier).  

6. **Skipping & Undo**  
   - **Skip**: Moves to the next image without assigning a rating.  
   - **Undo**: Reverts your most recent action (rating or skip).  

## Configuration

- **Port**: Currently defaults to `PORT = 3000` in `server.js`. You can change it by editing the code or using environment variables.  
- **File Size Limit**: Multer is configured to accept up to 50MB per file. Adjust in `server.js` if needed.

## Potential Issues & Troubleshooting

- **Broken Image Icon**: If you see a broken image, make sure the server response returns the **actual stored filename** (often timestamped) rather than the original file name.  
- **Resets Don’t Show New Images**: Ensure your code **re-fetches** the list of images from the server (`GET /api/list-images`) after a reset or after an upload.  
- **Skipped Images**: By default, the app records skip actions in a history array for undo capabilities. Confirm you’re pushing skip actions to `history`.

## License

You can choose your preferred open-source license or keep it private. For example:

```
MIT License
Copyright (c) 2023 ...
Permission is hereby granted, free of charge, to any person obtaining a copy...
```

See [LICENSE](LICENSE) for details.

## Contributing

1. **Fork** this repository.  
2. **Create** a new branch for your feature or bug fix.  
3. **Submit** a pull request describing your changes.

---

### Thanks for Using the Image Ranking App!

Feel free to submit issues or feature requests via the [GitHub Issue Tracker](https://github.com/YourUsername/your-repo-name/issues). Enjoy streamlining your image ranking workflow!
