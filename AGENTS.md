# AGENTS — react-din (HOT + HOOKS)

## CORE RULE
Load MINIMUM context. Use hooks. Do NOT load deep context unless required.

---

## 1. SCOPE

react-din owns:

- public API (@open-din/react)
- patch schema
- component library
- patch helpers (midi, data, effects)

It is the SOURCE OF TRUTH for JS/TS contract.

---

## 2. ROUTING (FIRST DECISION)

Map task → type:

- "component" → component rules
- "schema / patch" → schema rules
- "API / export" → public API
- "docs" → documentation

If unclear → choose smallest scope

---

## 3. HOOKS (MANDATORY)

### HOOK: COMPONENT_CHANGE
IF task mentions component:

LOAD ONLY:
- project/COVERAGE_MANIFEST.json
- docs/components/** (target file)

REQUIRE:
- docs updated
- ≥1 test
- coverage entry updated

---

### HOOK: SCHEMA_CHANGE
IF task mentions schema / patch:

LOAD ONLY:
- schemas/patch.schema.json

REQUIRE:
- schema updated
- exports preserved (@open-din/react/patch/schema.json)

---

### HOOK: API_CHANGE
IF task mentions export / public API:

LOAD ONLY:
- package exports
- docs/components/** OR docs/generated

REQUIRE:
- docs updated
- coverage updated
- tests updated

---

### HOOK: DOCS
IF missing info:

LOAD (max 2):
1. docs/summaries
2. docs/**
3. docs/generated

STOP when sufficient

---

### HOOK: CROSS_REPO
IF mentions:
editor | runtime | FFI | MCP

STOP → switch:

- din-studio (editor)
- din-core (runtime)

---

## 4. HARD CONSTRAINTS

### Component change MUST update:

- exports
- docs/components/**
- tests
- COVERAGE_MANIFEST.json

---

### Schema change MUST:

- update schemas/patch.schema.json
- preserve public contract

---

### NEVER:

- implement editor logic (din-studio)
- implement runtime logic (din-core)
- break public API without updating docs + coverage

---

## 5. EXECUTION LOOP

1. Detect hook
2. Load ONLY required files
3. Apply minimal change
4. Validate

---

## 6. CONTEXT LIMITS

- max 1 repo
- max 2 files
- NEVER scan directories
- NEVER bulk-load docs

If enough → STOP

---

## 7. SELF-OPTIMIZATION

Continuously:

- drop irrelevant context
- ignore unrelated components
- reduce reads
- prefer smallest change

If context grows → compress

---

## 8. LOAD DEEP CONTEXT ONLY IF

- schema ambiguity
- API unclear
- failing validation

---

## 9. VALIDATION

npm run lint  
npm run typecheck  
npm run ci:check  
npm run validate:changes  

(optional) npm run docs:generate