from app.models.asset import Asset

def asset_to_embedding_text(asset: Asset) -> str:
    """
    Constructs a meaningful visual semantic text representation for an Asset.
    Avoids IDs, timestamps, and URLs which pollute the embedding space with non-visual tokens.
    
    Format:
    [alt_text]. Provider: [provider_name].
    """
    parts = []
    
    if asset.alt_text:
        # Clean up any weird newlines
        clean_alt = " ".join(asset.alt_text.split())
        parts.append(clean_alt)
        
    parts.append(f"Provider: {asset.provider_name.capitalize()}")
    
    # We could add orientation derived from width/height if it were visually descriptive,
    # but Qdrant metadata filters handle hard constraints like orientation much better than embeddings.
    
    return ". ".join(parts).strip() + "."
