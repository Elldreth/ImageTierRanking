// -----------------------------
// Global State
// -----------------------------
let images = []; 
let currentImageIndex = 0;
let history = [];
let ratingMap = { 1: [], 2: [], 3: [], 4: [], 5: [] };

// -----------------------------
// On Page Load
// -----------------------------
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Optionally load local storage (if you want continuity):
  loadStateFromLocalStorage(); 
  // e.g. images, currentImageIndex, ratingMap, etc. might have values.

  // 2. Always fetch the up-to-date list from the server:
  try {
    const resp = await fetch('/api/list-images');
    if (resp.ok) {
      const serverImages = await resp.json();  // e.g. ["/images/file1.jpg", "/images/file2.jpg"]
      // Merge or overwrite. For simplicity, let's overwrite if we have no local images.
      if (images.length === 0) {
        images = serverImages;
      } else {
        // If you want to combine local + server, handle duplicates here.
        // images = [...new Set([...images, ...serverImages])];
      }
    } else {
      console.warn('Could not fetch images from server.');
    }
  } catch (err) {
    console.error('Error fetching images:', err);
  }

  // 3. Display the center image or a "no images" message
  loadImage();

  // 4. Setup your button event listeners
  setupEventListeners();
});

// Example: Factor out your event listeners for clarity
function setupEventListeners() {
  document.getElementById("undo-btn").addEventListener("click", undoLastAction);
  document.getElementById("skip-btn").addEventListener("click", skipImage);
  document.getElementById("export-btn").addEventListener("click", exportRankings);
  document.getElementById("upload-btn").addEventListener("click", () => {
    document.getElementById("image-upload").click();
  });
  document.getElementById("image-upload").addEventListener("change", uploadImages);

  // Show the modal on reset
  document.getElementById("reset-btn").addEventListener("click", () => {
    document.getElementById("reset-modal").style.display = "flex";
  });

  // Modal Confirm / Cancel
  document.getElementById("confirm-reset-btn").addEventListener("click", async () => {
    const deleteImagesChecked = document.getElementById("delete-images-checkbox").checked;
    await resetTierBoard(deleteImagesChecked);
    document.getElementById("reset-modal").style.display = "none";
  });
  document.getElementById("cancel-reset-btn").addEventListener("click", () => {
    document.getElementById("reset-modal").style.display = "none";
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", handleKeyPress);
}

function loadImage() {
    const centerImg = document.getElementById("center-image");
    const noImagesMsg = document.getElementById("no-images-message"); 
    // For example, a <div> in your HTML that says 
    // "No images remaining. Please upload more to continue."
  
    // Filter out images that are already rated
    const remaining = images.filter(img => !isImageRated(img));
  
    // If there are zero images total (either the folder is empty or all are rated)
    if (remaining.length === 0) {
      centerImg.style.display = "none";
      noImagesMsg.style.display = "block";  
      noImagesMsg.textContent = "No images remain to be ranked. Please upload more to continue.";
      return; 
    }
  
    // If we've gone past the last unranked image
    if (currentImageIndex >= remaining.length) {
      centerImg.style.display = "none";
      noImagesMsg.style.display = "block";
      noImagesMsg.textContent = "All images have been ranked or no images remain.";
      return;
    }
  
    // Otherwise, display the current unranked image
    noImagesMsg.style.display = "none"; // Hide the message if we do have an image
    centerImg.src = remaining[currentImageIndex];
    centerImg.style.display = "block";
  }

// ----------------------
// Check if Image is Rated
// ----------------------
function isImageRated(imgSrc) {
  // Return true if this image is found in any of the ratingMap arrays
  for (let i = 1; i <= 5; i++) {
    if (ratingMap[i].includes(imgSrc)) {
      return true;
    }
  }
  return false;
}

// ----------------------
// Keyboard Handling
// ----------------------
function handleKeyPress(event) {
  // If user presses 1, 2, 3, 4, or 5, rate the image
  const key = event.key;
  if (["1", "2", "3", "4", "5"].includes(key)) {
    assignRating(parseInt(key, 10));
  } else if (event.key === "ArrowLeft") {
    // Undo
    undoLastAction();
    console.log('left arrow pressed');
  } else if (event.key === "ArrowRight") {
    // Skip
    skipImage();
  }
}

// ----------------------
// Assign Rating Function
// ----------------------
function assignRating(rating) {
  const centerImg = document.getElementById("center-image");
  if (!centerImg.src) return;

  let imgSrc = centerImg.src;

  // If the image is already rated, maybe do nothing or allow re-rating
  // For now, let's allow re-rating (remove from old rating first)
  removeImageFromAllRatings(imgSrc);

  // Push this image into the chosen rating
  ratingMap[rating].push(imgSrc);
  console.log(`Assigned ${imgSrc} to rating ${rating}`);

  // Record in history for undo
  history.push({ imgSrc, rating });

  // Update the rating preview
  updateRatingPreview(rating);

  // Move to the next image
  currentImageIndex++;
  loadImage();

  // Save state
  saveStateToLocalStorage();
}

// ----------------------
// Update the Rating Preview
// (shows last image in each rating tier)
// ----------------------
function updateRatingPreview(rating) {
  const ratingContainer = document.getElementById(`rating-${rating}`);
  if (!ratingContainer) return;

  // Remove any existing image child
  while (ratingContainer.firstChild) {
    ratingContainer.removeChild(ratingContainer.firstChild);
  }

  // Add text label again or star label
  const labelSpan = document.createElement("span");
  labelSpan.textContent = `${rating} ★`;
  ratingContainer.appendChild(labelSpan);

  // Get the last image in ratingMap[rating]
  const ratedImages = ratingMap[rating];
  if (ratedImages.length > 0) {
    const lastImgSrc = ratedImages[ratedImages.length - 1];
    const imgEl = document.createElement("img");
    imgEl.src = lastImgSrc;
    ratingContainer.appendChild(imgEl);
  }
}

// ----------------------
// Remove an Image from All Ratings
// ----------------------
function removeImageFromAllRatings(imgSrc) {
  for (let i = 1; i <= 5; i++) {
    let arr = ratingMap[i];
    const index = arr.indexOf(imgSrc);
    if (index !== -1) {
      arr.splice(index, 1);
    }
  }
}

// ----------------------
// Undo the Last Rating
// ----------------------
function undoLastAction() {
  if (history.length === 0) {
    console.log("No actions to undo");
    return;
  }
  const lastAction = history.pop();

  if (lastAction.type === 'assign') {
    // e.g., { type: 'assign', image: imgSrc, rating: rating }
    removeImageFromAllRatings(lastAction.image);
    updateRatingPreview(lastAction.rating);
    if (currentImageIndex > 0) {
      currentImageIndex--;
    }
    loadImage();
    saveStateToLocalStorage();

  } else if (lastAction.type === 'skip') {
    // e.g., { type: 'skip', index: 2, image: "/images/cat.jpg" }
    // Just move currentImageIndex back to where it was
    currentImageIndex = lastAction.index;
    loadImage();
    saveStateToLocalStorage();

  } else {
    console.log("Unknown action type:", lastAction.type);
  }
}

// ----------------------
// Skip the Current Image
// ----------------------
function skipImage() {
  const centerImg = document.getElementById("center-image");
  // This is the image being skipped
  const skippedSrc = centerImg.src;

  // Record the skip in history
  history.push({
    type: 'skip',
    index: currentImageIndex,
    image: skippedSrc
  });

  // Move to the next image
  currentImageIndex++;
  loadImage();
  saveStateToLocalStorage();
}

// ----------------------
// Export Rankings as JSON
// ----------------------
function exportRankings() {
  // ratingMap is already an object keyed by rating
  // E.g. {1: ["imageA.jpg"], 2: ["imageB.jpg"], ...}
  const dataStr = JSON.stringify(ratingMap, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'ratingMap.json';
  a.click();
  URL.revokeObjectURL(url);
}

function loadStateFromLocalStorage() {
    const savedImages = localStorage.getItem('images');
    if (savedImages) {
      images = JSON.parse(savedImages);
    }
    const savedIndex = localStorage.getItem('currentImageIndex');
    if (savedIndex) {
      currentImageIndex = parseInt(savedIndex, 10);
    }
    const savedRatingMap = localStorage.getItem('ratingMap');
    if (savedRatingMap) {
      ratingMap = JSON.parse(savedRatingMap);
    }
    const savedHistory = localStorage.getItem('history');
    if (savedHistory) {
      history = JSON.parse(savedHistory);
    }
  }
  
  function saveStateToLocalStorage() {
    localStorage.setItem('images', JSON.stringify(images));
    localStorage.setItem('currentImageIndex', currentImageIndex);
    localStorage.setItem('ratingMap', JSON.stringify(ratingMap));
    localStorage.setItem('history', JSON.stringify(history));
  }

function uploadImages(event) {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }
    const formData = new FormData();
    for (const file of files) {
      formData.append('images', file);
    }
    fetch('/api/upload', {
      method: 'POST',
      body: formData
    })
      .then(response => {
        if (!response.ok) throw new Error('Upload failed');
        return response.json();
      })
      .then(data => {
        // Server returns { files: ["somefile.jpg", ...], etc. }
        console.log('Server returned uploaded files:', data.files);
  
        // Convert them to /images/somefile.jpg or similar
        const newPaths = data.files.map(f => "/images/" + f);
        images.push(...newPaths);
  
        saveStateToLocalStorage();
  
        const centerImg = document.getElementById("center-image");
        if (centerImg.style.display === "none") {
          currentImageIndex = 0;
          loadImage();
        }
      })
      .catch(err => console.error('Error uploading images:', err));
  }
  
  // ----------------------
  // resetTierBoard
  // ----------------------
  async function resetTierBoard(shouldDelete) {
    images = [];
    currentImageIndex = 0;
    history = [];
    ratingMap = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  
    localStorage.removeItem('images');
    localStorage.removeItem('currentImageIndex');
    localStorage.removeItem('ratingMap');
    localStorage.removeItem('history');
  
    // Hard reset?
    if (shouldDelete) {
      try {
        const resp = await fetch('/api/delete-all-images', { method: 'DELETE' });
        if (!resp.ok) {
          console.error("Failed to delete images on server.");
        } else {
          console.log("Server images deleted successfully.");
        }
      } catch (err) {
        console.error("Error deleting images on server:", err);
      }
    }
  
    // Soft reset => re-fetch from /api/list-images
    try {
      const resp = await fetch('/api/list-images');
      if (resp.ok) {
        const data = await resp.json();
        // data might be ["/images/foo.jpg", "/images/bar.png"]
        images = data;
        console.log("Fetched images after reset:", images);
      } else {
        console.warn("Could not fetch images after reset.");
      }
    } catch (err) {
      console.error("Error fetching images after reset:", err);
    }
  
    // Update rating previews
    for (let i = 1; i <= 5; i++) {
      updateRatingPreview(i);
    }
  
    // Show the first image if available
    loadImage();
    saveStateToLocalStorage();
  }
  

  