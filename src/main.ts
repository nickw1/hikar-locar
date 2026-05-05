import * as THREE from 'three';
import * as LocAR from 'locar';
import { DemApplier, DemTiler, FeatureCollection, JsonTiler, LineString, LonLat, MultiLineString, Point } from 'locar-tiler';

const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1000);
const app = new LocAR.App({ camera });


try {
    const locar = await app.start();
    locar.setElevation(100);
    let dem;
    const demApplier = new DemApplier(  
       dem = new DemTiler("https://hikar.org/webapp/dem/{z}/{x}/{y}.png"),
       new JsonTiler("https://hikar.org/webapp/map/{z}/{x}/{y}.json?outProj=4326")
    );

    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const poiMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const poiGeom = new THREE.BoxGeometry(10, 10, 10);
    let first = true;
   
    locar.on("gpsupdate", async(ev: LocAR.GpsReceivedEvent) => {
       
        if(ev.distMoved > 10 || first) {    
            first = false;  
            const lonLat =  new LonLat(
                ev.position.coords.longitude,
                ev.position.coords.latitude
            );
           
            const tiles = await demApplier.updateByLonLat(
               lonLat
            )
            alert(`got tiles: lon ${lonLat.lon} lat ${lonLat.lat} elev: ${dem.getElevationFromLonLat(lonLat)}`);
            locar.setElevation(dem.getElevationFromLonLat(lonLat) + 1.6);
        
            for(let dataTile of tiles) {
                for(let feature of (dataTile.data as FeatureCollection).features) {
                    console.log(feature.geometry.type);
                    switch(feature.geometry.type) {
                        case 'Point':
                          const mesh = new THREE.Mesh(poiGeom, poiMaterial);
                          const coords = (feature.geometry as Point).coordinates;
                          locar.add(mesh, coords[0], coords[1], coords[2] || 0);
                          break;

                        case 'LineString':
                          const lineCoords = (feature.geometry as LineString).coordinates;
                          if(lineCoords.length >= 2) {
                            locar.addGeoLine(lineCoords, lineMaterial);
                          }
                          break;

                        case 'MultiLineString':
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
    });
  //  locar.fakeGps(-0.72, 51.05)
  locar.startGps();

    locar.on("gpserror", (ev: GeolocationPositionError) => {
        alert(ev.code);
    });

} catch(e: any) {
    alert(e);
}