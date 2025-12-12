import "./style.css";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

//////////////////////////////
//////    CONSTANTS     //////
//////////////////////////////
// ----------------------------------- SPHERE
const radius = 250;
const segments = 15;
const bgColor = 0x5072A7;
// ----------------------------------- CAMERA
const camZ = 450;
const camStartY = 400;
const zoomDuration = 2500;
// ----------------------------------- MOUSE
let isDragging = false;
let prevMouse = { x: 0, y: 0 };

//////////////////////////////
//////  HOME PAGE LOGIC //////
//////////////////////////////
const homePage = document.querySelector("#home-page");
const enterBtn = document.querySelector("#enter-btn");

enterBtn.addEventListener("click", () => {
  homePage.classList.add("hidden");
  animateCameraZoom();
});

//////////////////////////////
//////  SCENE SETUP     //////
//////////////////////////////
const app = document.querySelector("#app");

// ----------------------------------- RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

// ----------------------------------- SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(bgColor);

// ----------------------------------- CAMERA
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, camStartY, camZ);

// ----------------------------------- LIGHTS
const ambientLight = new THREE.AmbientLight("white", 0.5);
const directionalLight = new THREE.DirectionalLight("white", 1.5);
directionalLight.position.set(-5, 2, 5);
scene.add(ambientLight, directionalLight);

//////////////////////////////
//////  SPHERE SETUP    //////
//////////////////////////////
// ----------------------------------- GEOMETRY
const sphereGeo = new THREE.SphereGeometry(radius, segments, segments);

// ----------------------------------- TEXTURES
const textureLoader = new THREE.TextureLoader();
const grassTextures = {
  color: textureLoader.load('/assets/grass/grass.jpg'),
  ao: textureLoader.load('/assets/grass/grass-ambientOcclusion.jpg'),
  displacement: textureLoader.load('/assets/grass/grass-displacement.jpg'),
  roughness: textureLoader.load('/assets/grass/grass-roughness.jpg')
};

Object.values(grassTextures).forEach(texture => {
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
});
grassTextures.color.colorSpace = THREE.SRGBColorSpace;

// ----------------------------------- MATERIAL & MESH
const sphereMat = new THREE.MeshLambertMaterial({
  map: grassTextures.color,
  aoMap: grassTextures.ao,
  aoMapIntensity: 1,
});
const sphere = new THREE.Mesh(sphereGeo, sphereMat);

// ----------------------------------- GROUP (for rotation)
const planetGroup = new THREE.Group();
planetGroup.add(sphere);
scene.add(planetGroup);

