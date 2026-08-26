# Provider Architecture (Phase 5)

The Semantic Visual Asset Generator utilizes a multi-provider strategy for fetching visual asset candidates across multiple APIs asynchronously.

## Architecture

```
AssetSearchService (Aggregator)
 │
 ├── PexelsProvider
 ├── PixabayProvider
 └── OpenverseProvider
```

### Provider Interface
Each provider implements the `BaseProvider` abstract class. This mandates a standard signature:
`async def search(self, query: str, orientation: str, limit: int) -> list[ProviderAsset]`

By strictly adhering to `ProviderAsset`, we normalize drastically different external API shapes (Pexels, Pixabay, Openverse) into a single deterministic schema containing just the critical metadata required for downstream vector search.

### Async Fan-Out & Aggregation
The `AssetSearchService` is responsible for fanning out the search queries to all active providers simultaneously using `asyncio.gather`. 

**Why not sequential?** 
Calling providers sequentially would severely impact latency. By fanning out asynchronously, the total latency of an asset search is strictly bounded by the slowest successful provider (or the timeout).

### Timeout Strategy & Failure Isolation
Every provider HTTP request uses an isolated 10-second timeout via `httpx.AsyncClient`. 
If a provider fails, times out, or throws an unhandled exception:
1. The error is trapped by the `AssetSearchService`.
2. The specific provider is marked with a "failed" status in the `ProviderSearchResult`.
3. **Crucially:** The overall search continues unharmed using the candidates retrieved from the successful providers. A Pixabay outage will not prevent Pexels assets from being stored.

### Normalization
The `ProviderAsset` abstraction normalizes:
- Identifiers (`provider_asset_id`)
- Image endpoints (`image_url`, `thumbnail_url`)
- Dimensions (`width`, `height`)
- Fallback text (`alt_text`)
- Legal metadata (`license`)

Because provider-specific responses are hidden behind this layer, the PostgreSQL persistence layer (and subsequent Phase 6 semantic ranking) does not need to handle raw provider JSON.

### Deduplication
The aggregator utilizes a robust deterministic metadata-level deduplication strategy before returning assets:
1. Checks for identical unique provider fingerprints (`{provider}_{provider_asset_id}`).
2. Checks for absolutely identical normalized image URLs.

This prevents the database from storing identical references if a provider bugs out and returns identical records. (Note: Perceptual pixel-level hashing is deferred to future optimization phases).
