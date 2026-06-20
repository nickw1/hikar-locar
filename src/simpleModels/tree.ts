import * as THREE from 'three';

export default function Tree(scale: number = 1) {
    const group = new THREE.Group();
    group.scale.set(scale, scale, scale);
   
    const sphereGeom = new THREE.SphereGeometry(2);
    const sphereMaterial = new THREE.MeshBasicMaterial({color: 0x00ff00});
    const sphereMesh = new THREE.Mesh(sphereGeom, sphereMaterial);
    sphereMesh.position.set(0, 4, 0);
    group.add(sphereMesh);

    const trunkGeom = new THREE.CylinderGeometry(0.5, 0.5, 2);
    const trunkMaterial = new THREE.MeshBasicMaterial({color: 0xaa5500});
    const trunkMesh = new THREE.Mesh(trunkGeom, trunkMaterial);
    trunkMesh.position.set(0, 1, 0);
    group.add(trunkMesh);

    return group;
}