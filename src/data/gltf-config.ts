/**
 * 3D robot model for the playground (`public/` is served at the site root in Vite).
 *
 * `scene.gltf` in this repo is only the **JSON** side of glTF. The real meshes are in
 * `scene.bin` (referenced inside the .gltf). If you only see a **placeholder box** in the sim,
 * add the missing binary from the same export: **`public/scene.bin`** next to `scene.gltf`.
 *
 * **Alternative:** re-export as a single self-contained **`.glb`** and set the URL to that file, e.g.:
 * `export const PLAYGROUND_SCENE_GLTF_URL = "/robot.glb";`
 *
 * @see https://vitejs.dev/guide/assets.html#the-public-directory
 */
export const PLAYGROUND_SCENE_GLTF_URL = "/scene.gltf";

/**
 * Extra world Y rotation (radians) applied to the robot so the model’s **front** matches the
 * simulator’s forward direction.
 *
 * Sim convention: heading 0° moves along world **−Z**; 90° moves along **+X** (see `forwardDeltaMm`).
 * Many glTF exports face **+X** at identity, which looks like strafing unless this is set.
 *
 * Try **`Math.PI / 2`** first; if the nose still points the wrong way, try **`-Math.PI / 2`** or **`Math.PI`**.
 * No need to change `GLTF_UP_CORRECTION` in `sim-robot-3d` (that is the flip to put the model feet-down).
 */
export const PLAYGROUND_ROBOT_HEADING_YAW_OFFSET_RAD = Math.PI / 2;
