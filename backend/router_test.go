package main

import (
	"testing"
)

func TestScanLabels(t *testing.T) {
	// Valid JSON array
	labels := scanLabels([]byte(`["bug","feature"]`))
	if len(labels) != 2 {
		t.Fatalf("expected 2 labels, got %d", len(labels))
	}
	if labels[0] != "bug" || labels[1] != "feature" {
		t.Fatalf("expected [bug feature], got %v", labels)
	}
}

func TestScanLabelsEmpty(t *testing.T) {
	labels := scanLabels([]byte(`[]`))
	if len(labels) != 0 {
		t.Fatalf("expected 0 labels, got %d", len(labels))
	}
}

func TestScanLabelsNull(t *testing.T) {
	labels := scanLabels(nil)
	if len(labels) != 0 {
		t.Fatalf("expected 0 labels for nil, got %d", len(labels))
	}
}

func TestScanLabelsMalformed(t *testing.T) {
	labels := scanLabels([]byte(`not-json`))
	// Should return empty slice, not panic
	if len(labels) != 0 {
		t.Fatalf("expected 0 labels for malformed input, got %d", len(labels))
	}
}

func TestPublishBoardEvent(t *testing.T) {
	hub := newSSEHub()
	if hub == nil {
		t.Fatal("expected non-nil hub")
	}
	if len(hub.watchers) != 0 {
		t.Fatalf("expected 0 watchers, got %d", len(hub.watchers))
	}
}

func TestSSEHubSubscribeUnsubscribe(t *testing.T) {
	hub := newSSEHub()
	ch := hub.subscribe("board-1")
	if ch == nil {
		t.Fatal("expected non-nil channel")
	}
	if len(hub.watchers) != 1 {
		t.Fatalf("expected 1 watcher, got %d", len(hub.watchers))
	}

	hub.unsubscribe("board-1", ch)
	if len(hub.watchers) != 0 {
		t.Fatalf("expected 0 watchers after unsubscribe, got %d", len(hub.watchers))
	}
}

func TestSSEHubPublish(t *testing.T) {
	hub := newSSEHub()
	ch := hub.subscribe("board-1")
	hub.publish("board-1", []byte(`{"type":"test"}`))

	// Should receive the message (non-blocking)
	select {
	case msg := <-ch:
		if string(msg) != `{"type":"test"}` {
			t.Fatalf("unexpected message: %s", string(msg))
		}
	default:
		t.Fatal("expected to receive a message")
	}
}
