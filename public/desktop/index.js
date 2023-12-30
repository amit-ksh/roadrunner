import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

var container;
var cubes = [];
var crash = false;
var score = 0;
var scoreText = document.getElementById("score");
var id = 0;
let counter = 3;

let scene,
  camera,
  renderer,
  simplex,
  plane,
  geometry,
  xZoom,
  yZoom,
  noiseStrength;
let car, barricade;
let explodeSound;

let bluetoothConnected = false;
let gameStarted = false;
let gameOver = false;
let zOrientation = 0;
let sound;
var loadingEl, connectMessage, audioBtn;
const modelLoaded = {
  car: false,
  barricade: false,
};

setup();
init();
draw();

let timeout = setInterval(() => {
  if (!modelLoaded.car && !modelLoaded.barricade) return;
  if (!connectMessage && !loadingEl) return;

  connectMessage.style.display = "block";
  loadingEl.style.display = "none";
  clearInterval(timeout);
}, 100);

function setup() {
  setupNoise();
  setupCarModel();
  setupBarricadeModel();
  setupScene();
  setupSound();
  setupPlane();
  setupLights();
}

function setupSound() {
  sound = new Audio("sound/heavy-racing.mp3");
  sound.loop = true;
  sound.volume = 0.7;
}

function setupNoise() {
  xZoom = 7;
  yZoom = 15;
  noiseStrength = 3;
  simplex = new SimplexNoise();
}

function setupScene() {
  scene = new THREE.Scene();

  let res = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(75, res, 0.1, 1000);
  camera.position.set(0, -20, 1);
  camera.rotation.x = -300;

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 0.0);
  renderer.setClearAlpha(1.0);

  document.body.appendChild(renderer.domElement);
}

// Load & spawn car model
function setupCarModel() {
  var loader = new GLTFLoader();
  loader.load(
    "assets/car.glb",
    function (gltf) {
      car = gltf.scene;
      car.position.set(0, -18.7, 0.2);
      car.rotation.set(1.5, -1.55, 0);
      car.scale.set(0.3, 0.3, 0.3);

      gltf.scene.traverse(function (child) {
        if (child.isMesh) {
          car.vertices = child.geometry.attributes.position.array;
        }
      });

      scene.add(car);
      renderer.render(scene, camera);

      window.addEventListener("keydown", (e) => {
        if (e.code === "ArrowLeft" && car.position.x > -2 && !gameOver) {
          car.position.x -= 0.1;
        }
        if (e.code === "ArrowRight" && car.position.x < 2 && !gameOver) {
          car.position.x += 0.1;
        }
      });
      modelLoaded.car = true;
    },
    // called while loading is progressing
    function (xhr) {
      if (!loadingEl) return;
      loadingEl.querySelector("#car").innerHTML = `Loading car model: <span>${(
        (xhr.loaded / xhr.total) *
        100
      ).toFixed(2)}%</span>`;
    },
    // called when loading has errors
    function (error) {
      alert("An error occured while loading Car model! Refresh!");
    }
  );
}

//Load barricade model
function setupBarricadeModel() {
  var loader = new GLTFLoader();
  loader.load(
    "assets/barricade.glb",
    function (gltf) {
      barricade = gltf.scene;
      barricade.position.set(0, -16, 0);
      barricade.rotation.set(1.6, 0, 0);
      barricade.scale.set(0.006, 0.006, 0.004);

      gltf.scene.traverse(function (child) {
        if (child.isMesh) {
          barricade.vertices = child.geometry.attributes.position.array;
        }
      });

      modelLoaded.barricade = true;
    },
    // called while loading is progressing
    function (xhr) {
      if (!loadingEl) return;
      loadingEl.querySelector(
        "#barricade"
      ).innerHTML = `Loading barricade model: <span>${(
        (xhr.loaded / xhr.total) *
        100
      ).toFixed(2)}%</span>`;
    },
    // called when loading has errors
    function (error) {
      alert("An error occured while loading Barricade model! Refresh!");
    }
  );
}

function setupPlane() {
  let side = 120;
  geometry = new THREE.PlaneGeometry(40, 40, side, side);
  geometry.vertices = geometry.attributes.position.array;

  let material = new THREE.MeshStandardMaterial({
    color: new THREE.Color("rgb(103,119,220)"),
    metalness: 0.7,
    roughness: 0.55,
  });

  plane = new THREE.Mesh(geometry, material);
  plane.castShadow = true;
  plane.receiveShadow = true;
  scene.add(plane);

  const wireframeGeometry = new THREE.WireframeGeometry(geometry);
  const wireframeMaterial = new THREE.LineBasicMaterial({
    color: "rgb(93,159,153)",
  });
  const wireframe = new THREE.LineSegments(
    wireframeGeometry,
    wireframeMaterial
  );

  plane.add(wireframe);
}

