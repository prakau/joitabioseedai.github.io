import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Download, RotateCcw, Save, Trash2 } from "lucide-react";
import { defaultLayout, validateLayout, type Layout } from "../lib/plot";
import { Button } from "./ui/button";
import { Input, Textarea } from "./ui/input";
import { CropSelect, Empty, Field, Notice, Select, Title } from "./workspace";
import {
  displayDate,
  downloadJson,
  timestamp,
  uid,
  useStored,
} from "../lib/storage";
function PlotScene({
  layout,
  top,
  reset,
}: {
  layout: Layout;
  top: boolean;
  reset: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [unsupported, setUnsupported] = useState(false);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true,
      });
    } catch {
      setUnsupported(true);
      return;
    }
    setUnsupported(false);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0xf0f5f6);
    renderer.domElement.setAttribute(
      "aria-label",
      `Farm plot: ${layout.length} by ${layout.width} metres, ${layout.rows} ${layout.crop} rows, ${layout.irrigation} irrigation`,
    );
    renderer.domElement.setAttribute("role", "img");
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1000);
    const scale = 12 / Math.max(layout.length, layout.width);
    const length = layout.length * scale,
      width = layout.width * scale;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 6;
    controls.maxDistance = 36;
    controls.maxPolarAngle = Math.PI / 2.08;
    camera.position.set(top ? 0 : 9, top ? 18 : 10, top ? 0.01 : 12);
    controls.target.set(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x577063, 2.7));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(4, 10, 8);
    scene.add(light);
    const materials: THREE.Material[] = [],
      geometries: THREE.BufferGeometry[] = [];
    function box(
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      color: number,
    ) {
      const geometry = new THREE.BoxGeometry(w, h, d);
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.85,
      });
      geometries.push(geometry);
      materials.push(material);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      scene.add(mesh);
    }
    box(0, -0.18, 0, width, 0.36, length, 0x939478);
    const rowWidth = width / layout.rows;
    const cropColor =
      layout.crop === "Wheat" || layout.crop === "Mustard"
        ? 0xb3b952
        : layout.crop === "Tomato"
          ? 0x4f8e54
          : 0x579770;
    for (let row = 0; row < layout.rows; row++) {
      const x = -width / 2 + rowWidth * (row + 0.5);
      box(x, 0.16, 0, rowWidth * 0.48, 0.25, length * 0.94, cropColor);
      if (layout.irrigation === "Drip" || layout.irrigation === "Furrow")
        box(
          x + rowWidth * 0.32,
          0.025,
          0,
          Math.max(0.025, rowWidth * 0.075),
          0.04,
          length * 0.98,
          0x2582a7,
        );
    }
    if (layout.irrigation === "Sprinkler")
      for (const x of [-width / 3, width / 3])
        for (const z of [-length / 3, length / 3]) {
          box(x, 0.4, z, 0.07, 0.8, 0.07, 0x285b74);
          box(x, 0.8, z, 0.4, 0.06, 0.06, 0x2582a7);
        }
    const grid = new THREE.GridHelper(24, 24, 0xc0ccd0, 0xdbe4e7);
    grid.position.y = -0.39;
    scene.add(grid);
    function size() {
      if (!element) return;
      const w = element.clientWidth,
        h = element.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    const observer = new ResizeObserver(size);
    observer.observe(element);
    size();
    let frame = 0;
    function render() {
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    }
    render();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [
    layout.length,
    layout.width,
    layout.rows,
    layout.irrigation,
    layout.crop,
    top,
    reset,
  ]);
  return (
    <div className="plot-scene" ref={host}>
      {unsupported && (
        <div className="plot-fallback">
          <Notice>
            3D rendering is unavailable on this device. Your dimensions and
            saved layouts still work.
          </Notice>
          <div
            className="flat-plot"
            style={{
              aspectRatio: `${layout.width}/${layout.length}`,
              gridTemplateColumns: `repeat(${layout.rows}, 1fr)`,
            }}
          >
            {Array.from({ length: layout.rows }, (_, i) => (
              <span key={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
export function FarmPlot() {
  const [layouts, saveLayouts] = useStored<
    (Layout & { id: string; date: string })[]
  >("joita-fa-layouts", []);
  const [draft, setDraft] = useState({
    ...defaultLayout,
    length: String(defaultLayout.length),
    width: String(defaultLayout.width),
    rows: String(defaultLayout.rows),
  });
  const [view, setView] = useState<Layout>(defaultLayout);
  const [top, setTop] = useState(false);
  const [reset, setReset] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const value = {
      ...draft,
      length: Number(draft.length),
      width: Number(draft.width),
      rows: Number(draft.rows),
    };
    if (!validateLayout(value)) setView(value);
  }, [draft]);
  function save() {
    const value = {
      ...draft,
      length: Number(draft.length),
      width: Number(draft.width),
      rows: Number(draft.rows),
    };
    const reason = validateLayout(value);
    setError(reason);
    setMessage("");
    if (reason) return;
    if (
      saveLayouts(
        [{ id: uid(), ...value, date: timestamp() }, ...layouts].slice(0, 30),
      )
    )
      setMessage("Layout saved. Reopen it from Saved layouts below.");
  }
  return (
    <>
      <Title
        title="Farm visualizer"
        description="Plan a rectangular field with measured dimensions, crop rows, and irrigation."
      />
      <div className="plot-toolbar">
        <div className="segmented">
          <button aria-pressed={!top} onClick={() => setTop(false)}>
            3D view
          </button>
          <button aria-pressed={top} onClick={() => setTop(true)}>
            Top view
          </button>
        </div>
        <Button
          variant="ghost"
          title="Reset camera"
          aria-label="Reset camera"
          onClick={() => setReset(reset + 1)}
        >
          <RotateCcw size={19} />
        </Button>
      </div>
      <PlotScene layout={view} top={top} reset={reset} />
      <div className="plot-caption">
        <span>
          {view.length} m x {view.width} m
        </span>
        <span>
          {(view.length * view.width).toLocaleString("en-IN")} m2 /{" "}
          {((view.length * view.width) / 10000).toFixed(3)} ha
        </span>
        <span>
          {view.rows} rows / {(view.width / view.rows).toFixed(2)} m centre
          spacing
        </span>
      </div>
      <p className="muted">
        Schematic field plan, not a land survey or crop-spacing recommendation.
        Blue lines mark irrigation; crop strips mark rows.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="fields fields-3">
          <Field label="Length (metres)">
            <Input
              type="number"
              min="1"
              max="2000"
              step="any"
              required
              value={draft.length}
              onChange={(e) => setDraft({ ...draft, length: e.target.value })}
            />
          </Field>
          <Field label="Width (metres)">
            <Input
              type="number"
              min="1"
              max="2000"
              step="any"
              required
              value={draft.width}
              onChange={(e) => setDraft({ ...draft, width: e.target.value })}
            />
          </Field>
          <Field label="Number of rows">
            <Input
              type="number"
              min="1"
              max="100"
              step="1"
              required
              value={draft.rows}
              onChange={(e) => setDraft({ ...draft, rows: e.target.value })}
            />
          </Field>
          <CropSelect
            value={draft.crop}
            onChange={(crop) => setDraft({ ...draft, crop })}
          />
          <Field label="Irrigation">
            <Select
              value={draft.irrigation}
              onChange={(e) =>
                setDraft({ ...draft, irrigation: e.target.value })
              }
            >
              {["Drip", "Furrow", "Sprinkler", "Rainfed"].map((type) => (
                <option key={type}>{type}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Field notes">
          <Textarea
            value={draft.notes}
            maxLength={1000}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            placeholder="Drainage, access, or planting notes"
          />
        </Field>
        <Button>
          <Save size={18} />
          Save layout
        </Button>
      </form>
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      <section className="section-divider">
        <h3>Saved layouts</h3>
        {!layouts.length && <Empty>No layouts saved yet.</Empty>}
        {layouts.map((item) => (
          <div className="saved-row" key={item.id}>
            <button
              className="text-link"
              onClick={() => {
                if (validateLayout(item)) {
                  setError(
                    "This older layout has invalid dimensions. Create and save a corrected layout.",
                  );
                  return;
                }
                setDraft({
                  ...item,
                  length: String(item.length),
                  width: String(item.width),
                  rows: String(item.rows),
                });
                setMessage("Saved layout opened.");
              }}
            >
              {item.crop}: {item.length} x {item.width} m
              <small>{displayDate(item.date)}</small>
            </button>
            <Button
              variant="ghost"
              aria-label="Export layout"
              title="Export layout"
              onClick={() => downloadJson("farm-layout.json", item)}
            >
              <Download size={18} />
            </Button>
            <Button
              variant="ghost"
              aria-label="Delete layout"
              title="Delete layout"
              onClick={() =>
                saveLayouts(layouts.filter((l) => l.id !== item.id))
              }
            >
              <Trash2 size={18} />
            </Button>
          </div>
        ))}
      </section>
    </>
  );
}
