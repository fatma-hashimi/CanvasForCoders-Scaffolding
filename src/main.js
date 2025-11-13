import "./style.css";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
// import { gsap } from "gsap";

//////////////////////////////
//////    VARIABLES     //////
// ----------------------------------- SPHERE DIMENSIONS
const radius = 250;
const widthSegments = 15;
const heightSegments = 15;
// ----------------------------------- SPHERE MATERIAL
const ballerColor = 0x7D625C;
// ----------------------------------- MOUSE INTERACTIONS
let dragging = false;
let previousMouse = { x: 0, y: 0 };
// ----------------------------------- CAMERA SPECS
const camZ = 370;


// app
const app = document.querySelector("#app");

// renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

// scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);


// camera
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, camZ);

// lights
const ambientLight = new THREE.AmbientLight("white", 2);
scene.add(ambientLight);

// geometries
const ballerGeo = new THREE.SphereGeometry(radius, widthSegments, heightSegments);

// materials
const ballerMat = new THREE.MeshLambertMaterial({
  color: ballerColor,
  flatShading: false,
});

// meshes
const baller = new THREE.Mesh(ballerGeo, ballerMat);
scene.add(baller);

// create a group to hold sphere and wheat together
const grouped = new THREE.Group();
grouped.add(baller);
scene.add(grouped);

// instantiate a loader
const loader = new GLTFLoader();

loader.load(
  '/wheatFour.glb',
  function (gltf) {
    const wheat_four = gltf.scene;
    wheat_four.position.set(0, radius, 0);
    wheat_four.scale.setScalar(1);
    grouped.add(wheat_four); // add wheat to the planet group
  },
);

// mouse event handlers
renderer.domElement.addEventListener('mousedown', (event) => {
  dragging = true;
  let mouseX = event.clientX;
  let mouseY = event.clientY;
  previousMouse = { x: mouseX, y: mouseY };
});

renderer.domElement.addEventListener('mousemove', (event) => {
  if (dragging) {
    const dx = event.clientX - previousMouse.x;
    const dy = event.clientY - previousMouse.y;
    const sensitivity = 0.002;

    grouped.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), dx * sensitivity); // LEFT-RIGHT
    grouped.rotateOnAxis(new THREE.Vector3(1, 0, 0), dy * sensitivity); // UP-DOWN
    
    previousMouse = { x: event.clientX, y: event.clientY };
  }
});

renderer.domElement.addEventListener('mouseup', () => {
  dragging = false;
});

// animate
const animate = () => {
  renderer.render(scene, camera);
};
renderer.setAnimationLoop(animate);