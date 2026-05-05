import { LonLat } from 'locar-tiler';

export interface LayerInfo {
    cols: string;
    table: string;
    conditions: string;
    geomCol?: string;
    idCol?: string;
}

export interface LayerData {
    ways: LayerInfo;
    poi: LayerInfo;
}

export type LayerKey = keyof LayerData;

export interface OsmEntity {
    id: string;
    name: string;
    type: string;
}

export interface Poi extends OsmEntity {
    position: LonLat;
    altitude: number;
}

export interface Way extends OsmEntity {
    coordinates: Array<[number, number, number?]>;
}

export interface GeoState {
    pois: Array<Poi>;
    ways: Array<Way>;
    elev: number;
    
}

export interface GpsStatus {
    pos: GeolocationPosition;
    distMoved: number;
};


export interface PoiState {
    pois: Array<Poi>;
    ways: Array<Way>;
    elev: number;
    addPoi: (poi: Poi) => void;
    addWay: (way: Way) => void;
    setElev: (newElev: number) => void;
}
