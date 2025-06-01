// -----------------------------
// Global State
// -----------------------------
let images = []; 
let currentImageIndex = 0;
let history = [];
let ratingMap = { 1: [], 2: [], 3: [], 4: [], 5: [] };

// Additional variables for the tier modal
let currentTierViewing = 0;       // which tier is being viewed in the modal
let tierImages = [];             // array of images in that tier
let currentTierImageIndex = 0;   // index of the currently displayed image in tierImages

// Dataset identifier provided by the server so local storage can remain
// separated for different image sets.
let datasetId = 'default';
let LS_PREFIX = `dataset_${datasetId}_`;

// -----------------------------
// On Page Load
// -----------------------------
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const dsResp = await fetch("/api/dataset");
    if (dsResp.ok) {
      const data = await dsResp.json();
      datasetId = data.dataset || "default";
    }
  } catch (err) {
    console.error("Error fetching dataset information:", err);
  }
  LS_PREFIX = `dataset_${datasetId}_`;
  loadStateFromLocalStorage();

  try {
    const resp = await fetch('/api/list-images');
    if (resp.ok) {
      const serverImages = await resp.json();  // e.g. ["/images/file1.jpg", "/images/file2.jpg"]
      // Merge or overwrite. For simplicity, let's overwrite if we have no local images.
      if (images.length === 0) {
        images = serverImages;
      } 
      // else if you prefer merging: images = [...new Set([...images, ...serverImages])];
    } else {
      console.warn('Could not fetch images from server.');
    }
  } catch (err) {
    console.error('Error fetching images:', err);
  }

  loadImage();
  setupEventListeners();
});

// Factor out your event listeners for clarity
function setupEventListeners() {
  document.getElementById("undo-btn").addEventListener("click", undoLastAction);
  document.getElementById("skip-btn").addEventListener("click", skipImage);
  document.getElementById("export-btn").addEventListener("click", exportRankings);
  document.getElementById("upload-btn").addEventListener("click", () => {
    document.getElementById("image-upload").click();
  });
  
  // Bump rank inside tier modal
  document.getElementById("bump-up-rank").addEventListener("click", () => {
    bumpRank(1); // +1 rank
  });
  document.getElementById("bump-down-rank").addEventListener("click", () => {
    bumpRank(-1); // -1 rank
  });

  // Prev/next in tier modal
  document.getElementById("prev-tier-image").addEventListener("click", () => {
    if (tierImages.length > 0) {
      currentTierImageIndex = (currentTierImageIndex - 1 + tierImages.length) % tierImages.length;
      document.getElementById("tier-modal-image").src = tierImages[currentTierImageIndex];
      document.getElementById("tier-modal-empty").style.display = "none";
      document.getElementById("tier-modal-image").style.display = "block";
    }
  });
  document.getElementById("next-tier-image").addEventListener("click", () => {
    if (tierImages.length > 0) {
      currentTierImageIndex = (currentTierImageIndex + 1) % tierImages.length;
      document.getElementById("tier-modal-image").src = tierImages[currentTierImageIndex];
      document.getElementById("tier-modal-empty").style.display = "none";
      document.getElementById("tier-modal-image").style.display = "block";
    }
  });

  // Close tier modal
  document.getElementById("close-tier-modal").addEventListener("click", () => {
    document.getElementById("tier-modal").style.display = "none";
  });
  
  // Open tier modals
  document.getElementById("rating-1").addEventListener("click", () => openTierModal(1));
  document.getElementById("rating-2").addEventListener("click", () => openTierModal(2));
  document.getElementById("rating-3").addEventListener("click", () => openTierModal(3));
  document.getElementById("rating-4").addEventListener("click", () => openTierModal(4));
  document.getElementById("rating-5").addEventListener("click", () => openTierModal(5));

  // Upload images
  document.getElementById("image-upload").addEventListener("change", uploadImages);

  // Reset modal
  document.getElementById("reset-btn").addEventListener("click", () => {
    document.getElementById("reset-modal").style.display = "flex";
  });
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

  // Clickable star rating
  document.querySelectorAll("#star-rating span").forEach((el) => {
    el.addEventListener("click", () => {
      const rating = parseInt(el.getAttribute("data-rating"), 10);
      assignRating(rating);
    });
  });
}

