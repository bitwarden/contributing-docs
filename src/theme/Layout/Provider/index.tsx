import React from 'react';
import {composeProviders} from '@docusaurus/theme-common';
import ThemeLayoutProvider from "@theme-original/Layout/Provider";

import type {Props} from '@theme/Layout/Provider';
import { DevModeProvider } from '@site/src/contexts/devMode';

const Provider = composeProviders([
  DevModeProvider
]);

export default function LayoutProvider({children}: Props): JSX.Element {
  return <ThemeLayoutProvider><Provider>{children}</Provider></ThemeLayoutProvider>;
}
