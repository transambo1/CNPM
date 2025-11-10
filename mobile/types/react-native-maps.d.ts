declare module 'react-native-maps' {
  import * as React from 'react';
  import { ViewProps } from 'react-native';

  export interface Region {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }

  export interface MapViewProps extends ViewProps {
    region?: Region;
    initialRegion?: Region;
    provider?: string;
    scrollEnabled?: boolean;
    zoomEnabled?: boolean;
    rotateEnabled?: boolean;
    pitchEnabled?: boolean;
  }

  export default class MapView extends React.Component<MapViewProps> {}

  export class Marker extends React.Component<{ coordinate: { latitude: number; longitude: number }; title?: string; description?: string; pinColor?: string; }>
  {}
  export class Polyline extends React.Component<{ coordinates: { latitude: number; longitude: number }[]; strokeColor?: string; strokeWidth?: number; lineDashPattern?: number[] }>
  {}
  export const PROVIDER_GOOGLE: string;
}