// ----------------------
// Bump Rank Function
// ----------------------
function bumpRank(delta) {
  const oldTier = currentTierViewing;
  const newTier = oldTier + delta;

  if (newTier < 1 || newTier > 5) {
    alert("Cannot move this image further in that direction.");
    return;
  }

  const imageToMove = tierImages[currentTierImageIndex];

  // Remove from old tier and add to new tier
  const arrOld = ratingMap[oldTier];
  const idxOld = arrOld.indexOf(imageToMove);
  if (idxOld !== -1) {
    arrOld.splice(idxOld, 1);
  }
  ratingMap[newTier].push(imageToMove);

  // Update previews for both tiers
  updateRatingPreview(oldTier);
  updateRatingPreview(newTier);

  // Switch modal context to the new tier so the moved image stays visible
  currentTierViewing = newTier;
  tierImages = ratingMap[newTier];
  currentTierImageIndex = ratingMap[newTier].indexOf(imageToMove);
  document.getElementById("tier-modal-number").textContent = newTier;

  if (tierImages.length === 0) {
    document.getElementById("tier-modal-image").style.display = "none";
    document.getElementById("tier-modal-empty").textContent = `No images in tier ${newTier}`;
    document.getElementById("tier-modal-empty").style.display = "block";
  } else {
    document.getElementById("tier-modal-image").src = tierImages[currentTierImageIndex];
    document.getElementById("tier-modal-empty").style.display = "none";
    document.getElementById("tier-modal-image").style.display = "block";
  }

  saveStateToLocalStorage();
}

// ----------------------
// Open Tier Modal
// ----------------------
function openTierModal(tier) {
  currentTierViewing = tier;
  // Make a copy so modifications inside the modal don't directly mutate
  // the original ratingMap array until we explicitly update it.
  tierImages = ratingMap[tier].slice();
  currentTierImageIndex = 0;

  document.getElementById("tier-modal-number").textContent = tier;

  // If there's at least 1 image, display it
  if (tierImages.length > 0) {
    document.getElementById("tier-modal-image").src = tierImages[currentTierImageIndex];
    document.getElementById("tier-modal-image").style.display = "block";
    document.getElementById("tier-modal-empty").style.display = "none";
  } else {
    // No images in this tier
    document.getElementById("tier-modal-image").removeAttribute("src");
    document.getElementById("tier-modal-image").style.display = "none";

    // Show a simple message
    document.getElementById("tier-modal-empty").textContent = `No images in tier ${tier}`;
    document.getElementById("tier-modal-empty").style.display = "block";
  }

  document.getElementById("tier-modal").style.display = "flex";
}

// ----------------------
// loadImage
// ----------------------
function loadImage() {
  const centerImg = document.getElementById("center-image");
  const noImagesMsg = document.getElementById("no-images-message");

  // Filter out rated
  const remaining = images.filter(img => !isImageRated(img));

  if (remaining.length === 0) {
    centerImg.style.display = "none";
    centerImg.removeAttribute("src");
    noImagesMsg.style.display = "block";
    noImagesMsg.textContent = "No images remain to be ranked. Please upload more to continue.";
    return; 
  }

  // If we've gone past the last unranked image
  if (currentImageIndex >= remaining.length) {
    centerImg.style.display = "none";
    centerImg.removeAttribute("src");
    noImagesMsg.style.display = "block";
    noImagesMsg.textContent = "All images have been ranked or no images remain.";
    return;
  }

  // Otherwise, show the current unranked image
  noImagesMsg.style.display = "none";
  centerImg.src = remaining[currentImageIndex];
  centerImg.style.display = "block";
}

// ----------------------
// Check if Image is Rated
// ----------------------
function isImageRated(imgSrc) {
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
  const key = event.key;
  if (["1", "2", "3", "4", "5"].includes(key)) {
    assignRating(parseInt(key, 10));
  } else if (event.key === "ArrowLeft") {
    // Undo
    undoLastAction();
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

  // Remove from old rating if it exists
  removeImageFromAllRatings(imgSrc);

  // Add to chosen rating
  ratingMap[rating].push(imgSrc);
  console.log(`Assigned ${imgSrc} to rating ${rating}`);

  // Record in history for undo, now with type: 'assign'
  history.push({
    type: 'assign',
    image: imgSrc, 
    rating
  });

  // Update the rating preview
  updateRatingPreview(rating);

  // Move to the next image
  currentImageIndex++;
  loadImage();

  saveStateToLocalStorage();
}

// ----------------------
// Update the Rating Preview
// ----------------------
function updateRatingPreview(rating) {
  const ratingContainer = document.getElementById(`rating-${rating}`);
  if (!ratingContainer) return;

  // Clear existing
  while (ratingContainer.firstChild) {
    ratingContainer.removeChild(ratingContainer.firstChild);
  }

  // Add the label
  const labelSpan = document.createElement("span");
  labelSpan.textContent = `${rating} ★`;
  ratingContainer.appendChild(labelSpan);

  // Show only the last image in ratingMap[rating]
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
    const arr = ratingMap[i];
    const index = arr.indexOf(imgSrc);
    if (index !== -1) {
      arr.splice(index, 1);
    }
  }
}

