import { useEffect } from "react";
import { CompositeProvider, useCompositeStore } from "@ariakit/react";
import { StoreContext, useGalleryItemStore } from "./GalleryItemStore.ts";

type GalleryItemListProviderProps = {
  children: React.ReactNode;
};

/**
 * Provider component for the gallery item store context.
 * @see https://react.dev/learn/passing-data-deeply-with-context
 * @param {GalleryItemListProviderProps} props
 */
export function GalleryItemListProvider({
  children,
}: GalleryItemListProviderProps) {
  const composite = useCompositeStore();
  let store = useGalleryItemStore();

  useEffect(() => {
    const { isPending, fetchItems } = store;
    if (isPending) {
      return;
    }

    fetchItems();
  }, [store?.items]);

  return (
    <StoreContext value={store}>
      <CompositeProvider store={composite}>{children}</CompositeProvider>
    </StoreContext>
  );
}

export default GalleryItemListProvider;
