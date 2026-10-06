import * as THREE from "three";

const canvas = document.querySelector("#bookCanvas");
const stage = document.querySelector(".book-stage");

if (canvas && stage) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(27, 1, 0.1, 100);
  camera.position.set(0, 0, 34);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x7880a3, 1.15));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.85);
  keyLight.position.set(-8, 10, 14);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x8095ff, 0.9);
  rimLight.position.set(11, -4, -8);
  scene.add(rimLight);

  const book = new THREE.Group();
  scene.add(book);

  const textureLoader = new THREE.TextureLoader();
  const loadTexture = (url) => new Promise((resolve, reject) => {
    textureLoader.load(url, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
      resolve(texture);
    }, undefined, reject);
  });

  const makePageTexture = () => {
    const paper = document.createElement("canvas");
    paper.width = 96;
    paper.height = 512;
    const context = paper.getContext("2d");
    const gradient = context.createLinearGradient(0, 0, paper.width, 0);
    gradient.addColorStop(0, "#cfd3df");
    gradient.addColorStop(0.18, "#ffffff");
    gradient.addColorStop(0.72, "#eceef4");
    gradient.addColorStop(1, "#c4c9d7");
    context.fillStyle = gradient;
    context.fillRect(0, 0, paper.width, paper.height);
    context.strokeStyle = "rgba(23,41,131,.13)";
    context.lineWidth = 1;
    for (let x = 4; x < paper.width; x += 5) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, paper.height);
      context.stroke();
    }
    const texture = new THREE.CanvasTexture(paper);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };

  const makeClothBumpTexture = () => {
    const cloth = document.createElement("canvas");
    cloth.width = 128;
    cloth.height = 128;
    const context = cloth.getContext("2d");
    context.fillStyle = "#808080";
    context.fillRect(0, 0, cloth.width, cloth.height);
    context.strokeStyle = "rgba(255,255,255,.2)";
    context.lineWidth = 1;
    for (let index = 2; index < cloth.width; index += 4) {
      context.beginPath();
      context.moveTo(index, 0);
      context.lineTo(index + 2, cloth.height);
      context.stroke();
    }
    context.strokeStyle = "rgba(0,0,0,.16)";
    for (let index = 1; index < cloth.height; index += 4) {
      context.beginPath();
      context.moveTo(0, index);
      context.lineTo(cloth.width, index + 1);
      context.stroke();
    }
    const texture = new THREE.CanvasTexture(cloth);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 16);
    return texture;
  };

  const clothBumpTexture = makeClothBumpTexture();

  const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0x172983, roughness: 0.76, metalness: 0.02 });
  const pageMaterial = new THREE.MeshStandardMaterial({ map: makePageTexture(), color: 0xffffff, roughness: 0.94, metalness: 0 });
  const pageBlock = new THREE.Mesh(new THREE.BoxGeometry(15.72, 8.68, 1.08, 2, 2, 2), pageMaterial);
  pageBlock.position.x = -0.05;
  book.add(pageBlock);

  const makeFlatSpineGeometry = () => {
    const segments = 1;
    const profile = [];
    const positions = [];
    const uvs = [];
    const indices = [];

    for (let index = 0; index <= segments; index += 1) {
      const progress = index / segments;
      const z = 0.62 - progress * 1.24;
      profile.push(new THREE.Vector2(-8, z));
    }
    for (let index = segments; index >= 0; index -= 1) {
      const progress = index / segments;
      const z = 0.54 - progress * 1.08;
      profile.push(new THREE.Vector2(-7.91, z));
    }

    profile.forEach((point, index) => {
      positions.push(point.x, -4.5, point.y, point.x, 4.5, point.y);
      const progress = index <= segments
        ? index / segments
        : (index - segments - 1) / segments;
      uvs.push(progress, 0, progress, 1);
    });

    // Only the outer spine plane carries the artwork; the narrow return faces
    // use the edge material so the tall texture is not squeezed into the seam.
    const outerIndexCount = segments * 6;
    for (let index = 0; index < profile.length; index += 1) {
      const next = (index + 1) % profile.length;
      const offset = index * 2;
      const nextOffset = next * 2;
      indices.push(offset, offset + 1, nextOffset + 1, offset, nextOffset + 1, nextOffset);
    }

    const capStart = indices.length;
    THREE.ShapeUtils.triangulateShape(profile, []).forEach(([a, b, c]) => {
      indices.push(a * 2, c * 2, b * 2);
      indices.push(a * 2 + 1, b * 2 + 1, c * 2 + 1);
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.addGroup(0, outerIndexCount, 0);
    geometry.addGroup(outerIndexCount, capStart - outerIndexCount, 1);
    geometry.addGroup(capStart, indices.length - capStart, 1);
    geometry.computeVertexNormals();
    return geometry;
  };

  const addBindingSeam = () => {
    const binding = new THREE.Group();
    const seamMaterial = new THREE.MeshStandardMaterial({
      color: 0x172983,
      roughness: 0.88,
      metalness: 0,
      bumpMap: clothBumpTexture,
      bumpScale: 0.008,
    });

    [-1, 1].forEach((sideSign) => {
      // A single, narrow rounded hinge is recessed into the closed joint. It
      // overlaps both the spine core and page block, so it cannot read as a
      // loose flap or reveal a cavity from top, bottom, or side views.
      const seam = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 8.54, 16), seamMaterial);
      seam.position.set(-7.89, 0, sideSign * 0.515);
      binding.add(seam);
    });

    book.add(binding);
  };

  Promise.all([
    loadTexture("assets/img/cover-front.webp"),
    loadTexture("assets/img/cover-back.webp"),
    loadTexture("assets/img/spine.webp"),
  ]).then(([frontTexture, backTexture, spineTexture]) => {
    spineTexture.wrapS = THREE.RepeatWrapping;
    spineTexture.repeat.x = -1;
    spineTexture.offset.x = 1;
    const frontMaterial = new THREE.MeshStandardMaterial({ map: frontTexture, roughness: 0.58, metalness: 0.025 });
    const backMaterial = new THREE.MeshStandardMaterial({ map: backTexture, roughness: 0.62, metalness: 0.02 });
    const spineMaterial = new THREE.MeshStandardMaterial({
      map: spineTexture,
      roughness: 0.66,
      metalness: 0.02,
      bumpMap: clothBumpTexture,
      bumpScale: 0.018,
      side: THREE.DoubleSide,
    });
    const spineEdgeMaterial = new THREE.MeshStandardMaterial({
      color: 0xe7e8ed,
      roughness: 0.9,
      metalness: 0,
      side: THREE.DoubleSide,
    });

    const frontCover = new THREE.Mesh(
      new THREE.BoxGeometry(16, 9, 0.08),
      [edgeMaterial, edgeMaterial, edgeMaterial, edgeMaterial, frontMaterial, edgeMaterial],
    );
    frontCover.position.z = 0.58;
    book.add(frontCover);

    const backCover = new THREE.Mesh(
      new THREE.BoxGeometry(16, 9, 0.08),
      [edgeMaterial, edgeMaterial, edgeMaterial, edgeMaterial, edgeMaterial, backMaterial],
    );
    backCover.position.z = -0.58;
    book.add(backCover);

    // The left spine is one continuous, flat-sided board. Its top and bottom
    // caps remain straight while the recessed seam supplies the only rounding.
    const spine = new THREE.Mesh(makeFlatSpineGeometry(), [spineMaterial, spineEdgeMaterial]);
    // Keep the spine just in front of the cover/page boundaries to avoid
    // coplanar surfaces fighting while the book rotates.
    spine.position.x = -0.015;
    book.add(spine);
    addBindingSeam();
  }).catch(() => {
    canvas.setAttribute("aria-label", "The 3D book textures could not be loaded");
  });

  const frontRotation = { x: 0.09, y: 0.43, z: -0.025 };
  const backRotation = { x: 0.09, y: Math.PI + 0.43, z: 0.025 };
  const target = { ...frontRotation };
  let side = "front";
  let dragging = false;
  let snapping = false;
  let moved = false;
  let pointerX = 0;
  let pointerY = 0;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartRotationX = frontRotation.x;
  let dragStartRotationY = frontRotation.y;
  let previousRotationX = frontRotation.x;
  let previousRotationY = frontRotation.y;
  let yAxisDirection = 1;
  let velocityX = 0;
  let velocityY = 0;
  let dragVelocityX = 0;
  let dragVelocityY = 0;

  book.rotation.set(frontRotation.x, frontRotation.y, frontRotation.z);

  const nearestEquivalentAngle = (angle, reference) =>
    angle + Math.round((reference - angle) / (Math.PI * 2)) * Math.PI * 2;

  const setSide = (nextSide) => {
    side = nextSide;
    const rotation = side === "back" ? backRotation : frontRotation;
    target.x = rotation.x;
    target.y = nearestEquivalentAngle(rotation.y, target.y);
    target.z = rotation.z;
    velocityX = 0;
    velocityY = 0;
    dragVelocityX = 0;
    dragVelocityY = 0;
    snapping = true;

    canvas.setAttribute("aria-label", `Landscape 3D book showing the ${side} cover of MCMC Plan 2026–2030`);
  };

  const toggleFacingSide = () => {
    const frontFacing = Math.cos(target.y - frontRotation.y) >= 0;
    setSide(frontFacing ? "back" : "front");
  };


  canvas.addEventListener("pointerdown", (event) => {
    dragging = true;
    snapping = false;
    moved = false;
    pointerX = event.clientX;
    pointerY = event.clientY;
    dragStartX = pointerX;
    dragStartY = pointerY;
    dragStartRotationX = book.rotation.x;
    dragStartRotationY = book.rotation.y;
    previousRotationX = book.rotation.x;
    previousRotationY = book.rotation.y;
    const normalizedX = ((Math.abs(book.rotation.x) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    yAxisDirection = normalizedX > Math.PI * 0.5 && normalizedX < Math.PI * 1.5 ? -1 : 1;
    velocityX = 0;
    velocityY = 0;
    dragVelocityX = 0;
    dragVelocityY = 0;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const dx = event.clientX - dragStartX;
    const dy = event.clientY - dragStartY;
    moved ||= Math.abs(dx) + Math.abs(dy) > 3;
    previousRotationX = book.rotation.x;
    previousRotationY = book.rotation.y;
    target.x = dragStartRotationX + dy * 0.003;
    target.y = dragStartRotationY + dx * 0.003 * yAxisDirection;
    const rotationDeltaX = target.x - previousRotationX;
    const rotationDeltaY = target.y - previousRotationY;
    if (Math.abs(rotationDeltaX) + Math.abs(rotationDeltaY) > 0.0001) {
      dragVelocityX = THREE.MathUtils.clamp(rotationDeltaX, -0.3, 0.3);
      dragVelocityY = THREE.MathUtils.clamp(rotationDeltaY, -0.3, 0.3);
    }
    book.rotation.x = target.x;
    book.rotation.y = target.y;
    pointerX = event.clientX;
    pointerY = event.clientY;
  });
  const endDrag = (event) => {
    if (!dragging) return;
    dragging = false;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (!moved) {
      toggleFacingSide();
    } else {
      velocityX = dragVelocityX;
      velocityY = dragVelocityY;
      side = "free";

      canvas.setAttribute("aria-label", "Landscape 3D book; drag horizontally to rotate it 360 degrees");
    }
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleFacingSide();
    }
  });

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    const halfVerticalFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const halfHorizontalFov = Math.atan(Math.tan(halfVerticalFov) * camera.aspect);
    const bookRadius = 9.25;
    const verticalDistance = bookRadius / Math.sin(halfVerticalFov);
    const horizontalDistance = bookRadius / Math.sin(halfHorizontalFov);
    camera.position.z = Math.max(verticalDistance, horizontalDistance) * 1.12;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  const animate = () => {
    if (!dragging && !snapping) {
      target.y += velocityY;
      target.x += velocityX;
      velocityY *= 0.95;
      velocityX *= 0.95;
      if (Math.abs(velocityY) + Math.abs(velocityX) < 0.001) {
        velocityY = 0;
        velocityX = 0;
      }
    }
    if (snapping) {
      book.rotation.x = THREE.MathUtils.lerp(book.rotation.x, target.x, 0.09);
      book.rotation.y = THREE.MathUtils.lerp(book.rotation.y, target.y, 0.09);
      if (Math.abs(book.rotation.x - target.x) + Math.abs(book.rotation.y - target.y) < 0.002) {
        book.rotation.x = target.x;
        book.rotation.y = target.y;
        snapping = false;
      }
    } else if (!dragging) {
      book.rotation.x = target.x;
      book.rotation.y = target.y;
    }
    book.rotation.z = THREE.MathUtils.lerp(book.rotation.z, target.z, 0.12);
    renderer.render(scene, camera);
    window.setTimeout(animate, 16);
  };
  window.__book3D = {
    getRotation: () => ({ x: book.rotation.x, y: book.rotation.y, targetY: target.y, dragging, snapping, velocityX, velocityY, dragVelocityX, dragVelocityY }),
    rotateTo: setSide,
  };
  animate();
}
