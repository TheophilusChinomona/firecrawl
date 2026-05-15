"""Unit tests for creditsUsed forwarding in search responses."""

import pytest
from unittest.mock import MagicMock
from firecrawl.v2.types import SearchRequest, SearchData
from firecrawl.v2.methods.search import search as search_fn


def _make_mock_response(json_data: dict, status_code: int = 200) -> MagicMock:
    """Create a mock HTTP response."""
    mock = MagicMock()
    mock.status_code = status_code
    mock.json.return_value = json_data
    return mock


class TestSearchCreditsUsed:
    """Tests that creditsUsed from the API response is forwarded in SearchData."""

    def test_credits_used_forwarded_from_response(self):
        """When the API returns creditsUsed at the top level, SearchData.credits_used should reflect it."""
        mock_client = MagicMock()
        mock_client.post.return_value = _make_mock_response({
            "success": True,
            "data": {
                "web": [
                    {"url": "https://example.com", "title": "Example", "description": "A test result"}
                ]
            },
            "creditsUsed": 5,
        })

        request = SearchRequest(query="test query")
        result = search_fn(mock_client, request)

        assert isinstance(result, SearchData)
        assert result.credits_used == 5

    def test_credits_used_none_when_absent(self):
        """When the API does not return creditsUsed, SearchData.credits_used should be None."""
        mock_client = MagicMock()
        mock_client.post.return_value = _make_mock_response({
            "success": True,
            "data": {
                "web": [
                    {"url": "https://example.com", "title": "Example", "description": "A result"}
                ]
            },
        })

        request = SearchRequest(query="test query")
        result = search_fn(mock_client, request)

        assert isinstance(result, SearchData)
        assert result.credits_used is None

    def test_credits_used_zero(self):
        """When the API returns creditsUsed: 0, it should be forwarded as 0 (not None)."""
        mock_client = MagicMock()
        mock_client.post.return_value = _make_mock_response({
            "success": True,
            "data": {"web": []},
            "creditsUsed": 0,
        })

        request = SearchRequest(query="test query")
        result = search_fn(mock_client, request)

        assert isinstance(result, SearchData)
        assert result.credits_used == 0

    def test_credits_used_with_multiple_sources(self):
        """creditsUsed is forwarded even when multiple source types are present."""
        mock_client = MagicMock()
        mock_client.post.return_value = _make_mock_response({
            "success": True,
            "data": {
                "web": [{"url": "https://a.com", "title": "A", "description": "desc"}],
                "news": [{"url": "https://b.com", "title": "B", "snippet": "snip"}],
                "images": [{"url": "https://c.com", "title": "C", "image_url": "https://img.com"}],
            },
            "creditsUsed": 12,
        })

        request = SearchRequest(query="multi-source test")
        result = search_fn(mock_client, request)

        assert isinstance(result, SearchData)
        assert result.credits_used == 12
        assert result.web is not None
        assert result.news is not None
        assert result.images is not None
