"""Tests for AsyncV1FirecrawlApp.async_batch_scrape_urls (GitHub issue #3477).

The method was treating the dict returned by _async_post_request as a raw
aiohttp response object, making the success path unreachable.
"""

import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from firecrawl.v1.client import AsyncV1FirecrawlApp, V1BatchScrapeResponse


@pytest.fixture
def client():
    """Create an AsyncV1FirecrawlApp with a dummy API key."""
    return AsyncV1FirecrawlApp(api_key="fc-test-key", api_url="http://localhost:3000")


@pytest.mark.asyncio
async def test_async_batch_scrape_urls_success(client):
    """async_batch_scrape_urls should return a V1BatchScrapeResponse on success."""
    mock_response = {
        "success": True,
        "id": "batch-abc-123",
        "url": "http://localhost:3000/v1/batch/scrape/batch-abc-123",
    }

    with patch.object(
        client, "_async_post_request", new_callable=AsyncMock, return_value=mock_response
    ):
        result = await client.async_batch_scrape_urls(
            urls=["https://example.com", "https://example.org"]
        )

    assert isinstance(result, V1BatchScrapeResponse)
    assert result.success is True
    assert result.id == "batch-abc-123"
    assert result.url == "http://localhost:3000/v1/batch/scrape/batch-abc-123"


@pytest.mark.asyncio
async def test_async_batch_scrape_urls_failure(client):
    """async_batch_scrape_urls should raise on a failure response."""
    mock_response = {
        "success": False,
        "error": "Rate limit exceeded",
    }

    with patch.object(
        client, "_async_post_request", new_callable=AsyncMock, return_value=mock_response
    ):
        with pytest.raises(Exception):
            await client.async_batch_scrape_urls(
                urls=["https://example.com"]
            )