//////////////////////////////
//////  HELPER FUNCS    //////
//////////////////////////////
// ----------------------------------- PERLIN NOISE
function noise(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

// ----------------------------------- SPHERICAL POSITIONING
function getSphericalPosition(lat, lon, radius) {
  const phi = lon * Math.PI * 2;
  const theta = (0.5 - lat) * Math.PI;
  return {
    x: radius * Math.sin(theta) * Math.cos(phi),
    y: radius * Math.cos(theta),
    z: radius * Math.sin(theta) * Math.sin(phi)
  };
}

// ----------------------------------- CAMERA ZOOM ANIMATION
function animateCameraZoom() {
  const startTime = Date.now();
  
  function update() {
    const progress = Math.min((Date.now() - startTime) / zoomDuration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    camera.position.y = camStartY * (1 - eased);
    
    if (progress < 1) requestAnimationFrame(update);
  }
  
  update();
}

//////////////////////////////
//////  GRASS TERRAIN   //////
//////////////////////////////
const loader = new GLTFLoader();

loader.load('/assets/grass/grass_variations.glb', (gltf) => {
  const grassModel = gltf.scene;
  
  // ----------------------------------- TERRAIN CONFIG
  const latSegments = 20;
  const lonSegments = 35;
  const streakNoiseScale = 2.5;
  const streakThreshold = 0.25;
  
  // pond exclusion zone
  const pondLat = -0.4;
  const pondLon = 0.5;
  const pondExclusionRadius = 0.35;
  
  // ----------------------------------- GENERATE STREAKS ALONG SPHERE GRID
  for (let i = 0; i < latSegments; i++) {
    for (let j = 0; j < lonSegments; j++) {
      // map to latitude/longitude range
      const lat = (i / latSegments) * 2 - 1; // -1 to 1
      const lon = (j / lonSegments) * 2 - 1; // -1 to 1
      
      // check if too close to pond area
      const distToPond = Math.sqrt(Math.pow(lat - pondLat, 2) + Math.pow(lon - pondLon, 2));
      if (distToPond < pondExclusionRadius) {
        continue;
      }
      
      // perlin noise for natural streak patterns
      const noiseVal1 = noise(lat * streakNoiseScale, lon * streakNoiseScale);
      const noiseVal2 = noise(lon * streakNoiseScale * 1.3, lat * streakNoiseScale * 0.7);
      
      // combine noise values for organic streaks
      const streakPattern = noiseVal1 * 0.6 + noiseVal2 * 0.4;
      
      // only place grass if within streak threshold
      if (streakPattern > streakThreshold) {
        const grass = grassModel.clone();
        
        // add jitter for natural look
        const jitterLat = lat + (noise(i * 3.7, j * 4.3) - 0.5) * 0.15;
        const jitterLon = lon + (noise(i * 5.1, j * 6.7) - 0.5) * 0.15;
        
        // double check jittered position isn't in pond zone
        const jitterDistToPond = Math.sqrt(Math.pow(jitterLat - pondLat, 2) + Math.pow(jitterLon - pondLon, 2));
        if (jitterDistToPond < pondExclusionRadius) continue;
        
        // position on sphere surface
        const pos = getSphericalPosition(jitterLat, jitterLon, radius);
        const normal = new THREE.Vector3(pos.x, pos.y, pos.z).normalize();
        
        grass.position.set(pos.x, pos.y, pos.z);
        
        // orient perpendicular to surface
        grass.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
        
        // vary scale naturally
        const scale = 0.2 + noise(i * 1.1, j * 1.3) * 0.2;
        grass.scale.setScalar(scale);
        
        planetGroup.add(grass);
      }
    }
  }
});

//////////////////////////////
//////  WHEAT CLUSTER   //////
//////////////////////////////
loader.load('/wheatFour.glb', (gltf) => {
  const wheatModel = gltf.scene;
  
  // ----------------------------------- CLUSTER CONFIG
  const wheatCount = 25;
  const clusterSpread = 0.05;
  
  // multiple cluster locations around sphere
  const clusterPositions = [
    { lat: 0.2, lon: 0 },      // original cluster
    { lat: -0.3, lon: 0.3 },   // cluster 2
    { lat: 0.5, lon: -0.4 },   // cluster 3
    { lat: -0.6, lon: -0.3 },  // cluster 4
    { lat: 0.1, lon: 0.6 },    // cluster 5
    { lat: 0.7, lon: 0.2 },    // cluster 6
    { lat: -0.2, lon: -0.5 },  // cluster 7
    { lat: 0.4, lon: 0.4 },    // cluster 8
    { lat: -0.5, lon: 0.1 },   // cluster 9
    { lat: 0.6, lon: -0.2 }    // cluster 10
  ];
  
  // ----------------------------------- GENERATE CLUSTERS
  clusterPositions.forEach((cluster, clusterIndex) => {
    for (let i = 0; i < wheatCount; i++) {
      const wheat = wheatModel.clone();
      
      // perlin noise for natural distribution
      const nX = noise(i * 0.5 + clusterIndex * 10, i * 0.7);
      const nY = noise(i * 0.3 + clusterIndex * 15, i * 0.9);
      const lat = cluster.lat + (nX - 0.5) * clusterSpread;
      const lon = cluster.lon + (nY - 0.5) * clusterSpread;
      
      // position on sphere surface
      const pos = getSphericalPosition(lat, lon, radius);
      wheat.position.set(pos.x, pos.y, pos.z);
      
      // orient perpendicular to surface
      const normal = new THREE.Vector3(pos.x, pos.y, pos.z).normalize();
      wheat.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      
      // vary scale naturally
      const scale = 0.8 + noise(i * 1.2 + clusterIndex * 5, i * 1.5) * 0.4;
      wheat.scale.setScalar(scale);
      
      // brighten wheat materials
      wheat.traverse((child) => {
        if (child.isMesh) {
          child.material = child.material.clone();
          child.material.emissive = new THREE.Color(0xffdd88);
          child.material.emissiveIntensity = 0.3;
        }
      });
      
      planetGroup.add(wheat);
    }
  });
});

//////////////////////////////
//////  POND ASSET      //////
//////////////////////////////
loader.load('/assets/water-pond/pond.glb', (gltf) => {
  const pond = gltf.scene;
  
  // ----------------------------------- POND CONFIG
  const pondLat = -0.4;
  const pondLon = 0.5;
  const pondScale = 50;
  const pondOffset = 1;
  const bendStrength = 0.003;
  const localXShift = -30;
  
  // ----------------------------------- POSITION & ORIENT
  const pos = getSphericalPosition(pondLat, pondLon, radius);
  const normal = new THREE.Vector3(pos.x, pos.y, pos.z).normalize();
  
  pond.position.set(
    pos.x + normal.x * pondOffset,
    pos.y + normal.y * pondOffset,
    pos.z + normal.z * pondOffset
  );
  pond.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  pond.scale.setScalar(pondScale);
  
  // ----------------------------------- BEND GEOMETRY
  pond.traverse((child) => {
    if (child.isMesh && child.geometry) {
      const positions = child.geometry.getAttribute('position');
      if (!positions) return;
      
      child.geometry.computeBoundingBox();
      const center = new THREE.Vector3();
      child.geometry.boundingBox.getCenter(center);
      
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);
        
        const dx = x - center.x;
        const dz = z - center.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        positions.setY(i, y - dist * dist * bendStrength);
      }
      
      positions.needsUpdate = true;
      child.geometry.computeVertexNormals();
    }
  });
  
  // ----------------------------------- CENTER ADJUSTMENT
  const localShift = new THREE.Vector3(localXShift, 0, 0);
  pond.position.add(localShift.applyQuaternion(pond.quaternion));
  
  // ----------------------------------- DEBUG HELPER
  pond.add(new THREE.AxesHelper(100));
  
  planetGroup.add(pond);
});

