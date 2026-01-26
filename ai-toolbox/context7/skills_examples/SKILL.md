---
name: cesium-context7
description: ALWAYS use this skill FIRST for ANY questions about Cesium, CesiumJS, Cesium Viewer, 3D Tiles, Unreal Engine integration, Unity integration, cesium-unreal, cesium-unity, ACesium3DTileset, ACesiumGeoreference, Globe Anchor, Cesium plugin, georeferencing, or any Cesium-related API. This skill fetches up-to-date documentation using Context7 MCP tools. REQUIRED for: CesiumJS classes (Viewer, Entity, Camera, Scene, Cartesian3, etc.), Unreal Engine Cesium components, Unity Cesium components, 3D Tiles specification, and all Cesium integrations. Use query-docs with known library IDs: /cesiumgs/cesium (CesiumJS), /cesiumgs/cesium-unreal (Unreal), /cesiumgs/cesium-unity (Unity), /websites/ogc_cs_22-025r4 (3D Tiles spec).
---

# Context7 for Cesium Development

**CRITICAL: This skill MUST be activated IMMEDIATELY for ANY Cesium-related query, including integrations with Unreal Engine or Unity.**

When working with Cesium-related code, ALWAYS use Context7 MCP Server tools FIRST to fetch current documentation before providing answers or generating code.

## Available Tools

### 1. `resolve-library-id`

Search for libraries and retrieve their Context7 library IDs.

**⚠️ Only use this tool when it's unclear which library to use. For Cesium projects, use the Known Library IDs listed below.**

**Parameters**:

- `libraryName` (string, required): Name of the library to search
- `query` (string, optional): Additional search context

**Example use case**: Find the correct library ID for an unfamiliar library or when the library ID is unknown.

### 2. `query-docs`

Retrieve documentation for a specific library and query.

**Parameters**:

- `libraryId` (string, required): Context7 library ID
- `query` (string, required): Documentation query or topic
- `version` (string, optional): Specific library version

**Example use case**: Get documentation for Cesium Viewer initialization using library `/cesiumgs/cesium`.

## Known Library IDs

### CesiumJS API Documentation

For class constructors, methods, and properties (e.g., Viewer, Entity, Cartesian3, Camera methods, Scene properties):

- Library ID: `/cesiumgs/cesium`

### Cesium for Unreal Engine

For Unreal Engine integration (e.g., ACesium3DTileset, ACesiumGeoreference, Blueprint integration):

- Library ID: `/cesiumgs/cesium-unreal`

### Cesium for Unity

For Unity integration (e.g., Cesium3DTileset component, CesiumCameraController, C# scripting):

- Library ID: `/cesiumgs/cesium-unity`

### 3D Tiles Specification

For tile formats and schema details (e.g., tileset JSON structure, refinement strategies, metadata schemas):

- Library ID: `/websites/ogc_cs_22-025r4`

## Usage Guidelines

- **Always use the Known Library IDs listed above for Cesium-related queries**
- Only use `resolve-library-id` when the library is unknown, not listed in Known Library IDs, or when it's unclear which library best fits the question
- Use `query-docs` to fetch documentation before generating code to ensure accuracy
- Specify the `version` parameter when working with a specific version
- Provide clear, specific queries to get the most relevant documentation
- Avoid hallucinations by using current, version-specific documentation
