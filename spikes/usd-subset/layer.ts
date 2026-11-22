// One USD layer as plain data, the same for USDA and USDC: specs by path,
// each with its fields. This is Sdf's data model, cut to what the subset
// reader needs. Spike code for CS-833 and CS-843; not part of @cesium/next.

/** A field value the reader decoded, or a marker for one it didn't. */
export type Value =
  | null
  | boolean
  | number
  | string
  | readonly Value[]
  | { readonly [key: string]: Value }
  | ListOp
  | Arc
  | ArrayValue
  | Undecoded;

/** An array of numbers kept flat: points, indices, UVs. `tuple` is the components per element. */
export interface ArrayValue {
  readonly kind: "array";
  readonly type: string;
  readonly tuple: number;
  readonly data: Float64Array | Float32Array | Int32Array | Uint32Array;
}

/** A value the subset reader doesn't decode, kept by its type name so coverage can count it. */
export interface Undecoded {
  readonly kind: "undecoded";
  readonly type: string;
}

/** A reference or payload arc. An empty asset means the same layer. */
export interface Arc {
  readonly kind: "arc";
  readonly asset: string;
  readonly primPath: string;
}

/** Sdf's list operations: explicit, or edits to what weaker layers say. */
export interface ListOp {
  readonly kind: "listOp";
  readonly explicit?: readonly Value[];
  readonly prepended?: readonly Value[];
  readonly appended?: readonly Value[];
  readonly added?: readonly Value[];
  readonly deleted?: readonly Value[];
  readonly ordered?: readonly Value[];
}

export type SpecType =
  | "pseudoRoot"
  | "prim"
  | "attribute"
  | "relationship"
  | "variantSet"
  | "variant"
  | "other";

export interface Spec {
  readonly type: SpecType;
  readonly fields: Map<string, Value>;
}

export interface Layer {
  readonly format: "usda" | "usdc";
  /** The crate version, for USDC. */
  readonly version?: string;
  /** Specs by path: "/" for the layer, "/World/Mesh", "/World/Mesh.points", "/A{v=x}B". */
  readonly specs: Map<string, Spec>;
  /** Field values the reader saw but didn't decode, by type name, with counts. */
  readonly undecoded: Map<string, number>;
}

/** The items a list op contributes when composed over nothing weaker. */
export function listItems(v: Value | undefined): Value[] {
  if (v === undefined || v === null) {
    return [];
  }
  if (Array.isArray(v)) {
    return [...(v as readonly Value[])];
  }
  if (typeof v === "object" && "kind" in v && v.kind === "listOp") {
    const op = v as ListOp;
    if (op.explicit) {
      return [...op.explicit];
    }
    return [
      ...(op.prepended ?? []),
      ...(op.added ?? []),
      ...(op.appended ?? []),
    ];
  }
  return [v];
}

export function isArc(v: Value): v is Arc {
  return typeof v === "object" && v !== null && "kind" in v && v.kind === "arc";
}

export function isArray(v: Value | undefined): v is ArrayValue {
  return (
    typeof v === "object" && v !== null && "kind" in v && v.kind === "array"
  );
}
