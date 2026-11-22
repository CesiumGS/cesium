# Cesium IR's JSON form: `cesium-ir/1.0`

This is the normative interchange form of a Cesium IR program (the overall plan for Cesium IR, decision 2). The writer and the checking reader are in `json.ts`. The shape is `cesium-ir-1.0.schema.json`. The extension ops are listed in `extensions.json`.

## The file

```json
{
  "format": "cesium-ir/1.0",
  "vocabulary": "KHR_interactivity",
  "extensions": [],
  "inputs": [{ "name": "x", "type": "float", "rate": "vertex" }],
  "equations": [
    { "op": "input", "type": "float", "index": 0 },
    { "op": "const", "type": "float", "value": 2 },
    { "op": "math/mul", "args": [0, 1], "type": "float" }
  ],
  "outputs": [{ "name": "y", "id": 2 }]
}
```

- **`format`:** `cesium-ir/<major>.<minor>`.
- **`vocabulary`:** the name of the op vocabulary. It is `KHR_interactivity`: its math and type nodes, with its meanings, float64 included.
- **`extensions`:** the `cesium/` extension ops the equations use, sorted. Empty in 1.0.
- **`inputs`:** each has a name, a type (`bool`, `int`, `float`, `float2`, `float3`, `float4`) and a rate (`uniform`, `feature`, `vertex`, `fragment`).
- **`equations`:** in dependency order. An equation's number is its place in the list. Each has an `op` and a `type`:
  - `input` has the `index` of an input, and no operands;
  - `const` has a `value`: a structural constant, folded freely;
  - `literal` has a `value` and a `slot`, its place in the source: an editable literal, never folded, hoisted to a uniform later;
  - every other op has `args`, the numbers of earlier equations, and `index` for `math/extract2`, `math/extract3` and `math/extract4` only.
- **`outputs`:** a name and the number of an equation.

Numbers are JSON numbers. JSON has no `-0`, `NaN` or infinities, so a value holding one writes it as text: `"-0"`, `"NaN"`, `"Infinity"`, `"-Infinity"`. A float2 to float4 value is a list of 2 to 4 of these. The sign of zero is part of a program's shape key, so it survives.

The program's shape key (`shapeKey`) is the same before the writer and after the reader. Literal values survive too.

## What the checking reader refuses

The schema checks the file's shape. The reader checks the rest, and its errors name the equation and the reason: `cesium-ir: equation 2 (math/add): declared float2, but its operands give float`.

- An unknown major version.
- A vocabulary other than `KHR_interactivity`.
- An op outside the vocabulary that isn't a `cesium/` extension, and an extension op that isn't listed in `extensions`.
- An extension this reader doesn't know.
- An operand that doesn't refer to an earlier equation (a forward reference, or the equation itself).
- A declared type that differs from the one the reader re-derives from the operands (from the value for a constant, from the input for an input).
- An operand count or type an op doesn't take, an input index out of range, a repeated input name or literal slot, an output that refers to no equation.
- Fields the version doesn't have (see the next section for newer minor versions).

## Versioning

A version is `cesium-ir/<major>.<minor>`. A reader has its own version, and the rules decide what it reads.

- **A minor version adds ops or optional fields.** It never changes what anything already in the format means. Because added fields are optional, ignoring one leaves a program that means what it did.
- **A major version changes a meaning.** A reader reads exactly its own major version. It refuses any other, older or newer, naming the major version of the file and its own: `unknown major version 2 (format 'cesium-ir/2.0'); this reader reads major version 1`. Nothing is guessed.
- **How an older reader reads a newer minor.** A file of a newer minor version than the reader's is read by what the reader knows:
  - it ignores fields it doesn't know, which are optional by the rule above;
  - it refuses an op it doesn't know, naming the op and the equation, and an extension it doesn't know, naming it. A file that uses only what the older reader knows reads the same in both;
  - it still checks everything above: order, types, names.
- **A file of the reader's own minor or older is read strictly:** an unknown field is an error, which catches a misspelled one.
- **What a writer writes.** A writer writes the lowest minor version that covers what the program uses, so a program of 1.0's ops is a 1.0 file whatever the writer's own version. The writer in this build writes only 1.0.
- **The program's version in memory** is the version of the structure: `IR_VERSION`. A program read from a file of a newer minor has the reader's.
- **Schemas** are one file per minor version, `cesium-ir-<major>.<minor>.schema.json`, and a released schema never changes. The schema of a minor version also validates the files of the minors before it. 1.0's schema has `additionalProperties: false`, so a 1.1 file that uses a new field doesn't validate against it; the reader still reads it.

### The extension registry

Each `cesium/` extension op is a named, versioned entry in the registry file, `extensions.json`, as Substrait's function extensions are:

- **The name** starts `cesium/`.
- **`since`** is the format version that added it.
- **An op's meaning never changes after release.** A change is a new op under a new name.
- **The type rule** of each entry is in `extensions.ts` (`EXTENSIONS`), so the reader can re-derive an extension op's type. A name in the registry file with no entry there is a mistake, and a test says so.

The writer lists in `extensions` each extension op the program uses. A file that uses an op without listing it is refused.

1.0 has no extension ops. CS-56 adds the first ones (`cesium/search`, `cesium/tableGet`) in a minor version, together with the optional `tables` field of that file.

## For the work that follows

- **CS-56 (tables):** add the ops to `extensions.json` and `EXTENSIONS` with their type rules, then a schema `cesium-ir-1.1.schema.json` with the optional `tables` field and the op's branch in `equation`. `programToDocument` should then write `1.1` only for a program that uses them; this build always writes 1.0.
- **CS-59 (KHR graph JSON):** reads and writes `Program`, so it goes through the same structure. It can take this form as its reference for what survives a round trip: the shape key and the literal values, signs of zero included.
- **CS-54 (routes on both emitters):** nothing here changes the emitters. Programs it builds are written and read as any other, so new ops it adds to the vocabulary need a line in `ops.ts` and in the schema's op lists (a test compares the two), and a new vocabulary op is a new minor version.
- **A new op or type** in `src/ir` has to be added to the schema's lists too. `test/irJson.test.ts` fails, naming the difference, when `OPS` and the schema disagree.
