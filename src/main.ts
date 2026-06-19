import * as THREE from 'three';
import { App, GpsReceivedEvent, LocAR } from 'locar';
import { DemApplier, DemTiler, FeatureCollection, JsonTiler, LineString, LonLat, MultiLineString, Point } from 'locar-tiler';

const app = new App({ cameraOptions : { hFov: 80, near: 0.1, far: 1000 } });

const colours : Map <string, number> = new Map([
  ["path" , 0x00ff00 ],
  ["footway" , 0x00ff00 ],
  ["bridleway" , 0xaa5500 ],
  ["cycleway" , 0x0000ff ]
]);

const widths: Map <string, number> = new Map([
  ["trunk", 7],
  ["primary", 5],
  ["secondary", 5],
  ["tertiary", 5],
  ["unclassified", 3],
  ["residential", 2]
]);

let dem : DemTiler | null = null;

const indexedObjects = new Map<String, THREE.Mesh>();

try {
    const locar = await app.start();
    locar.setElevation(100);
    
    const demApplier = new DemApplier(  
       dem = new DemTiler("/dem/{z}/{x}/{y}.png"),
       new JsonTiler("/map/{z}/{x}/{y}.json?outProj=4326")
    );

   
    const poiMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const poiGeom = new THREE.BoxGeometry(5, 5, 5);
   
    let lastLonLat: LonLat | null = null;
    let distSinceUpdate = Number.MAX_VALUE;
   
    locar.on("gpsupdate", async(ev: GpsReceivedEvent) => {
       
      const lonLat = new LonLat(
        ev.position.coords.longitude,
        ev.position.coords.latitude
      );

     
      if(lastLonLat !== null) {
        distSinceUpdate = LocAR.haversineDist(lonLat, lastLonLat);
      }
      
      if(distSinceUpdate > 10) {    
        lastLonLat = lonLat;
        setMsg("Downloading new data...", "loadMsg");
        const tiles = await demApplier.updateByLonLat(
          lonLat
        );
      
        setMsg("", "loadMsg");

        locar.setElevation(dem!.getElevationFromLonLat(lonLat) + 2);
        
        for(let dataTile of tiles) {
          
        
          for(let feature of (dataTile.data as FeatureCollection).features) {
            const props = feature.properties as any;
            const id = `${dataTile.tile.toString()}:${feature.geometry.type.substring(0, 3)}:${props.osm_id}`;

            if(!indexedObjects.get(id)) {
              const hwy = props.highway;
              const width = props.width || widths.get(hwy) || 2;
           
              switch(feature.geometry.type) {
                case 'Point':
                  const mesh = new THREE.Mesh(poiGeom, poiMaterial);
                  const coords = (feature.geometry as Point).coordinates;
                  locar.add(mesh, coords[0], coords[1], coords[2] || 0);
                  indexedObjects.set(id, mesh);
                  break;

                case 'LineString':
                  if(hwy) {
                    const lineMaterial = new THREE.MeshBasicMaterial({ color: colours.get(hwy) ?? 0xffffff });
                    const lineCoords = (feature.geometry as LineString).coordinates;
                    if(lineCoords.length >= 2) {
                      indexedObjects.set(id, locar.addGeoLine(lineCoords, lineMaterial, width));
                    }
                  }
                  break;

                case 'MultiLineString':
                  if(hwy) {
                    const lineMaterial = new THREE.MeshBasicMaterial({ color: colours.get(hwy) ?? 0xffffff });  
                    const mlsCoords = (feature.geometry as MultiLineString).coordinates;
                    for(let lineCoords of mlsCoords) {
                      if(lineCoords.length >= 2) {
                        indexedObjects.set(id, locar.addGeoLine(lineCoords, lineMaterial, width));
                      }
                    }
                  }  
              }
            }
          }
        }
      }
       showLocation(lonLat);
    });
    locar.startGps();

    locar.on("gpserror", (ev: GeolocationPositionError) => {
        alert(ev.code);
    });

} catch(e: any) {
    alert(e);
}

function setMsg(msg: string, elementId: string = "msg") {
  document.getElementById(elementId)!.innerHTML = msg;
}

function showLocation(lonLat: LonLat) { 
   setMsg(`Lon ${lonLat.longitude.toFixed(3)} lat ${lonLat.latitude.toFixed(3)} ${dem === null ? "" : `elev: ${Math.round(dem.getElevationFromLonLat(lonLat))}m`}`);  
}