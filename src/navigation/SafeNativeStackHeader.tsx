import { Header, getHeaderTitle } from '@react-navigation/elements';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import * as React from 'react';

/**
 * Native stack’s default Android header can sit under the status bar with edge-to-edge.
 * @react-navigation/elements Header applies `insets.top` padding explicitly.
 */
export function SafeNativeStackHeader(props: NativeStackHeaderProps) {
  const { options, route, back } = props;
  const title = getHeaderTitle(options, route.name);
  const { header: _omitHeader, ...headerOptions } = options;
  return <Header {...headerOptions} title={title} back={back} />;
}
