/**
 * Tests for crawl command
 *
 * Regression test for https://github.com/firecrawl/firecrawl/issues/3373
 * The CLI was converting pollInterval and timeout from seconds to milliseconds
 * before passing to app.crawl(), but the SDK's waitForCrawlCompletion() also
 * multiplies by 1000 internally. This caused a double conversion:
 *   CLI: 5 * 1000 = 5000
 *   SDK: 5000 * 1000 = 5,000,000 ms = ~83 minutes per poll
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeCrawl } from '../../commands/crawl';
import { getClient } from '../../utils/client';

// Mock the Firecrawl client module
vi.mock('../../utils/client', async () => {
  const actual = await vi.importActual('../../utils/client');
  return {
    ...actual,
    getClient: vi.fn(),
  };
});

describe('executeCrawl', () => {
  let mockClient: any;

  beforeEach(() => {
    // Create mock client
    mockClient = {
      startCrawl: vi.fn(),
      getCrawlStatus: vi.fn(),
      crawl: vi.fn(),
      cancelCrawl: vi.fn(),
    };

    // Mock getClient to return our mock
    vi.mocked(getClient).mockReturnValue(mockClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Issue #3373: pollInterval and timeout must be in seconds (not ms)', () => {
    it('should pass pollInterval in seconds to SDK (no * 1000 conversion)', async () => {
      const mockCrawlJob = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'completed',
        total: 2,
        completed: 2,
        data: [{ markdown: '# Page 1' }],
      };
      mockClient.crawl.mockResolvedValue(mockCrawlJob);

      await executeCrawl({
        urlOrJobId: 'https://example.com',
        wait: true,
        pollInterval: 5,
      });

      // The SDK expects pollInterval in seconds -- it multiplies by 1000 internally.
      // Before the fix, the CLI was passing 5000 (5 * 1000), causing the SDK to
      // sleep 5,000,000 ms (~83 min) per poll cycle.
      expect(mockClient.crawl).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          pollInterval: 5, // seconds, NOT 5000
        }),
      );
    });

    it('should pass default pollInterval as 5 seconds (not 5000)', async () => {
      const mockCrawlJob = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'completed',
        total: 2,
        completed: 2,
        data: [],
      };
      mockClient.crawl.mockResolvedValue(mockCrawlJob);

      await executeCrawl({
        urlOrJobId: 'https://example.com',
        wait: true,
      });

      // Default poll interval should be 5 (seconds), not 5000 (ms)
      expect(mockClient.crawl).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          pollInterval: 5, // seconds
        }),
      );
    });

    it('should pass timeout in seconds to SDK (no * 1000 conversion)', async () => {
      const mockCrawlJob = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'completed',
        total: 2,
        completed: 2,
        data: [],
      };
      mockClient.crawl.mockResolvedValue(mockCrawlJob);

      await executeCrawl({
        urlOrJobId: 'https://example.com',
        wait: true,
        timeout: 300,
      });

      // The SDK expects timeout in seconds -- it multiplies by 1000 internally.
      // Before the fix, 300 * 1000 = 300000 was passed, causing the SDK to
      // interpret it as 300,000 seconds (~3.5 days).
      expect(mockClient.crawl).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          timeout: 300, // seconds, NOT 300000
        }),
      );
    });

    it('should use correct ms math in progress-mode polling loop', async () => {
      const jobId = '550e8400-e29b-41d4-a716-446655440000';
      const mockStartResponse = {
        id: jobId,
        url: 'https://example.com',
      };

      const mockCompletedStatus = {
        id: jobId,
        status: 'completed',
        total: 2,
        completed: 2,
        data: [],
      };

      mockClient.startCrawl.mockResolvedValue(mockStartResponse);
      mockClient.getCrawlStatus.mockResolvedValue(mockCompletedStatus);

      // Mock stderr.write to suppress output
      vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      // Capture the delay passed to setTimeout by wrapping it
      const capturedDelays: number[] = [];
      const realSetTimeout = globalThis.setTimeout;
      vi.stubGlobal('setTimeout', (fn: Function, delay?: number) => {
        if (typeof delay === 'number' && delay > 0) {
          capturedDelays.push(delay);
        }
        // Execute immediately for test speed
        return realSetTimeout(fn, 0);
      });

      const result = await executeCrawl({
        urlOrJobId: 'https://example.com',
        wait: true,
        progress: true,
        pollInterval: 3,
      });

      expect(result.success).toBe(true);

      // The polling delay should be 3000ms (3 seconds * 1000)
      expect(capturedDelays).toContain(3000);
      // It should NOT contain 3 (raw seconds) or 3000000 (double conversion)
      expect(capturedDelays).not.toContain(3);
      expect(capturedDelays).not.toContain(3000000);

      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });
  });

  describe('Start crawl (async)', () => {
    it('should call startCrawl with correct URL and return job ID', async () => {
      const mockResponse = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        url: 'https://example.com',
      };
      mockClient.startCrawl.mockResolvedValue(mockResponse);

      const result = await executeCrawl({
        urlOrJobId: 'https://example.com',
      });

      expect(mockClient.startCrawl).toHaveBeenCalledTimes(1);
      expect(mockClient.startCrawl).toHaveBeenCalledWith('https://example.com', {
        integration: 'cli',
      });
      expect(result).toEqual({
        success: true,
        data: {
          jobId: mockResponse.id,
          url: mockResponse.url,
          status: 'processing',
        },
      });
    });
  });

  describe('Error handling', () => {
    it('should return error result when crawl fails', async () => {
      const errorMessage = 'Crawl timeout';
      mockClient.crawl.mockRejectedValue(new Error(errorMessage));

      const result = await executeCrawl({
        urlOrJobId: 'https://example.com',
        wait: true,
      });

      expect(result).toEqual({
        success: false,
        error: errorMessage,
      });
    });
  });
});
