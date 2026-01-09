import * as THREE from "three";

// Character animations
export const animateDodgeJump = (characterMesh) => {
  if (!characterMesh) return;

  const baseY = characterMesh.userData.baseY;
  characterMesh.userData.animating = true;

  // Assuming animationsRef is global or passed, but for now, inline
  // This needs to be handled in the component
  // For simplicity, I'll assume it's passed or use a callback
  // Actually, since it's using refs, perhaps keep in component, but let's extract as is, assuming refs are passed.

  // Wait, better to make it a function that takes animationsRef
};

export const createProjectile = (
  sceneRef,
  projectilesRef,
  from,
  to,
  color,
  target,
  dodged = false
) => {
  if (!sceneRef.current) return;

  const geometry = new THREE.SphereGeometry(0.3, 16, 16);
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.8,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(from);

  const glowGeometry = new THREE.SphereGeometry(0.5, 16, 16);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.3,
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  mesh.add(glow);

  sceneRef.current.add(mesh);

  const direction = new THREE.Vector3().subVectors(to, from).normalize();
  projectilesRef.current.push({
    mesh,
    velocity: direction.multiplyScalar(0.3),
    life: 30,
    target,
    color,
    hit: false,
    dodged,
  });
};

export const createImpactEffect = (sceneRef, position, color, dodged) => {
  if (!sceneRef.current) return;

  if (dodged) {
    const geometry = new THREE.TorusGeometry(0.8, 0.1, 8, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.8,
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.position.copy(position);
    ring.rotation.x = Math.PI / 2;
    sceneRef.current.add(ring);

    let scale = 1;
    const animateMiss = () => {
      scale += 0.1;
      ring.scale.set(scale, scale, scale);
      material.opacity -= 0.05;
      if (material.opacity > 0) {
        requestAnimationFrame(animateMiss);
      } else {
        sceneRef.current.remove(ring);
      }
    };
    animateMiss();
    return;
  }

  for (let i = 0; i < 12; i++) {
    const geometry = new THREE.SphereGeometry(0.2, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
    });
    const particle = new THREE.Mesh(geometry, material);
    particle.position.copy(position);

    const angle = (i / 12) * Math.PI * 2;
    const velocity = new THREE.Vector3(
      Math.cos(angle) * 0.15,
      Math.random() * 0.1,
      Math.sin(angle) * 0.15
    );

    sceneRef.current.add(particle);

    const animateParticle = () => {
      particle.position.add(velocity);
      velocity.y -= 0.01;
      material.opacity -= 0.03;

      if (material.opacity > 0) {
        requestAnimationFrame(animateParticle);
      } else {
        sceneRef.current.remove(particle);
      }
    };
    animateParticle();
  }
};

export const createShieldEffect = (sceneRef, position) => {
  if (!sceneRef.current) return;

  const geometry = new THREE.SphereGeometry(1.2, 32, 32);
  const material = new THREE.MeshBasicMaterial({
    color: 0x4ecca3,
    transparent: true,
    opacity: 0.4,
    wireframe: true,
  });
  const shield = new THREE.Mesh(geometry, material);
  shield.position.copy(position);
  sceneRef.current.add(shield);

  let scale = 0;
  const animateShield = () => {
    scale += 0.05;
    shield.scale.set(scale, scale, scale);
    material.opacity = 0.6 - scale * 0.3;

    if (scale < 1.5) {
      requestAnimationFrame(animateShield);
    } else {
      sceneRef.current.remove(shield);
    }
  };
  animateShield();
};

export const createHealEffect = (sceneRef, position) => {
  if (!sceneRef.current) return;

  for (let i = 0; i < 8; i++) {
    const geometry = new THREE.SphereGeometry(0.15, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0x4ecca3,
      transparent: true,
      opacity: 0.8,
    });
    const particle = new THREE.Mesh(geometry, material);
    particle.position.copy(position);
    particle.position.y += Math.random() * 2 - 1;
    sceneRef.current.add(particle);

    const targetY = position.y + 3;
    const animateHeal = () => {
      particle.position.y += 0.1;
      material.opacity -= 0.02;

      if (particle.position.y < targetY && material.opacity > 0) {
        requestAnimationFrame(animateHeal);
      } else {
        sceneRef.current.remove(particle);
      }
    };
    setTimeout(() => animateHeal(), i * 50);
  }
};
