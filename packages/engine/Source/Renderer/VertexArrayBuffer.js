import ComponentDatatype from "../Core/ComponentDatatype.js";
import defined from "../Core/defined.js";
import BufferUsage from "./BufferUsage.js";
import VertexBufferView from "./VertexBufferView.js"

/**
 * TODO
 * @private
 */
function VertexArrayBuffer(byteLength, usage) {
    this.byteLength = byteLength ?? 0;
    
        // TODO: doc
        this.usage = usage ?? BufferUsage.STATIC_DRAW;

        /**
         * TODO: Binary buffer
         * @type {ArrayBuffer|undefined}
         * @private
         */
        this.arrayBuffer = undefined

        /**
         * TODO
         * @type {Array<VertexBufferView>}
         * @private
         */
        this.bufferViews = [];
}

// TODO
VertexArrayBuffer.prototype.createBufferViews = function (attributes) {
    const bufferViews = this.bufferViews;
    bufferViews.length = 0;
    
    let byteOffset = 0;
    const length = attributes.length;
    for (let i = 0; i < length; ++i) {
      const attribute = attributes[i];
      const componentDatatype = attribute.componentDatatype;
      const byteStride = 
        this.byteLength / ComponentDatatype.getSizeInBytes(componentDatatype);
  
      const bufferView = new VertexBufferView(byteOffset, byteStride, attribute.componentDatatype);
      attribute.bufferView = bufferView;
      bufferViews.push(bufferView)
  
      byteOffset +=
        attribute.getElementSizeInBytes();
    }
  
    return bufferViews;
  };

  VertexArrayBuffer.prototype.resize = function (vertexCount) {
    if (this.byteLength > 0) {
      // Create larger array buffer
      const arrayBuffer = new ArrayBuffer(vertexCount * this.byteLength);
  
      // Copy contents from previous array buffer
      if (defined(this.arrayBuffer)) {
        const destView = new Uint8Array(arrayBuffer);
        const sourceView = new Uint8Array(this.arrayBuffer);
        const sourceLength = sourceView.length;
        for (let j = 0; j < sourceLength; ++j) {
          destView[j] = sourceView[j];
        }
      }
  
      // Create new typed views into the new array buffer
      const bufferViews = this.bufferViews;
      const length = bufferViews.length;
      for (let i = 0; i < length; ++i) {
        const bufferView = bufferViews[i];
        bufferView.typedArray = ComponentDatatype.createArrayBufferView(
          bufferView.componentDatatype,
          arrayBuffer,
          bufferView.byteOffset
        );
      }
  
      this.arrayBuffer = arrayBuffer;
    }
  };

export default VertexArrayBuffer;