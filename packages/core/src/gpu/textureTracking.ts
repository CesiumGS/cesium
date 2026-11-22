/**
 * Which textures the engine destroyed, and which texture each view is of,
 * on the engine's own device: `createTexture` there returns textures whose
 * `destroy` is recorded and whose views remember their texture. WebGPU
 * can't say whether a texture is destroyed, and a bind group naming one
 * fails every submit it's in (the whole frame draws nothing); with this a
 * world finds the bind groups a destroyed texture breaks before it
 * submits, and skips or rebinds them (World.onTextureDestroyed). Instance
 * properties on this device's objects only: nothing global is patched.
 */
const destroyed = new WeakSet<GPUTexture>();
const textureOfView = new WeakMap<GPUTextureView, GPUTexture>();
const listeners = new Set<(texture: GPUTexture) => void>();
const tracked = new WeakSet<GPUDevice>();

export function trackTextures(device: GPUDevice): void {
  if (tracked.has(device)) {
    return;
  }
  tracked.add(device);
  const createTexture = device.createTexture.bind(device);
  device.createTexture = (descriptor: GPUTextureDescriptor) => {
    const texture = createTexture(descriptor);
    const createView = texture.createView.bind(texture);
    texture.createView = (view?: GPUTextureViewDescriptor) => {
      const created = createView(view);
      textureOfView.set(created, texture);
      return created;
    };
    const destroy = texture.destroy.bind(texture);
    texture.destroy = () => {
      if (!destroyed.has(texture)) {
        destroyed.add(texture);
        for (const listener of listeners) {
          listener(texture);
        }
      }
      destroy();
    };
    return texture;
  };
}

/** The texture a view (made on a tracked device) is of. */
export function textureOf(view: GPUTextureView): GPUTexture | undefined {
  return textureOfView.get(view);
}

/** Whether the engine destroyed the texture. */
export function isDestroyed(texture: GPUTexture): boolean {
  return destroyed.has(texture);
}

/** Hears each tracked texture as it is destroyed; returns the unsubscribe. */
export function onTextureDestroyed(
  listener: (texture: GPUTexture) => void,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
