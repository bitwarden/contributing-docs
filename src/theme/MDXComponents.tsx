import MDXComponents from "@theme-original/MDXComponents";
import Bitwarden from "@site/src/components/Bitwarden";
import Community from "@site/src/components/Community";
import AdrTable from "../components/AdrTable";
import { Badge } from "@site/src/components/Badge";
import { ServerSettingInfo } from "../components/ServerSettingInfo";

export default {
  // Re-use the default mapping
  ...MDXComponents,

  // Custom mapping
  Bitwarden: Bitwarden,
  Community: Community,
  AdrTable: AdrTable,
  Badge: Badge,
  ServerSettingInfo: ServerSettingInfo,
};
