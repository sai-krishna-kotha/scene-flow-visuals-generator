let nextUrl = '/api/scripts/';

document.addEventListener('DOMContentLoaded', () => {
    const dashboard = document.getElementById('view-dashboard');
    if (dashboard) {
        dashboard.style.display = 'block';
        fetchScripts(nextUrl);
    }

    const loadBtn = document.getElementById('load-more-btn');
    if (loadBtn) {
        loadBtn.addEventListener('click', () => {
            if (nextUrl) {
                fetchScripts(nextUrl, true); 
            }
        });
    }
});

// 1. Fetch Projects List
async function fetchScripts(url, append = false) {
    if (!url) return;
    try {
        const res = await fetch(url);
        const data = await res.json();
        const grid = document.getElementById('scripts-grid');
        
        if (!append) grid.innerHTML = '';

        data.results.forEach(s => {
            const card = document.createElement('div');
            card.className = 'script-card';
            card.innerHTML = `
                <h4>${s.title || 'Untitled Project'}</h4>
                <p>Orientation: <strong>${s.orientation_preference}</strong></p>
                <small>Generated: ${new Date(s.created_at).toLocaleDateString()}</small>
            `;
            
            // FIX: Ensure trailing slash matches Django urls.py
            card.onclick = () => window.open(`/project/${s.id}/`, '_blank');
            grid.appendChild(card);
        });

        nextUrl = data.next;
        const loadMoreBtn = document.getElementById('load-more-btn');
        if(loadMoreBtn) loadMoreBtn.style.display = nextUrl ? 'block' : 'none';
    } catch (err) {
        console.error("API Fetch Error:", err);
    }
}

// 2. Submit New Script (POST)
document.getElementById('submit-btn').onclick = async () => {
    const btn = document.getElementById('submit-btn');
    const titleInput = document.getElementById('script-title');
    const textInput = document.getElementById('script-text');
    const orientInput = document.getElementById('orientation-input');

    if (!textInput.value) return alert("Please enter your script text, bro.");

    // Visual feedback
    btn.innerText = "Processing AI Logic...";
    btn.disabled = true;

    const payload = {
        title: titleInput.value || "Untitled Asset Set",
        full_text: textInput.value,
        orientation_preference: orientInput.value
    };
    console.log(payload);
    
    try {
        const res = await fetch('/api/scripts/', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'X-CSRFToken': CSRF_TOKEN 
            },
            body: JSON.stringify(payload)
        });
        console.log(`Res is ${res}`);
        
        if (res.ok) {
            const newScript = await res.json();
            console.log(`newScript is ${newScript}`);
            
            // FIX: Resetting button state immediately
            btn.innerText = "Generate Assets";
            btn.disabled = false;
            
            // Open the result page
            if (newScript.id) {
                window.open(`/project/${newScript.id}/`, '_blank');
            }
            
            // Clear inputs and refresh dashboard list
            textInput.value = '';
            titleInput.value = '';
            fetchScripts('/api/scripts/', false);
        } else {
            const errorData = await res.json();
            console.error("Server Error:", errorData);
            alert("Error: " + JSON.stringify(errorData));
            btn.innerText = "Generate Assets";
            btn.disabled = false;
        }
    } catch (err) {
        console.error("Network Error:", err);
        alert("Network error. Is the Django server running?");
        btn.innerText = "Generate Assets";
        btn.disabled = false;
    }
};

// 3. Search Handler - FIXED URL
function searchScripts() {
    const query = document.getElementById('search-input').value;
    // API filtering usually uses ?search= query parameter in DRF
    fetchScripts(`/api/scripts/?search=${query}`, false);
}

document.getElementById('nav-logo').onclick = () => window.location.href = "/";