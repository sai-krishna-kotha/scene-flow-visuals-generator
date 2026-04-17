/**
 * Semantic Visual Asset Generator - Detail Page Logic
 * Handles: Async data fetching, Storyboard rendering, and Client-side ZIP bundling.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const root = document.getElementById('scenes-root');
    const titleEl = document.getElementById('display-title');
    const metaEl = document.getElementById('display-meta');
    const dateEl = document.getElementById('display-date');

    try {
        // 1. Fetch the specific script data from our DRF API
        const res = await fetch(`/api/scripts/${SCRIPT_ID}/`);
        if (!res.ok) throw new Error("Failed to fetch project data.");
        
        const script = await res.json();

        // 2. Update Header Metadata
        titleEl.innerText = script.title || "Untitled Project";
        metaEl.innerText = script.orientation_preference;
        if (dateEl) {
            dateEl.innerText = `| Created: ${new Date(script.created_at).toLocaleDateString()}`;
        }

        // 3. Clear and Render Storyboard Scenes
        root.innerHTML = ''; 

        if (!script.scenes || script.scenes.length === 0) {
            root.innerHTML = '<p class="text-muted">No scenes generated for this script.</p>';
            return;
        }

        script.scenes.forEach((scene, index) => {
            const section = document.createElement('section');
            section.className = 'scene-section';
            
            // Building the scene header and the grid container
            section.innerHTML = `
                <h3>Scene ${index + 1}: ${scene.sentence_text}</h3>
                <div class="image-grid"></div>
            `;

            const grid = section.querySelector('.image-grid');
            
            // 4. Render Image Candidates for the Scene
            if (scene.candidates && scene.candidates.length > 0) {
                scene.candidates.forEach(img => {
                    grid.innerHTML += `
                        <div class="img-card">
                            <input type="checkbox" class="img-sel-check" data-url="${img.image_url}">
                            <div class="img-wrapper">
                                <img src="${img.image_url}" alt="${img.alt_text || 'AI Generated Asset'}" loading="lazy">
                            </div>
                            <div class="img-info">
                                <span class="quality">${img.quality_tier}</span>
                                <span class="match">${Math.round(img.relevance_score * 100)}% Match</span>
                            </div>
                        </div>
                    `;
                });
            } else {
                grid.innerHTML = '<p class="text-muted">No visual matches found for this scene.</p>';
            }
            
            root.appendChild(section);
        });

    } catch (err) {
        console.error("Error loading storyboard:", err);
        root.innerHTML = `<div class="card" style="color:red">Error loading asset data. Please try refreshing the page.</div>`;
    }
});

/**
 * Client-Side Asset Bundling (JSZip)
 * Downloads selected images directly from the browser to reduce server load.
 */
document.getElementById('download-zip-btn').onclick = async function() {
    const selected = document.querySelectorAll('.img-sel-check:checked');
    const btn = this;
    
    if (selected.length === 0) {
        return alert("Please select at least one visual asset to download, bro.");
    }

    // Visual feedback for the user
    const originalText = btn.innerText;
    btn.innerText = "Bundling Assets...";
    btn.disabled = true;

    try {
        const zip = new JSZip();
        const folder = zip.folder("storyboard_assets");

        // Use Promise.all to fetch images in parallel for speed
        const downloadPromises = Array.from(selected).map(async (input, index) => {
            const url = input.getAttribute('data-url');
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error("Network error");
                const blob = await response.blob();
                
                // Add to ZIP with a clean filename
                folder.file(`asset_scene_${index + 1}.jpg`, blob);
            } catch (e) {
                console.warn(`Could not fetch image at ${url}`, e);
            }
        });

        await Promise.all(downloadPromises);

        // Generate and trigger download
        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `assets_${SCRIPT_ID}.zip`;
        link.click();

    } catch (error) {
        console.error("ZIP Generation Error:", error);
        alert("An error occurred while creating the ZIP file.");
    } finally {
        // Reset button state
        btn.innerText = originalText;
        btn.disabled = false;
    }
};