function setupLights() {
  let directionalLight = new THREE.DirectionalLight(0xffffff, 2);
  directionalLight.position.set(10, 10, 10);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  let ambientLight = new THREE.AmbientLight(new THREE.Color(0xffffff), 1);
  ambientLight.position.set(10, 0, 10);
  scene.add(ambientLight);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function init() {
  scene.fog = new THREE.FogExp2(new THREE.Color("#5a008a"), 0.0003);

  container = document.getElementById("ThreeJS");
  container.appendChild(renderer.domElement);
  renderer.render(scene, camera);

  window.addEventListener("resize", onWindowResize);
}

function draw() {
  if (gameOver) {
    explodeSound.play();
    sound.stop();
    return;
  }

  adjustVertices(new Date() * 0.0003);

  if (gameStarted) {
    requestAnimationFrame(draw);
    update();
  }

  renderer.render(scene, camera);
}

// Create terrains
function adjustVertices(offset) {
  for (let i = 0; i < geometry.vertices.length; i += 3) {
    let x = geometry.vertices[i] / xZoom;
    let y = geometry.vertices[i + 1] / yZoom;

    // terrain
    if (geometry.vertices[i] < -2.5 || geometry.vertices[i] > 2.5) {
      let noise = simplex.noise2D(x, y + offset) * noiseStrength;
      geometry.vertices[i + 2] = noise;
    }
  }
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();
}

// Game Update Function
function update() {
  if (car.position.x > 2 && zOrientation < 0) {
    car.position.x += zOrientation;
  }
  if (car.position.x < -2 && zOrientation > 0) {
    car.position.x += zOrientation;
  }

  for (let i = 0; i < cubes.length; i++) {
    const collision = car.position.distanceTo(cubes[i].position) < 0.35;

    if (collision) {
      crash = true;
      gameOver = true;
    } else {
      crash = false;
    }
  }

  if (Math.random() < 0.03 && cubes.length < 6) {
    makeRandomCube();
  }

  for (let i = 0; i < cubes.length; i++) {
    if (cubes[i].position.y < -20) {
      scene.remove(cubes[i]);
      cubes.splice(i, 1);
      if (!crash) {
        score += 1;
      }
    } else {
      cubes[i].position.y -= 0.05;
    }
  }
  scoreText.innerText = "Score:" + Math.floor(score);
}

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

// Spawn barricades
function makeRandomCube() {
  const newBarricade = barricade.clone();
  newBarricade.position.set(
    getRandomArbitrary(-2, 2),
    getRandomArbitrary(50, 0),
    0
  );

  cubes.push(newBarricade);
  newBarricade.name = "box_" + id;
  id++;

  scene.add(newBarricade);
}

function displayCounter() {
  const counterDiv = document.getElementsByClassName("counter")[0];
  counterDiv.innerHTML = counter;
  if (counter > 0) {
    counter--;
  } else if (counter === 0) {
    clearInterval(interval);
    counterDiv.classList.add("fade-out");
    gameStarted = true;
    draw();
  }
}

let interval;

window.onload = () => {
  if (!navigator.userAgentData.mobile) {
    let previousValue;
    connectMessage = document.getElementById("connect");
    connectMessage.querySelector(
      "p strong"
    ).innerHTML = `${window.origin}/mobile`;

    explodeSound = document.getElementById("explode_sound");
    loadingEl = document.querySelector(".loader");
    audioBtn = document.querySelector("button.audio");

    audioBtn.addEventListener("click", () => {
      if (sound.paused) {
        sound.play();
        audioBtn.classList.add("playing");
      } else {
        sound.pause();
        audioBtn.classList.remove("playing");
      }
    });

    const socket = io();

    socket.on("mobile orientation", function (e) {
      if (!bluetoothConnected) {
        bluetoothConnected = true;
        connectMessage.classList.add("fade-out");

        const title = document.getElementsByClassName("title")[0];
        title.classList.add("fade-out");

        interval = setInterval(function () {
          displayCounter();
        }, 1000);
      }

      if (previousValue !== e) {
        zOrientation = -e / 300;
      }
      previousValue = e;
    });
  }
};
