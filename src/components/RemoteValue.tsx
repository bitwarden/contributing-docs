import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

export default function RemoteValue({ name }): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return siteConfig.customFields.remoteValues[name];
}
