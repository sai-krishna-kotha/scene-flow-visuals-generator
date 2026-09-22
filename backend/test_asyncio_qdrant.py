import asyncio
import logging
from qdrant_client import QdrantClient

logging.basicConfig(level=logging.INFO)

def _run_async(coro):
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(coro)

async def do_nothing():
    await asyncio.sleep(0.1)

def main():
    _run_async(do_nothing())
    
    url = "http://localhost:6333"
    client = QdrantClient(url=url)
    
    print(client.get_collections())

if __name__ == "__main__":
    main()
