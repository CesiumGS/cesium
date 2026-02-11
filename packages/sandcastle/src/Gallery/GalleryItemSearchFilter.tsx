import { useCallback, useDeferredValue, useMemo } from "react";
import { Icon } from "@stratakit/foundations";
import { Divider, Label } from "@stratakit/bricks";
import { DropdownMenu, Chip } from "@stratakit/structures";
import { filter } from "../icons.ts";

import { useGalleryItemContext } from "./GalleryItemStore.ts";

export default function GalleryItemSearchFilter() {
  const store = useGalleryItemContext();
  const { filters, defaultSearchFilter, searchFilter, setSearchFilter } =
    store ?? {};

  const memoizedFilters = useMemo(() => {
    if (!filters) {
      return {
        types: [],
      };
    }

    const types = Object.keys(filters);
    const entries = types.map((type) => [
      type,
      {
        values: Object.keys(filters[type]),
        ...filters[type],
      },
    ]);
    return {
      ...Object.fromEntries(entries),
      types,
    };
  }, [filters]);

  const checked = useCallback(
    (type: string, label: string) => searchFilter?.[type] === label,
    [searchFilter],
  );
  const deferredCheck = useDeferredValue(checked);

  const onChange = useCallback(
    (type: string, label: string) => {
      if (!setSearchFilter) {
        return () => {};
      }

      return () =>
        setSearchFilter(
          deferredCheck(type, label)
            ? null
            : {
                [type]: label,
              },
        );
    },
    [setSearchFilter, deferredCheck],
  );
  const deferredOnChange = useDeferredValue(onChange);

  const renderFilter = useCallback(
    (type: string) => {
      if (!defaultSearchFilter || !setSearchFilter) {
        return;
      }

      const defaultFilters = defaultSearchFilter?.[type] ?? [];

      const renderOption = (label: string) =>
        label && (
          <DropdownMenu.CheckboxItem
            className="filter-menu-item"
            checked={deferredCheck(type, label)}
            onChange={deferredOnChange(type, label)}
            icon={
              <Chip
                className="filter-menu-item-chip"
                label={memoizedFilters[type][label]}
              />
            }
            key={label}
            name={label}
            value={label}
            label={label}
          />
        );

      let defaults = defaultFilters;
      if (!Array.isArray(defaultFilters)) {
        defaults = [defaultFilters];
      }

      const values = memoizedFilters[type].values ?? [];
      const labels = values.filter(
        (label: string) => !defaults.includes(label),
      );

      const options = [...defaults, ...labels];

      return (
        <DropdownMenu.Provider key={type}>
          <DropdownMenu.Button
            id={type}
            className="filter-menu-button"
            disabled={memoizedFilters[type].length === 0}
          >
            <Icon href={filter}></Icon> {type}
          </DropdownMenu.Button>
          <DropdownMenu.Content className="filter-menu">
            <Label htmlFor={type}>Filter by {type}</Label>
            <Divider />
            {options.map(renderOption)}
          </DropdownMenu.Content>
        </DropdownMenu.Provider>
      );
    },
    [
      deferredCheck,
      defaultSearchFilter,
      memoizedFilters,
      deferredOnChange,
      setSearchFilter,
    ],
  );

  return <>{memoizedFilters.types.map(renderFilter)}</>;
}