//////////////////////////////
//////  DAVE DUCK       //////
//////////////////////////////
// ----------------------------------- DUCK 1
loader.load('/assets/animals/dave-duck.glb', (gltf) => {
  const duck = gltf.scene;
  const pos = getSphericalPosition(-0.4, 0.55, radius);
  const normal = new THREE.Vector3(pos.x, pos.y, pos.z).normalize();
  
  duck.position.set(pos.x + normal.x * 0.1, pos.y + normal.y * 0.1, pos.z + normal.z * 0.1);
  duck.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  duck.scale.setScalar(15);
  planetGroup.add(duck);
});

// ----------------------------------- DUCK 2
loader.load('/assets/animals/dave-duck.glb', (gltf) => {
  const duck = gltf.scene;
  const pos = getSphericalPosition(-0.42, 0.48, radius);
  const normal = new THREE.Vector3(pos.x, pos.y, pos.z).normalize();
  
  duck.position.set(pos.x + normal.x * 0.1, pos.y + normal.y * 0.1, pos.z + normal.z * 0.1);
  duck.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  duck.scale.setScalar(14);
  planetGroup.add(duck);
});

// ----------------------------------- DUCK 3
loader.load('/assets/animals/dave-duck.glb', (gltf) => {
  const duck = gltf.scene;
  const pos = getSphericalPosition(-0.38, 0.52, radius);
  const normal = new THREE.Vector3(pos.x, pos.y, pos.z).normalize();
  
  duck.position.set(pos.x + normal.x * -0.5, pos.y + normal.y * -0.5, pos.z + normal.z * -0.5);
  duck.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  duck.scale.setScalar(16);
  planetGroup.add(duck);
});

