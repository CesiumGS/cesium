export function createRecordHtml({
  id,
  title,
  description,
  image,
  code,
  labels,
}) {
  // Pagefind best indexes content in a hierarchical structure.
  // Heading levels and data-pagefind-weight attributes will factor into the search relevance.
  // Headings with id attributes are helpful for structuring the search subresults for highlighting.
  return `
<html lang="en">
    <body id="${id}" data-pagefind-meta="id:${id}">
        <h1 id="title" data-pagefind-weight="10">${title}</h1>

        <img id="thumbnail" src="${image}" alt="${title} thumbnail" />

        <h2 id="description" 
            data-pagefind-ignore">Description</h2> 
        <p data-pagefind-meta="description" 
            data-pagefind-weight="5">${description}</p>
        
        <h2 id="labels" 
            data-pagefind-weight="0">Labels</h2>
        <ul data-pagefind-ignore>
        ${labels
          .map(
            (label) =>
              `<li data-pagefind-meta="labels" 
                data-pagefind-filter="labels" 
                data-pagefind-weight="2">${label}</li>`,
          )
          .join("\n")}
        </ul>

        <h2 id="code" 
            data-pagefind-weight="0">Code</h2>
        <pre class="language-js">
            <code data-pagefind-meta="code" >
${code}
            </code>
        </pre>
    </body>
</html>`;
}

export function createGalleryRecord(galleryData) {
  return {
    url: `?id=${galleryData.id}`,
    content: createRecordHtml(galleryData),
  };
}

export default createGalleryRecord;
