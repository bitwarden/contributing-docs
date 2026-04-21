// FIXME: remove @ts-nocheck and address type errors in this file
// @ts-nocheck
import React from "react";
import DropdownNavbarItem from "@theme-original/NavbarItem/DropdownNavbarItem";
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
];

export default function DevDropdown({
  mobile,
  dropdownItemsBefore,
  dropdownItemsAfter,
  ...props
}): React.JSX.Element {
  const { devMode, setDevMode } = useDevMode();

  const items = dropdownOptions.map((item) => {
    return {
      label: item.label,
      to: "#",
      onClick: (e) => {
        setDevMode(item.id);
        e.preventDefault();
      },
    };
  });

  const dropdownLabel = dropdownOptions.find((i) => i.id == devMode).label;

  return <DropdownNavbarItem {...props} mobile={mobile} label={dropdownLabel} items={items} />;
}
