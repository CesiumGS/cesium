---
name: context7
description: When working with Cesium-related questions or code, use Context7 MCP to fetch current Cesium documentation with appropriate library IDs. Use this skill for CesiumJS API questions, Cesium Viewer, Entity, Cartesian3, Camera methods, Scene properties, 3D Tiles, Unreal Engine integration, or Unity integration.
---

# Context7 for Cesium Development

When working with Cesium-related code, always use #tool:context7 to fetch current documentation with the appropriate library ID:

## CesiumJS API Documentation

For class constructors, methods, and properties (e.g., Viewer, Entity, Cartesian3, Camera methods, Scene properties):

- Use library ID: `/websites/cesium_learn_cesiumjs`

## CesiumJS Source Code

For implementation details, source code patterns, and internal architecture (e.g., custom shaders, post-processing, rendering pipeline, worker implementations):

- Use library ID: `/cesiumgs/cesium`

## Cesium for Unreal Engine

For Unreal Engine integration (e.g., ACesium3DTileset, ACesiumGeoreference, Blueprint integration):

- Use library ID: `/cesiumgs/cesium-unreal`

## Cesium for Unity

For Unity integration (e.g., Cesium3DTileset component, CesiumCameraController, C# scripting):

- Use library ID: `/cesiumgs/cesium-unity`

## 3D Tiles Specification

For tile formats and schema details (e.g., tileset JSON structure, refinement strategies, metadata schemas):

- Use library ID: `/websites/ogc_cs_22-025r4`

## Usage Guidelines

- Always fetch documentation before generating code to ensure accuracy
- Use the appropriate library ID based on the context
- Avoid hallucinations by using current, version-specific documentation
