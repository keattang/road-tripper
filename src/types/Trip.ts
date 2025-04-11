import { Location, PointOfInterest } from './Location';

export interface DrivingRoute {
  origin: Location;
  destination: Location;
  drivingTime: string;
  distance: string;
  polyline: google.maps.LatLngLiteral[];
}

export interface Trip {
  id: string;
  name: string;
  locations: Location[];
  pointsOfInterest: PointOfInterest[];
  totalDays: number;
  routes?: DrivingRoute[];
} 