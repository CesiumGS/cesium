import struct


# Blender exported the vertices like this
#
# a b c
# a c d
# 
# c---b
# | \ |
# d---a
ORIGINAL_INDICES = [
    0, 4, 6,
    0, 6, 2,
    3, 2, 6,
    3, 6, 7,
    7, 6, 4,
    7, 4, 5,
    5, 1, 3,
    5, 3, 7,
    1, 0, 2,
    1, 2, 3,
    5, 4, 0,
    5, 0, 1
]

# Two triangles
INDICES_PER_QUAD = 6

def compute_edge_indices():
    edges = b''
    quads = len(ORIGINAL_INDICES) // INDICES_PER_QUAD
    for i in range(quads):
        # Continuing from the comment for ORIGINAL_INDICES, we only want to
        # outline the outside edges, like so:
        #
        # c---b
        # |   |
        # d---a
        start_index = INDICES_PER_QUAD * i
        end_index = start_index + INDICES_PER_QUAD
        a, b, c, _, _, d = ORIGINAL_INDICES[start_index:end_index]
        quad_edges = [
            a, b,
            b, c,
            c, d,
            d, a
        ]
        # pack the edge indices as uint16 values. The spec for
        # CESIUM_primtive_outline allows only 16- and 32-bit indices.
        edges_binary = struct.pack("<HHHHHHHH", *quad_edges)
        edges += edges_binary
    return edges

def main():
    edges_binary = compute_edge_indices()
    with open("outlines.bin", "wb") as f:
        f.write(edges_binary)

if __name__ == "__main__":
    main()