// ----------------------
// Undo the Last Rating or Skip
// ----------------------
function undoLastAction() {
  if (history.length === 0) {
    console.log("No actions to undo");
    return;
  }
  const lastAction = history.pop();

  if (lastAction.type === 'assign') {
    // e.g., { type: 'assign', image: "...", rating: ... }
    removeImageFromAllRatings(lastAction.image);
    updateRatingPreview(lastAction.rating);
    if (currentImageIndex > 0) {
      currentImageIndex--;
    }
    loadImage();
    saveStateToLocalStorage();
  } else if (lastAction.type === 'skip') {
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
  const skippedSrc = centerImg.src;

  // Record the skip
  history.push({
    type: 'skip',
    index: currentImageIndex,
    image: skippedSrc
  });

  currentImageIndex++;
  loadImage();
  saveStateToLocalStorage();
}

// ----------------------
// Export Rankings as JSON
// ----------------------
function exportRankings() {
  const dataStr = JSON.stringify(ratingMap, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'ratingMap.json';
  a.click();
  URL.revokeObjectURL(url);
}

// ----------------------
// Local Storage
// ----------------------
function loadStateFromLocalStorage() {
  const savedImages = localStorage.getItem(`${LS_PREFIX}images`);
  if (savedImages) {
    images = JSON.parse(savedImages);
  }
  const savedIndex = localStorage.getItem(`${LS_PREFIX}currentImageIndex`);
  if (savedIndex) {
    currentImageIndex = parseInt(savedIndex, 10);
  }
  const savedRatingMap = localStorage.getItem(`${LS_PREFIX}ratingMap`);
  if (savedRatingMap) {
    ratingMap = JSON.parse(savedRatingMap);
  }
  const savedHistory = localStorage.getItem(`${LS_PREFIX}history`);
  if (savedHistory) {
    history = JSON.parse(savedHistory);
  }
}

function saveStateToLocalStorage() {
  localStorage.setItem(`${LS_PREFIX}images`, JSON.stringify(images));
  localStorage.setItem(`${LS_PREFIX}currentImageIndex`, currentImageIndex);
  localStorage.setItem(`${LS_PREFIX}ratingMap`, JSON.stringify(ratingMap));
  localStorage.setItem(`${LS_PREFIX}history`, JSON.stringify(history));
}

// ----------------------
// Upload Images
// ----------------------
function uploadImages(event) {
  const files = event.target.files;
  if (!files || files.length === 0) {
    return;
  }

  // Count how many unranked images existed
  const oldRemaining = images.filter(img => !isImageRated(img)).length;

  const formData = new FormData();
  for (const file of files) {
    formData.append('images', file);
  }

  fetch('/api/upload', {
    method: 'POST',
    body: formData
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      return response.json();
    })
    .then(data => {
      console.log('Server returned uploaded files:', data.files);
      const newPaths = data.files.map(f => `/images/${f}`);
      images.push(...newPaths);

      // If there were 0 unranked images, we were effectively "done" before
      if (oldRemaining === 0) {
        currentImageIndex = 0;
      }

      saveStateToLocalStorage();
      loadImage();
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

  localStorage.removeItem(`${LS_PREFIX}images`);
  localStorage.removeItem(`${LS_PREFIX}currentImageIndex`);
  localStorage.removeItem(`${LS_PREFIX}ratingMap`);
  localStorage.removeItem(`${LS_PREFIX}history`);

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
      images = data;
      console.log("Fetched images after reset:", images);
    } else {
      console.warn("Could not fetch images after reset.");
    }
  } catch (err) {
    console.error("Error fetching images after reset:", err);
  }

  for (let i = 1; i <= 5; i++) {
    updateRatingPreview(i);
  }

  loadImage();
  saveStateToLocalStorage();
}