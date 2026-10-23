# NodeVisibilityConditions

A basic test for the `EXT_node_visibility_conditions` extension.

It is a glTF model that defines 4 nodes. Each node has the
`KHR_node_visibility` extension, with the (nested)
`EXT_node_visibility_conditions` extension.

The conditions are named `exampleTimeStamp` and `exampleRevision`.
Their values for the respective nodes are

- Node A:
  - `exampleTimeStamp` : `"2025-09-25"`
  - `exampleRevision` : `"revision0"`

- Node B:
  - `exampleTimeStamp` : `"2025-09-26"`
  - `exampleRevision` : `"revision0"`

- Node C:
  - `exampleTimeStamp` : `"2025-09-25"`
  - `exampleRevision` : `"revision1"`

- Node D:
  - `exampleTimeStamp` : `"2025-09-26"`
  - `exampleRevision` : `"revision1"`
