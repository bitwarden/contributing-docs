import React from "react";
import DropdownNavbarItem from "@theme-original/NavbarItem/DropdownNavbarItem";
import type { Props as DropdownNavbarItemProps } from "@theme/NavbarItem/DropdownNavbarItem";
import type { LinkLikeNavbarItemProps } from "@theme/NavbarItem";
import { useDevMode, DevModes } from "@site/src/contexts/devMode";

const dropdownOptions = [
  {
    id: DevModes.community,
    label: "Community Developer",
  },
  {
    id: DevModes.bitwarden,
    label: "Bitwarden Developer",
  },
] as const;

interface Props extends Omit<DropdownNavbarItemProps, "items" | "label"> {
  readonly dropdownItemsBefore?: LinkLikeNavbarItemProps[];
  readonly dropdownItemsAfter?: LinkLikeNavbarItemProps[];
}

export default function DevDropdown({
  mobile,
  dropdownItemsBefore,
  dropdownItemsAfter,
  ...props
}: Props): React.JSX.Element {
  const { devMode, setDevMode } = useDevMode();

  const items: DropdownNavbarItemProps["items"] = dropdownOptions.map((item) => ({
    label: item.label,
    to: "#",
    onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
      setDevMode(item.id);
      e.preventDefault();
    },
  }));

  const dropdownLabel = dropdownOptions.find((i) => i.id === devMode)?.label;

  return <DropdownNavbarItem {...props} mobile={mobile} label={dropdownLabel} items={items} />;
}
