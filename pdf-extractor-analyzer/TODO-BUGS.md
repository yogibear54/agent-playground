# TODO-BUGS.md

Code review tasks from analysis of `pdf-extractor-analyzer` project.

---

## Critical Issues

_(None currently identified)_

---

## High Priority Issues

### 1. Memory Usage with Large PDFs

**File:** `src/pdf_extractor_analyzer/pipeline.py`  
**Lines:** 218-229

**Description:**  
All page outputs are stored in memory before aggregation. For very large PDFs (thousands of pages), this could cause memory issues. The API is called sequentially per page rather than in batches.

**Severity:** High (Performance / Resource Exhaustion)

**Suggested Fix:** Consider streaming results or adding a configurable batch size with periodic aggregation. Alternatively, process pages in chunks and write intermediate results to disk.

---

### 2. Race Condition in Ephemeral Cache Cleanup

**File:** `src/pdf_extractor_analyzer/pipeline.py`  
**Lines:** 66-70

**Description:**  
In `_run_single_batch_item`, each worker creates its own `CacheManager` with ephemeral mode. The `cleanup()` method is called at the end of `extract()` (line 236), which should clean up temp directories. However, if a thread crashes or gets interrupted before `cleanup()` is called, temp directories could be orphaned.

**Severity:** High (Reliability)

**Suggested Fix:** Consider using a `try/finally` block in `extract()` to ensure cleanup, or implement a context manager pattern for guaranteed cleanup. Alternatively, use a shared cleanup mechanism that runs after all workers complete.

---

## Medium Priority Issues

### 3. `ValidationError` Not Caught as Validation Error

**File:** `src/pdf_extractor_analyzer/cli.py`  
**Lines:** 84-88

**Description:**  
`ValidationError` (from `exceptions.py`) is caught as a general exception (`except Exception`), not in the `(ValueError, TypeError)` branch, since it inherits from `PDFExtractorError` → `Exception`. This means validation errors return exit code 1 instead of 2.

```python
class ValidationError(PDFExtractorError):  # Not a ValueError
```

**Severity:** Medium (Correctness)

**Suggested Fix:** Either:
- Add `ValidationError` to the specific catch block: `except (ValueError, TypeError, ValidationError) as exc:`
- Or modify the exception hierarchy so `ValidationError` inherits from `ValueError`

---

### 4. Missing Input Validation for `validation_error` Length

**File:** `src/pdf_extractor_analyzer/analyzer.py`  
**Lines:** 195-201

**Description:**  
In `repair_structured_output`, the `validation_error` string is directly concatenated into the prompt without a length check. If `validation_error` is extremely long (e.g., contains entire PDF content), it could cause issues. There's a check for `candidate` size but not for `validation_error`.

**Severity:** Medium (Robustness)

**Suggested Fix:** Add a length check for `validation_error` similar to the candidate check:
```python
max_validation_error_size = 10_000  # 10KB limit
if len(validation_error) > max_validation_error_size:
    validation_error = validation_error[:max_validation_error_size] + "..."
```

---

## Low Priority Issues

### 5. Silent Image Loading Failures in `load_from_dir`

**File:** `src/pdf_extractor_analyzer/converter.py`  
**Lines:** 98-102

**Description:**  
Image loading failures are silently swallowed with `width, height = 0, 0`. This could hide corruption issues and return invalid dimensions without warning.

**Severity:** Low (Error Handling)

**Suggested Fix:** Log a warning when image dimensions cannot be determined:
```python
import logging
logger = logging.getLogger(__name__)
...
except Exception:
    logger.warning(f"Could not read image dimensions for {image_path}, setting to 0x0")
    width, height = 0, 0
```

---

### 6. Undocumented API Fallback Behavior in `_run_with_retries`

**File:** `src/pdf_extractor_analyzer/analyzer.py`  
**Lines:** 265-266

**Description:**  
The `wait` parameter is passed to `client.run()` but caught separately when it causes a `TypeError`. The fallback doesn't pass `wait`, which changes behavior depending on API compatibility. The intent isn't documented.

**Severity:** Low (Code Quality)

**Suggested Fix:** Add a comment explaining why the fallback is needed:
```python
try:
    output = self.client.run(model, input=input_payload, wait=self.config.timeout_seconds)
except TypeError:
    # Older replicate client versions don't support 'wait' parameter
    output = self.client.run(model, input=input_payload)
```

---

### 7. No Cap on Retry Backoff Sleep

**File:** `src/pdf_extractor_analyzer/analyzer.py`  
**Lines:** 280-281

**Description:**  
With `max_retries=3` and `retry_backback_seconds=1.0`, the maximum sleep time could be 4 seconds (1 + 2 + 4 = 7 seconds total wait). If `retry_backoff_seconds` is set to a very large value (e.g., 1000), it could cause extremely long waits. There's no maximum cap.

**Severity:** Low (Robustness)

**Suggested Fix:** Add a maximum cap on sleep time:
```python
sleep_seconds = min(
    self.config.retry_backoff_seconds * (2 ** (attempt - 1)),
    60  # Cap at 60 seconds
)
time.sleep(sleep_seconds)
```

---

## Previously Resolved Issues

The following issues were documented and have been verified as fixed in the codebase:

| # | Issue | Status |
|---|-------|--------|
| - | Path Traversal Vulnerability | ✅ Fixed (commit 3160f0a) |
| - | No Exit Code Handling in `main()` | ✅ Fixed (commit e9bd9ef) |
| - | O(n²) List Deduplication | ✅ Fixed (commit 29a5348) |
| - | Type Coercion in `_merge_two` | ✅ Fixed (commit 29a5348) |
| - | Redundant Worker Instantiation | ✅ Fixed (commit 2950bdd) |
| - | Missing `from __future__ import annotations` | ✅ Fixed (commit ff6ef15) |
| - | Silent Failure in Cache Cleanup | ✅ Fixed (commit b8fbb45) |
| - | Poor Debugging in `_extract_json_object` | ✅ Fixed (commit fc94148) |
| - | Hardcoded Model Parameters | ✅ Fixed (commit 04d3182) |

---

## Summary

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Memory Usage with Large PDFs | High | ⬜ Pending |
| 2 | Race Condition in Ephemeral Cache | High | ⬜ Pending |
| 3 | `ValidationError` Not Caught Correctly | Medium | ⬜ Pending |
| 4 | Missing `validation_error` Length Validation | Medium | ⬜ Pending |
| 5 | Silent Image Loading Failures | Low | ⬜ Pending |
| 6 | Undocumented API Fallback | Low | ⬜ Pending |
| 7 | No Cap on Retry Backoff | Low | ⬜ Pending |

---

## Resolution Checklist

- [ ] Issue #1: Memory Usage with Large PDFs
- [ ] Issue #2: Race Condition in Ephemeral Cache
- [ ] Issue #3: `ValidationError` Not Caught Correctly
- [ ] Issue #4: Missing `validation_error` Length Validation
- [ ] Issue #5: Silent Image Loading Failures
- [ ] Issue #6: Undocumented API Fallback
- [ ] Issue #7: No Cap on Retry Backoff
