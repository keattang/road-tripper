export interface Location {
  id: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  arrivalDate: Date;
  departureDate?: Date;
  pointsOfInterest: PointOfInterest[];
  nightsStayed?: number;
  drivingTime?: string;
}

export interface PointOfInterest {
  id: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  locationId?: string;
  drivingTimeFromLocation?: string;
  parentLocationName?: string;
} 