import time 
import requests
import re
import os
from django.conf import settings
from nltk.corpus import stopwords
from nltk import word_tokenize, pos_tag
from collections import Counter
import nltk

try:
    from sentence_transformers import SentenceTransformer, util
except ImportError:
    print("SentenceTransformer not installed. Falling back to basic scoring.")
    util = None
    SentenceTransformer = None
except Exception as e:
    print(f"Error loading SentenceTransformer: {e}")
    util = None
    SentenceTransformer = None

MODEL = None

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords', quiet=True)
try:
    nltk.data.find('taggers/averaged_perceptron_tagger')
except LookupError:
    nltk.download('averaged_perceptron_tagger', quiet=True)

STOP_WORDS = set(stopwords.words('english'))

def extract_keywords(sentence, max_keywords=5):
    """Extracts key nouns and adjectives from a sentence."""
    words = [w.lower() for w in word_tokenize(sentence) if w.isalnum()]
    words = [w for w in words if w not in STOP_WORDS]
    tags = pos_tag(words)
    candidates = [w for w, tag in tags if tag.startswith('NN') or tag.startswith('JJ')]
    if not candidates:
        candidates = words
    return [w for w, count in Counter(candidates).most_common(max_keywords)]


def search_pexels(query, orientation='all'):
    """Searches Pexels API and returns a standardized list of images."""
    if not settings.PEXELS_API_KEY:
        print("PEXELS_API_KEY not set in settings.py")
        return []

    headers = {"Authorization": settings.PEXELS_API_KEY}
    params = {"query": query, "per_page": 5}
    if orientation in ['landscape', 'portrait', 'square']:
        params['orientation'] = orientation
    url = "https://api.pexels.com/v1/search"
    
    try:
        r = requests.get(url, headers=headers, params=params, timeout=10)
        r.raise_for_status() 
        data = r.json().get("photos", [])
        
        results = []
        for item in data:
            results.append({
                "source": "pexels",
                "image_url": item.get("src", {}).get("original"),
                "alt_text": item.get("alt"),
                "license": "Pexels License",
                "width": item.get("width"),
                "height": item.get("height"),
            })
        return results
    except Exception as e:
        print(f"[PEXELS ERROR] {e}")
        return []

def search_pixabay(query, orientation='all'):
    """Searches Pixabay API and returns a standardized list of images."""
    if not settings.PIXABAY_API_KEY:
        print("PIXABAY_API_KEY not set in settings.py")
        return []

    params = {
        "key": settings.PIXABAY_API_KEY,
        "q": query,
        "image_type": "photo",
        "per_page": 5,
    }
    if orientation == 'landscape':
        params['orientation'] = 'horizontal'
    elif orientation == 'portrait':
        params['orientation'] = 'vertical'
    url = "https://pixabay.com/api/"
    
    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        data = r.json().get("hits", [])

        results = []
        for item in data:
            results.append({
                "source": "pixabay",
                "image_url": item.get("largeImageURL") or item.get("webformatURL"),
                "alt_text": item.get("tags"),
                "license": "Pixabay License",
                "width": item.get("imageWidth"),
                "height": item.get("imageHeight"),
            })
        return results
    except Exception as e:
        print(f"[PIXABAY ERROR] {e}")
        return []


_openverse_token_info = {"token": None, "expires": 0}

def get_openverse_token():
    """Gets an OAuth token from Openverse, caching it."""
    global _openverse_token_info
    
    if _openverse_token_info["token"] and time.time() < _openverse_token_info["expires"]:
        return _openverse_token_info["token"]

    client_id = settings.OPENVERSE_CLIENT_ID
    client_secret = settings.OPENVERSE_CLIENT_SECRET
    
    if not client_id or not client_secret:
        print("OPENVERSE_CLIENT_ID or OPENVERSE_CLIENT_SECRET not set in settings.py")
        return None

    token_url = "https://api.openverse.org/v1/auth_tokens/token/"
    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "client_credentials",
    }
    
    try:
        r = requests.post(token_url, data=payload, timeout=10)
        r.raise_for_status()
        data = r.json()
        
        access_token = data.get("access_token")
        expires_in = data.get("expires_in", 3600)
        
        _openverse_token_info["token"] = access_token
        _openverse_token_info["expires"] = time.time() + expires_in - 60 
        
        print("Successfully obtained Openverse token.")
        return access_token
    except Exception as e:
        print(f"[OPENVERSE TOKEN ERROR] {e}")
        _openverse_token_info = {"token": None, "expires": 0}
        return None

def search_openverse(query, orientation='all'):
    """Searches Openverse API and returns a standardized list of images."""
    access_token = get_openverse_token()
    if not access_token:
        return []

    headers = {"Authorization": f"Bearer {access_token}"}
    url = "https://api.openverse.engineering/v1/images/"
    
    params = {
        "q": query,
        "license_type": "commercial,modification",
        "page_size": 5,
    }
    
    if orientation == 'landscape':
        params['aspect_ratio'] = 'wide'
    elif orientation == 'portrait':
        params['aspect_ratio'] = 'tall'
    elif orientation == 'square': 
        params['aspect_ratio'] = 'square'

    try:
        print(f"!!! DEBUG OPENVERSE: Sending params: {params} !!!")
        r = requests.get(url, headers=headers, params=params, timeout=15)
        r.raise_for_status()
        data = r.json().get("results", [])
        
        results = []
        for item in data:
            results.append({
                "source": "openverse",
                "image_url": item.get("url"),
                "alt_text": item.get("title"),
                "license": item.get("license"), 
                "width": item.get("width"),
                "height": item.get("height"),
            })
        return results
    except Exception as e:
        print(f"[OPENVERSE SEARCH ERROR] {e}")
        return []

def score_image(sentence, image_meta):
    """
    Scores an image based on resolution and SEMANTIC similarity.
    """
    global MODEL
    if MODEL is None and SentenceTransformer is not None:
        try:
            print(f"[Worker PID: {os.getpid()}] Initializing SentenceTransformer model...")
            MODEL = SentenceTransformer("all-MiniLM-L6-v2")
            print(f"[Worker PID: {os.getpid()}] Model loaded successfully.")
        except Exception as e:
            print(f"Error loading SentenceTransformer model in worker: {e}")
            return 0.0

    pixels = (image_meta.get("width") or 0) * (image_meta.get("height") or 0)
    if pixels > 1920*1080:
        res_score = 1.0  
    elif pixels > 1280*720:
        res_score = 0.7  
    elif pixels > 640*480:
        res_score = 0.3  
    else:
        res_score = 0.0  
        
    sem_score = 0.0
    if MODEL and util:
        try:
            alt_text = image_meta.get("alt_text") or ""      
            emb_sentence = MODEL.encode(sentence, convert_to_tensor=True)
            emb_alt_text = MODEL.encode(alt_text, convert_to_tensor=True)
            
            cos_sim = util.cos_sim(emb_sentence, emb_alt_text)
            
            sem_score = max(0.0, cos_sim.item())
        except Exception as e:
            print(f"Error during semantic scoring: {e}")
            sem_score = 0.0
    
    final_score = (sem_score * 0.7) + (res_score * 0.3)
    
    return round(final_score, 3)