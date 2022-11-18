import MDXComponents from "@theme-original/MDXComponents";
import Bitwarden from "@site/src/components/Bitwarden";
import Community from "@site/src/components/Community";
import AdrTable from "../components/AdrTable";

export default {
  // Re-use the default mapping
  ...MDXComponents,

  // Custom mapping
  bitwarden: Bitwarden,
  community: Community,
  AdrTable: AdrTable,
};
