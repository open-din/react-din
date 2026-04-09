# SUMMARY

## PURPOSE

Public `@open-din/react` library and published patch schema for declarative audio graphs.

## OWNS

- Public React components, hooks, and package exports
- `schemas/patch.schema.json`
- `project/COVERAGE_MANIFEST.json`
- Docs/components coverage for exported surface

## DOES NOT OWN

- Rust runtime, registry, compiler, or migration semantics
- Editor workflows, shell UX, or MCP behavior
- Workspace routing and automation

## USE WHEN

- The task changes a public component, export, schema, patch helper, docs/components file, or coverage row.

## DO NOT USE WHEN

- The task is runtime or registry work -> `din-core`
- The task is editor, shell, MCP, or launcher work -> `din-studio`
- The task is control-plane or routing work -> `din-agents`

## RELATED REPOS

- `din-core` mirrors the public patch contract
- `din-studio` consumes library exports and patch types
- `din-agents` routes requests and quality gates
