import { type GalleryItem } from "../Gallery/GalleryItemStore.ts";

type PagefindAnchor = PagefindSearchFragment["sub_results"][number]["anchor"];

export default function applyHighlight(
  text: String,
  anchor: PagefindAnchor,
  locations: number[],
) {
  const tokens = text.split(" ");
  const anchorLocation = anchor?.location ?? 0;
  const offset = (!anchor || anchor.text === text) ? 0 : anchor.text?.split(" ").length ?? 0;
  const indices = locations.map((i) => i - anchorLocation - offset); // get index relative to the anchor location and referenced text
  return (
    <>
      {tokens.map((token, index) => {
        if (indices.includes(index)) {
          return (
            <>
              <mark key={index}>{token}</mark>&#32;
            </>
          );
        }
        return <span key={index}>{token}&#32;</span>;
      })}
    </>
  );
}

export function applyHighlightToItem(
  item: GalleryItem,
  result: PagefindSearchFragment,
) {
  const { sub_results: subresults } = result;

  let title = <>{item.title}</>;
  const titleMatches = subresults.filter(
    ({ anchor }) => anchor && anchor.id === "title",
  );
  for (const { anchor, locations } of titleMatches) {
    title = applyHighlight(item.title, anchor, locations);
  }

  let description = <>{item.description}</>;
  const descriptionMatches = subresults.filter(
    ({ anchor }) => anchor && anchor.id === "description",
  );
  for (const { anchor, locations } of descriptionMatches) {
    description = applyHighlight(item.description, anchor, locations);
  }

  let codeExerpts = subresults
    .filter(({ anchor }) => anchor && anchor.id === "code")
    .map(({ excerpt }, index) => (
      <code
        key={index}
        data-kiwi-text-variant="mono-sm"
        dangerouslySetInnerHTML={{ __html: excerpt }}
      ></code>
    ));

  return { ...item, title, description, codeExerpts };
}
