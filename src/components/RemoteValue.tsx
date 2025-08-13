import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

export default function RemoteValue({ name }): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  console.log("[RemoteValue]", name);
  return siteConfig.customFields.remoteValues[name];
}
