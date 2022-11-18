import React from "react";
import DocSidebarItem from "@theme-original/DocSidebarItem";

import { useDevMode } from "@site/src/contexts/devMode";

export default function DocSidebarItemWrapper(props) {
  const { devMode } = useDevMode();

  if (props.item?.customProps?.access && props.item.customProps.access != devMode) {
    return null;
  }

  return (
    <>
      <DocSidebarItem {...props} />
    </>
  );
}
