import * as THREE from "three";

const pixels = new WeakMap<THREE.Texture, ImageData>();

export function sampleSurface(hit: THREE.Intersection<THREE.Mesh>) {
  const material = Array.isArray(hit.object.material)
    ? hit.object.material[hit.face?.materialIndex ?? 0]
    : hit.object.material;
  if (!material || !("color" in material) || !(material.color instanceof THREE.Color)) return null;
  const color = material.color.clone();
  const map = "map" in material && material.map instanceof THREE.Texture ? material.map : null;
  if (map && hit.uv) {
    try {
      let image = pixels.get(map);
      if (!image) {
        const source = map.image as HTMLCanvasElement | HTMLImageElement;
        const canvas = document.createElement("canvas");
        canvas.width = source.width;
        canvas.height = source.height;
        const context = canvas.getContext("2d", { willReadFrequently: true })!;
        context.drawImage(source, 0, 0);
        image = context.getImageData(0, 0, canvas.width, canvas.height);
        pixels.set(map, image);
      }
      if (map.matrixAutoUpdate) map.updateMatrix();
      const uv = map.transformUv(hit.uv.clone());
      const x = THREE.MathUtils.clamp(Math.floor(uv.x * image.width), 0, image.width - 1);
      const y = THREE.MathUtils.clamp(Math.floor(uv.y * image.height), 0, image.height - 1);
      const i = (y * image.width + x) * 4;
      color.multiply(new THREE.Color().setRGB(
        image.data[i] / 255, image.data[i + 1] / 255, image.data[i + 2] / 255, map.colorSpace,
      ));
    } catch { return null; }
  }
  const hex = "#" + color.getHexString();
  const rgb = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
  return { hex, rgb };
}
