import * as THREE from 'three';
import { App, GpsReceivedEvent, LocAR } from 'locar';
import { DEM, DemApplier, DemTiler, EastNorth, FeatureCollection, JsonTiler, LineString, LonLat, MultiLineString, Point } from 'locar-tiler';
import { Bar, Building, Cup, Marker, Tree } from './simpleModels';
import TerrainGenerator from './terrain';
import { Text } from 'troika-three-text';

const app = new App({ cameraOptions: { hFov: 80, near: 0.1, far: 4000 } });

const colours: Map<string, number> = new Map([
  ["path", 0x00ff00],
  ["footway", 0x00ff00],
  ["bridleway", 0xaa5500],
  ["cycleway", 0x0000ff]
]);

const widths: Map<string, number> = new Map([
  ["trunk", 7],
  ["primary", 5],
  ["secondary", 5],
  ["tertiary", 5],
  ["unclassified", 3],
  ["residential", 2]
]);

const noAccess = ["private", "no"];

let demTiler: DemTiler | null = null;

const indexedObjects = new Map<String, THREE.Object3D>();
const highwayMaterials = new Map<String, THREE.Material>();

try {
  const locar = await app.start();
  locar.setElevation(100);

  const ambientLight = new THREE.AmbientLight(0xffffff, 3);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 6);
  directionalLight.position.set(0, 1, 0.1);
  locar.scene.add(ambientLight);
  locar.scene.add(directionalLight);

  const demApplier = new DemApplier(
    demTiler = new DemTiler("/dem/{z}/{x}/{y}.png"),
    new JsonTiler("/map/{z}/{x}/{y}.json?outProj=4326")
  );

  let lastLonLat: LonLat | null = null;
  let distSinceUpdate = Number.MAX_VALUE;

  setMsg("Waiting for GPS...", "loadMsg");

  locar.on("gpsupdate", async (ev: GpsReceivedEvent) => {

    setMsg("", "loadMsg");

    const lonLat = new LonLat(
      ev.position.coords.longitude,
      ev.position.coords.latitude
    );

    if (lastLonLat !== null) {
      distSinceUpdate = LocAR.haversineDist(lonLat, lastLonLat);
    }

    if (distSinceUpdate > 10) {
      lastLonLat = lonLat;
      setMsg("Downloading new data...", "loadMsg");
      const newTiles = await demApplier.updateByLonLat(
        lonLat
      );

      setMsg("", "loadMsg");

      locar.setElevation(demTiler!.getElevationFromLonLat(lonLat) + 2);

      for (let dataTile of newTiles) {
        const tileKey = dataTile.tile.getIndex();

        const newDem = demTiler?.dataTiles.get(tileKey)?.data;
        if (newDem) {
          const terrainGenerator = new TerrainGenerator(newDem);
          locar.scene.add(terrainGenerator.genTerrain(locar));
        }

        for (let feature of (dataTile.data as FeatureCollection).features) {
          const props = feature.properties as any;
          const id = `${dataTile.tile.toString()}:${feature.geometry.type.substring(0, 3)}:${props.osm_id}`;

          if (!indexedObjects.get(id)) {
            const hwy = props.highway;
            const width = props.width || widths.get(hwy) || 2;

            const accessibleHighway = hwy && hwy.indexOf("motorway") == -1 && noAccess.indexOf(props.access) == -1 && noAccess.indexOf(props.foot) == -1;

            let lineMaterial: THREE.Material | null = null;

            switch (feature.geometry.type) {


              case 'Point':
                const object = new THREE.Group();
                if (props.amenity == 'pub') {
                  object.add(Bar(4));
                } else if (props.amenity == 'cafe') {
                  object.add(Cup(4));
                } else if (props.natural == 'tree') {
                  object.add(Tree(4));
                } else if (props.shop !== undefined || props.building !== undefined) {
                  object.add(Building(4));
                } else if (props.natural == "peak") {
                  const geom = new THREE.ConeGeometry(8, 24);
                  const material = new THREE.MeshStandardMaterial({ color: 0xff00ff });
                  object.add(new THREE.Mesh(geom, material));
                } else {
                  object.add(Marker(4));
                }
                const label = props.name || props.amenity || props.place || props.natural || props.shop;
                if (label) {
                  const text = new Text();
                  text.text = label.replace("_", " ");
                  text.position.set(0, 20, 0);
                  text.fontSize = 4;
                  text.anchorX = 'center';
                  text.font = 'https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff';
                  text.color = 0xffffff;
                  text.sync();
                  object.add(text);
                }


                const coords = (feature.geometry as Point).coordinates;
                locar.add(object, coords[0], coords[1], coords[2] || 0);
                indexedObjects.set(id, object);
                break;

              case 'LineString':
                if (accessibleHighway) {
                  lineMaterial = handleLineMaterial(hwy);
                  const lineCoords = (feature.geometry as LineString).coordinates.filter(coords => coords[2] !== null);
                  if (lineCoords.length >= 2) {
                    indexedObjects.set(id, locar.addGeoLine(lineCoords, lineMaterial, width));
                  }
                }
                break;

              case 'MultiLineString':
                if (accessibleHighway) {
                  lineMaterial = handleLineMaterial(hwy);
                  const mlsCoords = (feature.geometry as MultiLineString).coordinates.filter(coords => coords[2] !== null);
                  for (let lineCoords of mlsCoords) {
                    if (lineCoords.length >= 2) {
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
} catch (e: any) {
  alert(e);
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('svcw.js')
    .then(registration => {
      let serviceWorker;
      if (registration.installing) {
        serviceWorker = registration.installing;
      } else if (registration.waiting) {
        serviceWorker = registration.waiting;
      } else if (registration.active) {
        serviceWorker = registration.active;
      }

    })

    .catch(e => {
      console.error(`Service worker registration failed: ${e}`);
    });
}

function setMsg(msg: string, elementId: string = "msg") {
  document.getElementById(elementId)!.innerHTML = msg;
}

function showLocation(lonLat: LonLat) {
  setMsg(`Lon ${lonLat.longitude.toFixed(3)} lat ${lonLat.latitude.toFixed(3)} ${demTiler === null ? "" : `elev: ${Math.round(demTiler.getElevationFromLonLat(lonLat))}m`}`);
}

function handleLineMaterial(hwy: string): THREE.Material {
  if (!highwayMaterials.get(hwy)) {
    const lineMaterial = new THREE.MeshStandardMaterial({ color: colours.get(hwy) ?? 0xffffff, transparent: true, opacity: 0.7 });
    highwayMaterials.set(hwy, lineMaterial);
    return lineMaterial;
  } else {
    return highwayMaterials.get(hwy)!;
  }
}