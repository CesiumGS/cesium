import defined from "../Core/defined.js";
import Cesium3DTileContentFactory from "./Cesium3DTileContentFactory.js";
import findContentMetadata from "./findContentMetadata.js";
import findGroupMetadata from "./findGroupMetadata.js";
import Cesium3DContentGroup from "./Cesium3DContentGroup.js";

/**
 * Finalize the creation of a <code>Cesium3DTileContent</code> object.
 *
 * This takes the information from the tile and the preprocessed content
 * data that was fetched from the resource, creates the proper
 * <code>Cesium3DTileContent</code> instance, and assigns the
 * content- and group metadata to it.
 *
 * @function
 *
 * @param {Cesium3DTile} tile The tile that contained the content
 * @param {Resource} resource The resource
 * @param {PreprocessedContent} preprocessed The return value of <code>preprocess3DTileContent</code>
 * @param {object} contentHeader the JSON header for a {@link Cesium3DTileContent}
 * @param {number} index The content index. This is 0 for a single content, or the index of the inner content for multiple contents.
 * @return {Cesium3DTileContent} The finished <code>Cesium3DTileContent</code>
 * @private
 */
async function finishContent(
  tile,
  resource,
  preprocessed,
  contentHeader,
  index,
) {
  const tileset = tile._tileset;
  const contentFactory = Cesium3DTileContentFactory[preprocessed.contentType];
  let content;
  if (defined(preprocessed.binaryPayload)) {
    content = await Promise.resolve(
      contentFactory(
        tileset,
        tile,
        resource,
        preprocessed.binaryPayload.buffer,
        0,
      ),
    );
  } else {
    // JSON formats
    content = await Promise.resolve(
      contentFactory(tileset, tile, resource, preprocessed.jsonPayload),
    );
  }

  if (tile.hasImplicitContentMetadata) {
    const subtree = tile.implicitSubtree;
    const coordinates = tile.implicitCoordinates;
    content.metadata = subtree.getContentMetadataView(coordinates, index);
  } else if (!tile.hasImplicitContent) {
    content.metadata = findContentMetadata(tileset, contentHeader);
  }

  const groupMetadata = findGroupMetadata(tileset, contentHeader);
  if (defined(groupMetadata)) {
    content.group = new Cesium3DContentGroup({
      metadata: groupMetadata,
    });
  }
  return content;
}
export default finishContent;
