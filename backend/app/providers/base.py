from abc import ABC, abstractmethod
from app.schemas.provider import ProviderAsset

class BaseProvider(ABC):
    @abstractmethod
    async def search(self, query: str, orientation: str = "all", limit: int = 20) -> list[ProviderAsset]:
        """
        Search the provider for assets matching the query.
        Must handle its own HTTP errors and timeouts.
        Should return an empty list if it fails or finds nothing, or raise an exception to be caught by the aggregator.
        """
        pass
