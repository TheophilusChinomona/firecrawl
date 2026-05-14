package firecrawl

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestScrapeOptionsSerializesQueryFormatMode(t *testing.T) {
	payload, err := json.Marshal(ScrapeOptions{
		FormatOptions: []interface{}{
			QueryFormat{
				Prompt: "What is Firecrawl?",
				Mode:   QueryModeDirectQuote,
			},
		},
	})
	if err != nil {
		t.Fatalf("Marshal ScrapeOptions: %v", err)
	}

	jsonBody := string(payload)
	for _, want := range []string{
		`"formats":[{"type":"query","prompt":"What is Firecrawl?","mode":"directQuote"}]`,
	} {
		if !strings.Contains(jsonBody, want) {
			t.Fatalf("serialized query format = %s, want to contain %s", jsonBody, want)
		}
	}
}

func TestScrapeOptionsSerializesQuestionAndHighlightsFormats(t *testing.T) {
	payload, err := json.Marshal(ScrapeOptions{
		FormatOptions: []interface{}{
			QuestionFormat{Question: "What is Firecrawl?"},
			HighlightsFormat{Query: "What is Firecrawl?"},
		},
	})
	if err != nil {
		t.Fatalf("Marshal ScrapeOptions: %v", err)
	}

	jsonBody := string(payload)
	for _, want := range []string{
		`{"type":"question","question":"What is Firecrawl?"}`,
		`{"type":"highlights","query":"What is Firecrawl?"}`,
	} {
		if !strings.Contains(jsonBody, want) {
			t.Fatalf("serialized formats = %s, want to contain %s", jsonBody, want)
		}
	}
}

func TestScrapeOptionsPreservesStringFormats(t *testing.T) {
	payload, err := json.Marshal(ScrapeOptions{
		Formats: []string{"markdown", "video"},
	})
	if err != nil {
		t.Fatalf("Marshal ScrapeOptions: %v", err)
	}

	if !strings.Contains(string(payload), `"formats":["markdown","video"]`) {
		t.Fatalf("serialized string formats = %s", payload)
	}
}

func TestScrapeOptionsSerializesProfileConfig(t *testing.T) {
	payload, err := json.Marshal(ScrapeOptions{
		Profile: &ProfileConfig{
			Name:        "my-profile",
			SaveChanges: Bool(true),
		},
	})
	if err != nil {
		t.Fatalf("Marshal ScrapeOptions: %v", err)
	}

	jsonBody := string(payload)
	if !strings.Contains(jsonBody, `"profile":{"name":"my-profile","saveChanges":true}`) {
		t.Fatalf("serialized profile = %s, want to contain profile config", jsonBody)
	}
}

func TestScrapeOptionsOmitsProfileWhenNil(t *testing.T) {
	payload, err := json.Marshal(ScrapeOptions{
		Formats: []string{"markdown"},
	})
	if err != nil {
		t.Fatalf("Marshal ScrapeOptions: %v", err)
	}

	jsonBody := string(payload)
	if strings.Contains(jsonBody, `"profile"`) {
		t.Fatalf("serialized options should omit nil profile, got %s", jsonBody)
	}
}

func TestScrapeOptionsSerializesProfileNameOnly(t *testing.T) {
	payload, err := json.Marshal(ScrapeOptions{
		Profile: &ProfileConfig{
			Name: "session-1",
		},
	})
	if err != nil {
		t.Fatalf("Marshal ScrapeOptions: %v", err)
	}

	jsonBody := string(payload)
	// saveChanges should be omitted when nil
	if !strings.Contains(jsonBody, `"profile":{"name":"session-1"}`) {
		t.Fatalf("serialized profile = %s, want profile with name only", jsonBody)
	}
}
