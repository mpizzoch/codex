import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// SCENA BASE (STABILE)
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0e14);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
camera.position.set(8, 8, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);
controls.update();

scene.add(new THREE.AmbientLight(0xffffff, 0.9));

// DATI
const front = ["F1", "F2", "F3", "F4"];
const right = ["R1", "R2", "R3"];
const top = ["T1", "T2", "T3"];

const Nx = right.length;
const Ny = front.length;
const Nz = top.length;

// COSTRUZIONE CUBO
const size = 0.9;
const gap = 0.2;
const step = size + gap;

const geo = new THREE.BoxGeometry(size, size, size);
const cubes = [];

for (let x = 0; x < Nx; x++)
  for (let y = 0; y < Ny; y++)
    for (let z = 0; z < Nz; z++) {
      const mat = new THREE.MeshStandardMaterial({ color: 0x4aa3ff });
      const cube = new THREE.Mesh(geo, mat);

      cube.position.set(
        x * step - ((Nx - 1) * step) / 2,
        y * step - ((Ny - 1) * step) / 2,
        z * step - ((Nz - 1) * step) / 2
      );

      const edges = new THREE.EdgesGeometry(geo);
      cube.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 })));

      cube.userData = { x, y, z };

      scene.add(cube);
      cubes.push(cube);
    }

// SLICE SEMPLICE (COME PRIMA)
let selectedRow = null;

function showRow(ySel) {
  cubes.forEach((cube) => {
    cube.visible = cube.userData.y === ySel;
  });
}

function reset() {
  cubes.forEach((cube) => {
    cube.visible = true;
  });
  selectedRow = null;
}

// CLICK
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener("click", (event) => {
  mouse.x = (event.clientX / innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(cubes);
  if (!hits.length) {
    return;
  }

  const cube = hits[0].object;

  if (selectedRow === null) {
    selectedRow = cube.userData.y;
    showRow(selectedRow);
  }
});

window.addEventListener("dblclick", reset);

// LOOP
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// RESIZE
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// TEST
console.assert(cubes.length === Nx * Ny * Nz, "Errore cubo");
