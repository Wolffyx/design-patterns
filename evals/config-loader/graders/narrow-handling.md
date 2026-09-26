---
type: llm
weight: 2
---

Pass when only the "file does not exist" case falls back to defaults (by
catching `FileNotFoundError` specifically, or checking existence first), while
invalid JSON and other I/O errors are not silently ignored (they propagate,
or are re-raised with context). The result must be a merged copy, not a
mutation of `DEFAULTS`. Fail when a bare `except:` or `except Exception:`
returns defaults or passes.
