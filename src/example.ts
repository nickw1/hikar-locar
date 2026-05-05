
/* new api something like this
import * as THREE from 'three';
import * as LocAR from 'locar';
const camera = new THREE.PerspectiveCamera(80, window.innerWidth/window.innerHeight, 0.001, 100);
const renderer = new THREE.WebGLRenderer();
//document.body.appendChild(renderer.domElement); do in App


const locar = new LocAR.App(camera, renderer);
locar.on("errortype", errorHandler);

locar.run();
*/