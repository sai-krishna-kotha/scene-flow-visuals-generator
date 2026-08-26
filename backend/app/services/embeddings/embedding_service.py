import logging
from typing import List, Union
from app.config import settings

logger = logging.getLogger(__name__)

class EmbeddingService:
    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EmbeddingService, cls).__new__(cls)
        return cls._instance

    def _ensure_model_loaded(self):
        """Lazy load the sentence transformer model so it doesn't block startup or test collection unless used."""
        if self._model is None:
            logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
            # Import here to avoid slow loading at the top level
            from sentence_transformers import SentenceTransformer
            
            # This downloads the model on first run if not present
            self._model = SentenceTransformer(settings.EMBEDDING_MODEL)
            logger.info("Embedding model loaded successfully.")

    @property
    def dimension(self) -> int:
        """Return the embedding dimension of the loaded model."""
        self._ensure_model_loaded()
        return self._model.get_sentence_embedding_dimension()

    def encode(self, text: Union[str, List[str]]) -> Union[List[float], List[List[float]]]:
        """
        Encode a single string or a list of strings into a normalized vector.
        Normalization is applied natively by sentence-transformers to use cosine similarity via dot product,
        but we enforce Qdrant Cosine anyway.
        """
        self._ensure_model_loaded()
        
        # Convert to numpy and then tolist() to ensure standard python floats
        embeddings = self._model.encode(text, convert_to_numpy=True)
        if hasattr(embeddings, "tolist"):
            return embeddings.tolist()
        return embeddings
