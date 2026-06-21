import * as THREE from 'three';

export class Ship extends THREE.Group {
  private hullMesh: THREE.Mesh;
  private iconMesh: THREE.Mesh;

  constructor() {
    super();

    const hullShape = new THREE.Shape();
    hullShape.moveTo(0, 1.5);
    hullShape.lineTo(-0.8, -1);
    hullShape.lineTo(-0.5, -1.5);
    hullShape.lineTo(0.5, -1.5);
    hullShape.lineTo(0.8, -1);
    hullShape.lineTo(0, 1.5);

    const hullExtrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.6,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      bevelSegments: 2,
    };

    const hullGeometry = new THREE.ExtrudeGeometry(hullShape, hullExtrudeSettings);
    hullGeometry.center();
    hullGeometry.rotateX(-Math.PI / 2);

    const hullMaterial = new THREE.MeshStandardMaterial({
      color: 0xffcc66,
      roughness: 0.6,
      metalness: 0.2,
    });

    this.hullMesh = new THREE.Mesh(hullGeometry, hullMaterial);
    this.hullMesh.castShadow = true;
    this.hullMesh.receiveShadow = true;
    this.add(this.hullMesh);

    const iconShape = new THREE.Shape();
    iconShape.moveTo(0, 0.5);
    iconShape.lineTo(-0.4, -0.3);
    iconShape.lineTo(0.4, -0.3);
    iconShape.lineTo(0, 0.5);

    const iconGeometry = new THREE.ExtrudeGeometry(iconShape, {
      depth: 0.05,
      bevelEnabled: false,
    });
    iconGeometry.center();
    iconGeometry.rotateX(-Math.PI / 2);
    iconGeometry.translate(0, 0.8, 0);

    const iconMaterial = new THREE.MeshStandardMaterial({
      color: 0xff9933,
      roughness: 0.5,
      metalness: 0.3,
    });

    this.iconMesh = new THREE.Mesh(iconGeometry, iconMaterial);
    this.iconMesh.castShadow = true;
    this.add(this.iconMesh);
  }

  setPosition(x: number, z: number): void {
    this.position.set(x, 0, z);
  }

  setHeading(headingDeg: number): void {
    this.rotation.y = -THREE.MathUtils.degToRad(headingDeg);
  }
}
