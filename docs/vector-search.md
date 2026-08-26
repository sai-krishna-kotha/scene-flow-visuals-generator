# Semantic Vector Search (Phase 6)

## Overview
The V2 semantic vector search introduces the ability to retrieve assets based on visual and conceptual meaning rather than exact keyword matches. This is a core feature of the AI Storyboard Intelligence Platform.

## Architecture & Responsibilities

The vector search architecture deliberately splits responsibilities:

1. **PostgreSQL (Authoritative Source of Truth)**
   - Stores all relational Asset metadata (URLs, dimensions, provider IDs, etc.).
   - If an asset is deleted from PostgreSQL, it is effectively gone from the system.

2. **Sentence Transformers (Embedding Generation)**
   - Used to generate normalized, dense vector representations of textual descriptions.
   - We use the `all-MiniLM-L6-v2` model by default.
   - **Rationale:** It's a lightweight, fast, and highly capable sentence transformer. It operates entirely locally (CPU-friendly), avoiding external LLM API costs and latency for embedding generation. It produces a 384-dimensional vector, which is an excellent trade-off between semantic capacity and memory footprint.
   - Embeddings are generated **outside** of PostgreSQL to keep the database lightweight and to allow for easy swapping of the embedding model in the future without complex DB migrations.

3. **Qdrant (Vector Index)**
   - Acts purely as a derived index for rapid Top-K similarity searches.
   - **Configuration:** 384 dimensions, Cosine similarity.
   - Stores ONLY the Asset UUID and critical filtering metadata (e.g., orientation, provider). It does **not** duplicate the full Asset payload.

## Asset Embedding Strategy

Instead of embedding raw URLs or database IDs (which pollute the vector space with non-semantic noise), we construct a deterministic, visually meaningful text representation.

**Strategy:**
`[alt_text]. Provider: [provider_name].`

This ensures the vector captures the core visual semantics (via the `alt_text`) and the stylistic context (if the provider implies a certain style).

## Indexing Lifecycle

1. **Persistence First:** Assets are fully persisted in PostgreSQL first.
2. **Asynchronous Indexing:** Immediately following DB commit, the `VectorIndexingService` generates embeddings and upserts the UUID/vectors to Qdrant.
3. **Failure Behavior:** If Qdrant indexing fails, the PostgreSQL persistence is NOT rolled back. The asset remains in the database. Vector indexing failure is logged explicitly. This guarantees no relational data corruption due to a vector DB outage, and allows for asynchronous retry or reindexing later.

## Semantic Search Flow

1. **User/AI Query:** "tired software engineer working late at night"
2. **Embedding:** The query is encoded into a 384D vector via Sentence Transformers.
3. **Retrieval:** Qdrant performs a Cosine similarity search (Top-K) and applies any hard metadata filters (e.g., `orientation = landscape`).
4. **Hydration:** Qdrant returns candidate UUIDs. The `SemanticSearchService` fetches the full, authoritative Asset records from PostgreSQL and maps them to the final response.

## Gemini Visual-Query Integration & Merging

In Phase 4, Gemini generates multiple distinct `visual_queries` for a single Scene. 
The Semantic Search Service orchestrates these by executing a vector search for *each* visual query independently.

**Multi-Query Merge Strategy:**
- Results are merged deterministically by Asset UUID.
- If an asset appears in multiple query results, we use **Max Pooling** (taking the maximum similarity score across all queries). 
- **Rationale:** If an image is an excellent match (0.95 similarity) for Query A, but a poor match (0.50 similarity) for Query B, its true relevance to the overall scene is best represented by its strongest individual match (0.95).

## Reindexing

Because Qdrant is a derived index, it can be completely blown away and rebuilt at any time.
A dedicated CLI script (`reindex.py`) is provided to stream batches of assets from PostgreSQL, re-embed them, and push them to Qdrant safely.

## Future: Semantic Reranking (Phase 7)
Currently, the system relies entirely on the base Sentence Transformer bi-encoder for relevance scoring. Phase 7 will introduce a Cross-Encoder or Learning-to-Rank stage to perform expensive, highly accurate reranking on the Top-K candidates returned by Qdrant.
