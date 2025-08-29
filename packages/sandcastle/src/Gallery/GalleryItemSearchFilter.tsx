import { useMemo } from "react";
import { Icon } from "@stratakit/foundations";
import { Divider, Label } from "@stratakit/bricks";
import { DropdownMenu, Chip } from "@stratakit/structures";
import { filter } from "../icons.ts";

import { useGalleryItemContext } from "./GalleryItemStore.ts";

export default function GalleryItemSearchFilter() {
  const store = useGalleryItemContext();
  const isPending = !store || store.isPending;

  const filters = useMemo(() => {
    const filters = store?.filters ?? {};
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
  }, [store?.filters]);

  const renderFilter = (type: string) => {
    if (!store) {
      return;
    }

    const { defaultSearchFilter, searchFilter, search } = store;
    const defaultFilters = defaultSearchFilter?.[type] ?? [];
    const filtered = searchFilter?.[type];
    const checked = (label: string) => filtered === label;

    const onChange = (label: string) => () => {
      search(
        checked(label)
          ? { filters: null }
          : {
              filters: {
                [type]: label,
              },
            },
      );
    };

    const renderOption = (label: string) =>
      label && (
        <DropdownMenu.CheckboxItem
          className="filter-menu-item"
          checked={checked(label)}
          onChange={onChange(label)}
          icon={
            <Chip
              className="filter-menu-item-chip"
              label={filters[type][label]}
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

    const values = filters[type].values ?? [];
    const labels = values.filter((label: string) => !defaults.includes(label));

    const options = [...defaults, ...labels];

    return (
      <DropdownMenu.Root key={type}>
        <DropdownMenu.Button
          id={type}
          className="filter-menu-button"
          disabled={isPending}
        >
          <Icon href={filter}></Icon> {type}
        </DropdownMenu.Button>
        <DropdownMenu.Content className="filter-menu">
          <Label htmlFor={type}>Filter by {type}</Label>
          <Divider />
          {options.map(renderOption)}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    );
  };

  return <>{filters.types.map(renderFilter)}</>;
}