// ----------------------------------- DUCK 4
loader.load('/assets/animals/dave-duck.glb', (gltf) => {
  const duck = gltf.scene;
  const pos = getSphericalPosition(-0.5, 0.7, radius);
  const normal = new THREE.Vector3(pos.x, pos.y, pos.z).normalize();
  
  duck.position.set(pos.x + normal.x * 0.1, pos.y + normal.y * 0.1, pos.z + normal.z * 0.1);
  duck.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  duck.scale.setScalar(13);
  planetGroup.add(duck);
});

//////////////////////////////
//////  COW             //////
//////////////////////////////
loader.load('/assets/animals/Cow.glb', 
  (gltf) => {
    console.log('SUCCESS: Cow loaded!', gltf);
    const cow = gltf.scene;
    
    // make materials visible
    cow.traverse((child) => {
      if (child.isMesh) {
        if (child.material) {
          child.material.side = THREE.DoubleSide;
        }
      }
    });
    
    // position next to wheat field - SAME as duck positioning
    const pos = getSphericalPosition(0.2, 0.1, radius);
    const normal = new THREE.Vector3(pos.x, pos.y, pos.z).normalize();
    
    cow.position.set(pos.x + normal.x * -2, pos.y + normal.y * -2, pos.z + normal.z * -2);
    cow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    cow.scale.setScalar(3000);
    
    console.log('Cow position:', cow.position);
    console.log('Cow scale:', cow.scale);
    console.log('Cow rotation:', cow.quaternion);
    
    planetGroup.add(cow);
  }, 
  undefined,
  (error) => {
    console.error('ERROR loading cow:', error);
  }
);

//////////////////////////////
//////  BARN            //////
//////////////////////////////
loader.load('/assets/low-poly_barn.glb', 
  (gltf) => {
    const barn = gltf.scene;
    
    // position near wheat field and cow
    const pos = getSphericalPosition(0.25, -0.05, radius);
    const normal = new THREE.Vector3(pos.x, pos.y, pos.z).normalize();
    
    barn.position.set(pos.x + normal.x * 0.1, pos.y + normal.y * 0.1, pos.z + normal.z * 0.1);
    barn.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    barn.scale.setScalar(5);
    
    console.log('Barn added at:', barn.position);
    
    planetGroup.add(barn);
  }, 
  undefined,
  (error) => {
    console.error('ERROR loading barn:', error);
  }
);

//////////////////////////////
//////  MOUSE ROTATION  //////
//////////////////////////////
const dragSensitivity = 0.003;

renderer.domElement.addEventListener('mousedown', (e) => {
  isDragging = true;
  prevMouse = { x: e.clientX, y: e.clientY };
});

renderer.domElement.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  
  const dx = e.clientX - prevMouse.x;
  const dy = e.clientY - prevMouse.y;
  
  // create rotation quaternion from mouse movement
  const rotationSpeed = dragSensitivity;
  const quaternionY = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    dx * rotationSpeed
  );
  const quaternionX = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    dy * rotationSpeed
  );
  
  // combine rotations
  quaternionY.multiply(quaternionX);
  planetGroup.quaternion.multiplyQuaternions(quaternionY, planetGroup.quaternion);
  
  prevMouse = { x: e.clientX, y: e.clientY };
});

renderer.domElement.addEventListener('mouseup', () => {
  isDragging = false;
});

//////////////////////////////
//////  RENDER LOOP     //////
//////////////////////////////
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});