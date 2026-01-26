# Context7 Integration Guide for Cesium

## Overview

Context7 is an MCP (Model Context Protocol) server that provides real-time access to up-to-date library documentation and code examples directly to AI coding assistants. It retrieves current documentation from source repositories instead of relying on potentially outdated LLM training data.

**Repository**: https://github.com/upstash/context7

## Why Context7 for Cesium Development

AI assistants often hallucinate non-existent APIs, incorrect parameters, and obsolete patterns when working with Cesium due to outdated training data. Context7 solves this by fetching current, version-specific documentation in real-time.

## Already Indexed Documentation/Website

The following Cesium-related documentation sources are available through Context7:

| Documentation              | Original                                                                 | Context7                                                                   | Context7 Library ID               |
| -------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------- |
| **CesiumJS API Reference** | [CesiumJS API](https://cesium.com/learn/cesiumjs/ref-doc/)               | [Context7 CesiumJS](https://context7.com/websites/cesium_learn_cesiumjs)   | `/websites/cesium_learn_cesiumjs` |
| **Cesium Repository**      | [GitHub cesium](https://github.com/cesiumgs/cesium)                      | [Context7 cesium](https://context7.com/cesiumgs/cesium)                    | `/cesiumgs/cesium`                |
| **Cesium for Unreal**      | [GitHub cesium-unreal](https://github.com/cesiumgs/cesium-unreal)        | [Context7 cesium-unreal](https://context7.com/cesiumgs/cesium-unreal)      | `/cesiumgs/cesium-unreal`         |
| **Cesium for Unity**       | [GitHub cesium-unity](https://github.com/cesiumgs/cesium-unity)          | [Context7 cesium-unity](https://context7.com/cesiumgs/cesium-unity)        | `/cesiumgs/cesium-unity`          |
| **3D Tiles Specification** | [OGC 3D Tiles](https://docs.ogc.org/cs/22-025r4/22-025r4.html)           | [Context7 3D Tiles](https://context7.com/websites/ogc_cs_22-025r4)         | `/websites/ogc_cs_22-025r4`       |

## Setup Instructions

<details>
<summary>VS Code Configuration</summary>

Add to your MCP settings (`.vscode/mcp.json`):

**Remote Server**:

```json
"mcp": {
  "servers": {
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp",
      "headers": {
        "CONTEXT7_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

**Local NPX**:

Use open source [@upstash/context7-mcp](https://www.npmjs.com/package/@upstash/context7-mcp) library.

```json
"mcp": {
  "servers": {
    "context7": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp", "--api-key", "YOUR_API_KEY"]
    }
  }
}
```

</details>

<details>
<summary>Claude Code Configuration</summary>

**Remote Server**:

```bash
claude mcp add --header "CONTEXT7_API_KEY: YOUR_API_KEY" --transport http context7 https://mcp.context7.com/mcp
```

**Local NPX**:

```bash
claude mcp add context7 -- npx -y @upstash/context7-mcp --api-key YOUR_API_KEY
```

</details>

<details>
<summary>Other MCP Clients</summary>

Context7 supports 30+ MCP clients beyond VS Code and Claude Desktop, including Cursor, Zed, Cline, and more. For a complete list of supported clients and their configuration instructions, see the [All MCP Clients documentation](https://context7.com/docs/resources/all-clients).

</details>

## Free Tier Limitations

The Free plan includes access to public repositories, basic access control, and 1,000 API calls per month.

**Get your free API key**: <https://context7.com/dashboard>

## Usage with Cesium

### Basic Usage

Append `use context7` to prompts when you need current Cesium documentation:

```text
Create a Cesium Viewer with Bing Maps imagery. use context7
```

### Library-Specific Queries

Use `/CesiumGS/cesium` as the library ID for direct access:

```text
How do I add a 3D Tileset to a Cesium Viewer? use library /CesiumGS/cesium
```

### Cesium-Specific Examples

#### Example 1: CesiumJS API Reference

```text
Create a Cesium Viewer with terrain enabled and Ion asset access. 
use library /websites/cesium_learn_cesiumjs
```

Expected result: Current `Viewer` constructor with proper terrain configuration and Ion integration.

#### Example 2: Cesium Repository

```text
How do I implement custom post-processing effects in CesiumJS? 
use library /cesiumgs/cesium
```

Expected result: Source code examples and implementation patterns from the Cesium repository.

#### Example 3: Cesium for Unreal

```text
Set up a Cesium3DTileset in Unreal Engine and configure georeference settings. 
use library /cesiumgs/cesium-unreal
```

Expected result: Unreal-specific integration code using ACesium3DTileset and ACesiumGeoreference.

#### Example 4: Cesium for Unity

```text
Add a Cesium3DTileset component to a GameObject and configure camera controls. 
use library /cesiumgs/cesium-unity
```

Expected result: Unity-specific C# code with Cesium3DTileset and CesiumCameraController components.

#### Example 5: 3D Tiles Specification

```text
Explain the tile refinement strategy for REPLACE and ADD in 3D Tiles 1.1. 
use context7
```

Expected result: Specification-compliant explanation of refinement strategies and schema details.

### Automation with Agent Skills (Recommended)

Agent Skills provide automatic activation based on context, without needing to type "use context7" or manually select instructions.

#### VS Code (GitHub Copilot)

##### Workspace-specific (recommended)

1. Create the skill directory structure: `.github/skills/context7`

2. Copy the skill content from [context7.SKILL.md](context7.SKILL.md) to `.github/skills/context7/SKILL.md`

3. Enable the `chat.useAgentSkills` setting in VS Code

The skill will automatically activate when you ask Cesium-related questions and can be invoked directly with `/context7`.

##### User profile (all workspaces)

To use Context7 across all your projects:

1. Copy the skill to `~/.copilot/skills/context7/SKILL.md`
2. The skill will be available in all workspaces

See [VS Code Agent Skills documentation](https://code.visualstudio.com/docs/copilot/customization/agent-skills) for details.

#### Claude Code

##### Workspace-specific (recommended)

1. Create the skill directory `.claude/skills/context7`

2. Copy the skill content from [context7.SKILL.md](context7.SKILL.md) to `.claude/skills/context7/SKILL.md`

The skill will automatically activate when relevant or can be invoked with `/context7`.

##### Personal (all projects)

Copy the skill to `~/.claude/skills/context7/SKILL.md` for availability across all projects.

See [Claude Code Skills documentation](https://code.claude.com/docs/en/skills) for details.

#### Alternative: Custom Instructions

For AI assistants that don't support Agent Skills, use custom instructions or predefined prompts instead.

## Context7 Available Tools

Context7 exposes two MCP tools:

### 1. `resolve-library-id`

Search for libraries and retrieve their Context7 library IDs.

**Parameters**:

- `libraryName` (string): Name of the library to search
- `query` (string, optional): Additional search context

**Example**:

```text
Find the Context7 library ID for CesiumJS
```

### 2. `query-docs`

Retrieve documentation for a specific library and query.

**Parameters**:

- `libraryId` (string): Context7 library ID (e.g., `/CesiumGS/cesium`)
- `query` (string): Documentation query or topic
- `version` (string, optional): Specific library version

**Example**:

```text
Get documentation for Cesium Viewer initialization using library /CesiumGS/cesium
```

## Resources

- **Context7 Documentation**: https://context7.com/docs
- **GitHub Repository**: https://github.com/upstash/context7
- **Dashboard**: https://context7.com/dashboard
- **Cesium API Reference**: https://cesium.com/learn/cesiumjs/ref-doc/
- **Cesium Forum**: https://community.cesium.com/
