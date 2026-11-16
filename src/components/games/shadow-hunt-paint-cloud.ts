import { createClient } from "@/lib/supabase/client";
import type { PaintDesign, PaintSurface } from "./shadow-hunt-paint";

const BUCKET = "player-paintings";
const TILE = 512;
export type Painting = {
  id: string;
  design_name: string;
  storage_path: string;
  thumbnail_path: string | null;
  texture_version: number;
  is_active: boolean;
};
const FIELDS = "id,design_name,storage_path,thumbnail_path,texture_version,is_active";

export async function listPaintings(userId: string) {
  const { data, error } = await createClient().from("player_paintings")
    .select(FIELDS).eq("user_id", userId).order("updated_at", { ascending: false });
  if (error) throw error;
  return data as Painting[];
}

export async function activePainting(userId: string) {
  const { data, error } = await createClient().from("player_paintings").select(FIELDS)
    .eq("user_id", userId).eq("is_active", true).maybeSingle();
  if (error) throw error;
  return data as Painting | null;
}

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function png(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => {
    if (blob) resolve(blob);
    else reject(new Error("Couldn't export the painting."));
  }, "image/png"));
}

export async function exportPainting(surfaces: PaintSurface[]) {
  const atlas = makeCanvas(3 * TILE, 2 * TILE);
  const context = atlas.getContext("2d")!;
  for (const surface of surfaces) {
    const i = Number(surface.id);
    context.drawImage(surface.layer, (i % 3) * TILE, Math.floor(i / 3) * TILE);
  }
  const preview = makeCanvas(192, 128);
  const previewContext = preview.getContext("2d")!;
  previewContext.fillStyle = "#e9dfd3";
  previewContext.fillRect(0, 0, preview.width, preview.height);
  previewContext.drawImage(atlas, 0, 0, preview.width, preview.height);
  const [texture, thumbnail] = await Promise.all([png(atlas), png(preview)]);
  if (texture.size > 8 * 1024 * 1024) throw new Error("The PNG is larger than the 8 MB limit.");
  return { texture, thumbnail };
}

export async function loadPainting(row: Painting): Promise<PaintDesign> {
  const { data, error } = await createClient().storage.from(BUCKET).download(row.storage_path);
  if (error) throw error;
  const image = await createImageBitmap(data);
  try {
    if (image.width !== 3 * TILE || image.height !== 2 * TILE) throw new Error("Invalid painting texture size.");
    const layer = makeCanvas(TILE, TILE);
    const ctx = layer.getContext("2d")!;
    const design: PaintDesign = {};
    for (let i = 0; i < 6; i++) {
      ctx.clearRect(0, 0, TILE, TILE);
      ctx.drawImage(image, (i % 3) * TILE, Math.floor(i / 3) * TILE, TILE, TILE, 0, 0, TILE, TILE);
      design[i] = layer.toDataURL("image/png");
    }
    return design;
  } finally { image.close(); }
}

export async function paintingThumbnails(rows: Painting[]) {
  const paths = rows.flatMap(row => row.thumbnail_path ? [row.thumbnail_path] : []);
  if (!paths.length) return {};
  const { data, error } = await createClient().storage.from(BUCKET).createSignedUrls(paths, 600);
  if (error) throw error;
  const images = (data ?? []) as { path: string | null; signedUrl: string | null }[];
  return Object.fromEntries(images.flatMap(item => item.path && item.signedUrl ? [[item.path, item.signedUrl]] : []));
}

export async function savePainting(
  userId: string, id: string, name: string, files: Awaited<ReturnType<typeof exportPainting>>,
  previous: Painting | undefined, progress: (message: string) => void,
) {
  const client = createClient();
  const storage = client.storage.from(BUCKET);
  const table = () => client.from("player_paintings");
  const paths = (row: Painting) => [row.storage_path, ...(row.thumbnail_path ? [row.thumbnail_path] : [])];
  const { data: current, error: lookupError } = await table().select(FIELDS).eq("id", id).maybeSingle();
  if (lookupError) throw lookupError;
  // A response may have been lost after a new design was committed. Keep the same ID on retry.
  if (!previous && current) throw new Error("This design was already saved. Refresh Saved designs before editing it.");
  if (previous && current?.texture_version !== previous.texture_version) {
    throw new Error("This design changed in another session. Reload it or save your draft as a new design.");
  }
  const base = `${userId}/${id}-${crypto.randomUUID()}`;
  const storage_path = base + ".png", thumbnail_path = base + "-thumb.png";
  progress("Uploading texture…");
  const textureResult = await storage.upload(storage_path, files.texture, { contentType: "image/png", upsert: false, cacheControl: "60" });
  if (textureResult.error) throw textureResult.error;
  progress("Uploading thumbnail…");
  const thumbnailResult = await storage.upload(thumbnail_path, files.thumbnail, { contentType: "image/png", upsert: false, cacheControl: "60" });
  if (thumbnailResult.error) {
    await storage.remove([storage_path, thumbnail_path]).catch(() => {});
    throw thumbnailResult.error;
  }
  progress("Saving design…");
  const values = { design_name: name, storage_path, thumbnail_path,
    texture_version: (previous?.texture_version ?? 0) + 1, updated_at: new Date().toISOString() };
  const result = previous
    ? await table().update(values).eq("id", id).eq("texture_version", previous.texture_version).select(FIELDS).maybeSingle()
    : await table().insert({ ...values, id, user_id: userId }).select(FIELDS).single();
  if (result.error || !result.data) {
    // Check whether an interrupted response actually committed before deleting staged files.
    const check = await table().select(FIELDS).eq("id", id).maybeSingle();
    if (!check.error && check.data?.storage_path === storage_path) return check.data as Painting;
    if (!check.error) await storage.remove([storage_path, thumbnail_path]).catch(() => {});
    throw result.error ?? new Error("Design changed in another session. Load the latest version or save a new copy.");
  }
  if (previous) await storage.remove(paths(previous)).catch(() => {});
  return result.data as Painting;
}

export async function renamePainting(id: string, designName: string) {
  const { data, error } = await createClient().from("player_paintings")
    .update({ design_name: designName, updated_at: new Date().toISOString() })
    .eq("id", id).select(FIELDS).single();
  if (error) throw error;
  return data as Painting;
}

export async function deletePainting(row: Painting) {
  const client = createClient();
  const { error } = await client.from("player_paintings").delete().eq("id", row.id)
    .eq("texture_version", row.texture_version).select("id").single();
  if (error) throw error;
  const { error: cleanupError } = await client.storage.from(BUCKET)
    .remove([row.storage_path, ...(row.thumbnail_path ? [row.thumbnail_path] : [])]);
  return !cleanupError;
}

export async function activatePainting(id: string) {
  const { error } = await createClient().rpc("activate_player_painting", { design_id: id });
  if (error) throw error;
}
