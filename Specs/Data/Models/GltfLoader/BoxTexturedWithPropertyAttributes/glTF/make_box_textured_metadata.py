import numpy

VERTEX_COUNT = 24
SCALE_OPTIONS = [0.25, 0.5, 1.0, 2.0, 4.0]
ROW_STRIDE = 2
ROWS_PER_MATRIX = 2
COLUMNS_PER_MATRIX = 4

# make the random numbers reproducible
RNG = numpy.random.RandomState(2022)

def make_scale(scale_factor):
    # uniform scales are the same whether row or column
    # major
    return numpy.array(
        [
            [scale_factor, 0.0],
            [0.0, scale_factor]
        ], 
        dtype=numpy.float32
    )

def set_mat2(big_matrix, vertex_id, matrix):
    start_row = vertex_id * 2
    end_row = start_row + 2
    big_matrix[start_row:end_row, 0:2] = matrix

def make_warp_matrices():
    buffer_view = numpy.zeros(
        (ROWS_PER_MATRIX * VERTEX_COUNT, COLUMNS_PER_MATRIX),
        dtype=numpy.float32
    )

    for i in range(VERTEX_COUNT):
        scale_factor = SCALE_OPTIONS[i % len(SCALE_OPTIONS)]
        scale_matrix = make_scale(scale_factor)
        set_mat2(buffer_view, i, scale_matrix)
    
    print(buffer_view.shape)

    # The individual matrices are stored column-major, but
    # the overall bufferView should be exported row-by-row
    # for reference, order='C' is C-style (row major), 
    # order='F' is Fortran style (column major). Go figure :shrug:.
    return buffer_view.tobytes(order='C')

def make_temperature_vectors():
    # this property will be scaled into the proper range
    # via offset/scale. So let's just pick random UINT16 values
    buffer_view = RNG.randint(
        low=0,
        high=(1 << 16) - 1,
        size=(VERTEX_COUNT, 2),
        dtype=numpy.uint16
    )

    return buffer_view.tobytes(order='C')


def main():
    warp_matrices_bin = make_warp_matrices()
    warp_matrices_len = len(warp_matrices_bin)
    print("Warp Matrices")
    print("offset:", 0)
    print("length:", warp_matrices_len)

    temperatures_bin = make_temperature_vectors()
    temperatures_len = len(temperatures_bin)
    print("\nTemperatures")
    print("offset:", len(warp_matrices_bin))
    print("length:", temperatures_len)

    total_len = warp_matrices_len + temperatures_len
    print("\nTotal length:", total_len)

    with open("metadata.bin", "wb") as f:
        f.write(warp_matrices_bin)
        f.write(temperatures_bin)

if __name__ == "__main__":
    main()
