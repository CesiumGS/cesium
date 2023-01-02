import struct

# Blender generated faces with this set of indices. Notice
# that the indices for each face form a pattern:
#
# a b c
# a d b
#
# c---b
# | / |
# a---d
ORIGINAL_INDICES = [
    0, 1, 2,
    0, 3, 1,
    4, 5, 6,
    4, 7, 5,
    8, 9, 10,
    8, 11, 9,
    12, 13, 14,
    12, 15, 13,
    16, 17, 18,
    16, 19, 17,
    20, 21, 22,
    20, 23, 21
]

# Two triangles
INDICES_PER_QUAD = 6

def compute_edge_indices():
    edges = b''
    quads = len(ORIGINAL_INDICES) //  INDICES_PER_QUAD
    for i in range(quads):
        # Continuing from the comment for ORIGINAL_INDICES, we only want to
        # outline the outside edges, like so:
        #
        # c---b
        # |   |
        # a---d
        start_index = INDICES_PER_QUAD * i
        end_index = start_index + INDICES_PER_QUAD
        a, b, c, _, d, _ = ORIGINAL_INDICES[start_index:end_index]
        quad_edges = [
            a, d,
            d, b,
            b, c,
            c, a
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
