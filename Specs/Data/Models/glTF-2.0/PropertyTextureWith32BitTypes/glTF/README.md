# Property Texture With 32-Bit Types

This glTF is based off the `SimplePropertyTexture.gltf` [data](https://github.com/CesiumGS/3d-tiles-samples/tree/main/glTF/EXT_structural_metadata/SimplePropertyTexture). It is distilled down to a single property, `insideTemperature`, whose values have been constructed such that the 8-bits from each of the four channels of each pixel
combine to encode the overall 32-bit `insideTemperature` float value. When visualizing the value as brightness, the resulting texture represents a grayscale gradient.

The data was generated using the following python script:

```py
import base64
import numpy as np
from PIL import Image

def float_to_rgba_bytes_array(f_arr):
    f32 = f_arr.astype(np.float32) # f_arr: float32 numpy array shape (H, W)
    f32 = f32.astype('<f4')  # explicit little-endian float32
    bytes_view = f32.view(np.uint8).reshape(f32.shape + (4,))  # shape (H, W, 4)
    # bytes_view[0] is the first byte in memory; little-endian means least significant byte first
    # PNG expects channel order R,G,B,A, so map directly:
    rgba = bytes_view.copy()
    return rgba  # dtype uint8

def create_gradient_png(path, width, height):
    # Horizontal and vertical gradients from 0.0 .. 1.0 combined into one float
    xs = np.linspace(0.0, 1.0, width, dtype=np.float32)
    ys = np.linspace(0.0, 1.0, height, dtype=np.float32)
    row = xs[np.newaxis, :]                 # shape (1, W)
    col = ys[:, np.newaxis]                 # shape (H, 1)
    grid = (row + col) / 2.0                # shape (H, W), values 0..1 blending horizontal+vertical
    rgba = float_to_rgba_bytes_array(grid)
    # Ensure alpha is not premultiplied/modified; bytes already contain the float bits
    img = Image.fromarray(rgba, mode='RGBA')
    img.save(path, format='PNG', optimize=False)
    print(f"Wrote {path}  ({width}x{height})")

    with open(path, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode('ascii')
    data_uri = 'data:image/png;base64,' + b64
    print(data_uri)
    return data_uri

if __name__ == '__main__':
    create_gradient_png('float_rgba_gradient.png', width=256, height=256)
```
