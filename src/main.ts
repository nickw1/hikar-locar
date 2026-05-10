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

try {
    const locar = await app.start();
    locar.setElevation(100);
    let dem;
    const demApplier = new DemApplier(  
       dem = new DemTiler("/dem/{z}/{x}/{y}.png"),
       new JsonTiler("/map/{z}/{x}/{y}.json?outProj=4326")
    );

   
    const poiMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const poiGeom = new THREE.BoxGeometry(10, 10, 10);
    let first = true;
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
        const tiles = await demApplier.updateByLonLat(
          lonLat
        );
        if(first) {
          alert(`got tiles: lon ${lonLat.longitude} lat ${lonLat.latitude} elev: ${dem.getElevationFromLonLat(lonLat)}`);
          first = false;  
        }
        locar.setElevation(dem.getElevationFromLonLat(lonLat) + 1.6);
        
        for(let dataTile of tiles) {
          for(let feature of (dataTile.data as FeatureCollection).features) {
            const hwy = feature.properties.get("highway");
          
            switch(feature.geometry.type) {
              case 'Point':
                const mesh = new THREE.Mesh(poiGeom, poiMaterial);
                const coords = (feature.geometry as Point).coordinates;
                locar.add(mesh, coords[0], coords[1], coords[2] || 0);
                break;

              case 'LineString':
                if(hwy) {
                  const lineMaterial = new THREE.MeshBasicMaterial({ color: colours.get(hwy) ?? 0xffffff });
                  const lineCoords = (feature.geometry as LineString).coordinates;
                  if(lineCoords.length >= 2) {
                    locar.addGeoLine(lineCoords, lineMaterial);
                  }
                }
                break;

              case 'MultiLineString':
                if(hwy) {
                  const lineMaterial = new THREE.MeshBasicMaterial({ color: colours.get(hwy) ?? 0xffffff });  
                  const mlsCoords = (feature.geometry as MultiLineString).coordinates;
                  for(let lineCoords of mlsCoords) {
                    if(lineCoords.length >= 2) {
                      locar.addGeoLine(lineCoords, lineMaterial);
                    }
                  }
                }  
            }
          }
        }
      }
    });
    //  locar.fakeGps(-0.72, 51.05)
    locar.startGps();

    locar.on("gpserror", (ev: GeolocationPositionError) => {
        alert(ev.code);
    });

} catch(e: any) {
    alert(e);
}