// A small stage written for the spike: a sublayer, an external reference, a
// payload, a variant set with a selection, an internal inherit, both label
// schemas and a UsdPreviewSurface material. It checks the composer against
// answers worked out by hand. CS-559's fixture can start from it. Spike code
// for CS-833 and CS-843; not part of @cesium/next.

export const FIXTURE: Record<string, string> = {
  "fixture/root.usda": `#usda 1.0
(
    defaultPrim = "World"
    metersPerUnit = 1
    upAxis = "Z"
    subLayers = [@./overrides.usda@]
)

class "_wheel"
{
    token[] semantics:labels:class = ["wheel"]
}

def Xform "World" (
    kind = "assembly"
)
{
    def "Cart" (
        prepend apiSchemas = ["SemanticsLabelsAPI:class"]
        prepend references = @./cart.usda@
        variants = {
            string color = "red"
        }
        prepend variantSets = "color"
    )
    {
        token[] semantics:labels:class = ["cart"]
        double3 xformOp:translate = (10, 0, 0)
        uniform token[] xformOpOrder = ["xformOp:translate"]

        variantSet "color" = {
            "blue" {
                over "Body" { color3f[] primvars:displayColor = [(0, 0, 1)] }
            }
            "red" {
                over "Body" { color3f[] primvars:displayColor = [(1, 0, 0)] }
            }
        }
    }
}
`,
  "fixture/overrides.usda": `#usda 1.0
over "World"
{
    over "Cart"
    {
        over "Wheel" (
            prepend inherits = </_wheel>
        )
        {
        }
    }
}
`,
  "fixture/cart.usda": `#usda 1.0
(
    defaultPrim = "Cart"
    metersPerUnit = 1
    upAxis = "Z"
)

def Xform "Cart"
{
    def Mesh "Body" (
        prepend apiSchemas = ["MaterialBindingAPI", "SemanticsAPI:Semantics"]
    )
    {
        int[] faceVertexCounts = [4, 4]
        int[] faceVertexIndices = [0, 1, 2, 3, 4, 5, 6, 7]
        point3f[] points = [(0, 0, 0), (2, 0, 0), (2, 1, 0), (0, 1, 0), (0, 0, 1), (2, 0, 1), (2, 1, 1), (0, 1, 1)]
        normal3f[] primvars:normals = [(0, 0, 1), (0, 0, 1)] (interpolation = "uniform")
        uniform token subdivisionScheme = "none"
        rel material:binding = </Cart/Looks/Paint>
        string semantic:Semantics:params:semanticData = "cart_body"
        string semantic:Semantics:params:semanticType = "class"
    }

    def Xform "Wheel" (
        prepend payload = @./wheel.usda@</Wheel>
    )
    {
    }

    def Scope "Looks"
    {
        def Material "Paint"
        {
            token outputs:surface.connect = </Cart/Looks/Paint/Surface.outputs:surface>
            token outputs:mdl:surface.connect = </Cart/Looks/Paint/Mdl.outputs:out>

            def Shader "Surface"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor = (0.8, 0.1, 0.1)
                token outputs:surface
            }

            def Shader "Mdl"
            {
                uniform token info:implementationSource = "sourceAsset"
                uniform asset info:mdl:sourceAsset = @OmniPBR.mdl@
                uniform token info:mdl:sourceAsset:subIdentifier = "OmniPBR"
                token outputs:out
            }
        }
    }
}
`,
  "fixture/wheel.usda": `#usda 1.0
(
    metersPerUnit = 1
    upAxis = "Z"
)

def Xform "Wheel"
{
    def Cylinder "Tire"
    {
        double radius = 0.5
    }
}
`,
};

/** Hand-worked answers for the fixture. */
export const EXPECTED = {
  /**
   * Composed prim paths, in order. Pcp orders children from the weakest
   * opinion first and appends names stronger ones add, so the sublayer's
   * "World" comes before the root layer's "_wheel".
   */
  prims: [
    "/World",
    "/World/Cart",
    "/World/Cart/Body",
    "/World/Cart/Wheel",
    "/World/Cart/Wheel/Tire",
    "/World/Cart/Looks",
    "/World/Cart/Looks/Paint",
    "/World/Cart/Looks/Paint/Surface",
    "/World/Cart/Looks/Paint/Mdl",
    "/_wheel",
  ],
  /** The red variant's color wins over nothing; the reference lands at /World/Cart. */
  bodyColor: [1, 0, 0],
  bodyBinding: "/World/Cart/Looks/Paint",
  wheelLabels: ["wheel"],
  cartLabels: ["cart"],
};
