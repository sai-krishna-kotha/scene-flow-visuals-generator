let nextUrl = '/api/scripts/';

document.addEventListener('DOMContentLoaded', () => {
    const dashboard = document.getElementById('view-dashboard');
    if (dashboard) {
        dashboard.style.display = 'block';
        fetchScripts(nextUrl);
    }

    // --- FIXED: LOAD MORE EVENT LISTENER ---
    const loadBtn = document.getElementById('load-more-btn');
    if (loadBtn) {
        loadBtn.addEventListener('click', () => {
            if (nextUrl) {
                fetchScripts(nextUrl, true); // true = append data
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
            
            // Open separate detailed page in a new tab
            card.onclick = () => window.open(`/project/${s.id}/`, '_blank');
            grid.appendChild(card);
        });

        nextUrl = data.next;
        document.getElementById('load-more-btn').style.display = nextUrl ? 'block' : 'none';
    } catch (err) {
        console.error("API Fetch Error:", err);
    }
}

// 2. Submit New Script (POST)
document.getElementById('submit-btn').onclick = async () => {
    const btn = document.getElementById('submit-btn');
    const text = document.getElementById('script-text').value;
    
    if (!text) return alert("Please enter your script text, bro.");

    btn.innerText = "Processing AI Logic...";
    btn.disabled = true;

    const payload = {
        title: document.getElementById('script-title').value || "Untitled Asset Set",
        full_text: text,
        orientation_preference: document.getElementById('orientation-input').value
    };

    const res = await fetch('/api/scripts/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': CSRF_TOKEN },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        const newScript = await res.json();
        btn.innerText = "Generate Assets";
        btn.disabled = false;
        
        // Open the result immediately in a new tab
        window.open(`/project/${newScript.id}/`, '_blank');
        
        // Reset dashboard
        document.getElementById('script-text').value = '';
        document.getElementById('script-title').value = '';
        fetchScripts('/api/scripts/', false);
    } else {
        alert("Server error. Check if 'full_text' is being sent correctly.");
        btn.innerText = "Generate Assets";
        btn.disabled = false;
    }
};

// 3. Search Handler
function searchScripts() {
    const query = document.getElementById('search-input').value;
    fetchScripts(`/scripts/${query}`, false);
}

document.getElementById('nav-logo').onclick = () => window.location.href = "/";