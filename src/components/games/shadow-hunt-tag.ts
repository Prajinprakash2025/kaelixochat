import * as THREE from "three";

type Target = { id: number; model: THREE.Object3D };

export function createTagRaycast(blockers: THREE.Mesh[]) {
  const ray = new THREE.Raycaster();
  const targetMeshes = new Map<THREE.Object3D, number>();

  function visible(object: THREE.Object3D): boolean {
    return object.visible && (!object.parent || visible(object.parent));
  }

  return function cast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    range: number,
    targets: Target[],
    viewOnly = false,
  ) {
    targetMeshes.clear();
    for (const target of targets) {
      target.model.updateWorldMatrix(true, true);
      target.model.traverseVisible(object => {
        if (object instanceof THREE.Mesh) targetMeshes.set(object, target.id);
      });
    }
    ray.set(origin, direction);
    ray.far = range;
    ray.near = 0.015;
    const world = viewOnly ? blockers.filter(visible) : blockers;
    const first = ray.intersectObjects([...world, ...targetMeshes.keys()], false)[0];
    return {
      targetId: first ? targetMeshes.get(first.object) : undefined,
      point: first?.point ?? origin.clone().addScaledVector(direction, range),
      hitSurface: !!first,
    };
  };
}
