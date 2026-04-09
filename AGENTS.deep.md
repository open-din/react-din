# AGENTS — react-din (DEEP CONTEXT)

## PURPOSE
Loaded ONLY when HOT context is insufficient.

---

## 1. DOCUMENTATION FLOW

1. docs/README.md
2. ../docs/summaries/react-din-api.md
3. docs/generated (max 2 files)
4. src/** (last resort)

---

## 2. DOCUMENTATION CONTRACT

docs/components/** MUST include:

- Purpose
- Props / Handles
- Defaults
- Integration Notes
- Failure Modes
- Example
- Test Coverage

---

## 3. COVERAGE GOVERNANCE

project/COVERAGE_MANIFEST.json must align:

- source
- docs
- tests
- scenarios

All required

---

## 4. UI COPY RULES

- no duplicated strings
- use centralized modules

---

## 5. SCHEMA GOVERNANCE

schemas/patch.schema.json:

- source of truth for PatchDocument
- must match public contract
- must remain exported

---

## 6. CODE READING POLICY

- docs > generated docs > source
- NEVER scan directories
- read only exact module

---

## 7. DOCUMENTATION RULES

- JSDoc required for public exports
- run docs:generate after API change
- do not duplicate docs vs generated

---

## 8. CROSS-REPO RULES

If touching:

- editor behavior → din-studio
- runtime → din-core

---

## 9. DOCUMENTATION FRESHNESS

After API change:

- npm run docs:generate
- verify output
- update summaries if needed

---

## 10. FAILURE STRATEGY

If unclear:

- do NOT expand context blindly
- assume minimal scope
- avoid cross-repo changes