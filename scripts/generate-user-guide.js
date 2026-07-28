/**
 * Generates docs/BuildVision-AI-User-Guide.pdf — a full usage guide for the
 * planner covering every implemented feature. Plain Node + jsPDF, no
 * browser/DOM dependency, so it can be regenerated any time the product
 * changes with:
 *
 *   node scripts/generate-user-guide.js
 *
 * Not part of the Next.js app bundle — a standalone CommonJS build tool,
 * so the TS-project ESLint rules (no-require-imports, etc.) don't apply.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { jsPDF } = require("jspdf");

// ---------------------------------------------------------------- layout ---
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 18;
const MARGIN_TOP = 22;
const MARGIN_BOTTOM = 20;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const MM_PER_PT = 0.3527;

const INK = "#121820";
const MUTED = "#5b6570";
const BRAND = "#2563EB";
const CRITICAL = "#dc2626";
const WARNING = "#b45309";
const RULE = "#d8dee7";

const doc = new jsPDF({ unit: "mm", format: "a4" });
let y = MARGIN_TOP;
let chapterNo = 0;
let currentChapterTitle = "";
const toc = []; // { title, page }

function lh(sizePt, leading = 1.28) {
  return sizePt * MM_PER_PT * leading;
}

function newPage(repeatHeader) {
  doc.addPage();
  y = MARGIN_TOP;
  if (repeatHeader && currentChapterTitle) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(MUTED);
    doc.text(currentChapterTitle, MARGIN_X, 12);
    doc.setDrawColor(RULE);
    doc.line(MARGIN_X, 14, PAGE_W - MARGIN_X, 14);
  }
}

function ensure(space) {
  if (y + space > PAGE_H - MARGIN_BOTTOM) newPage(true);
}

function chapter(title) {
  chapterNo += 1;
  currentChapterTitle = `${chapterNo}. ${title}`;
  newPage(false);
  toc.push({ title: `${chapterNo}. ${title}`, page: doc.getNumberOfPages() });

  doc.setFillColor(BRAND);
  doc.rect(MARGIN_X, y - 6, 10, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor("#ffffff");
  doc.text(String(chapterNo), MARGIN_X + 5, y, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.setTextColor(INK);
  doc.text(title, MARGIN_X + 15, y + 1);
  y += 9;
  doc.setDrawColor(BRAND);
  doc.setLineWidth(0.6);
  doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y);
  doc.setLineWidth(0.2);
  y += 9;
}

function heading2(text) {
  ensure(lh(13) + 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(BRAND);
  doc.text(text, MARGIN_X, y);
  y += lh(13) + 2.5;
}

function paragraph(text, opts = {}) {
  const size = opts.size ?? 10.2;
  doc.setFont("helvetica", opts.bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.setTextColor(opts.color ?? INK);
  const lines = doc.splitTextToSize(text, opts.width ?? CONTENT_W);
  const step = lh(size);
  for (const line of lines) {
    ensure(step);
    doc.text(line, MARGIN_X, y);
    y += step;
  }
  y += opts.gap ?? 3;
}

/**
 * Renders a bullet list. Each item is either a plain string, or
 * `{ label, body }` which is rendered as "**label** — body" by drawing the
 * bold label and the rest of the (wrapped) sentence as one continuous run
 * so long entries always wrap safely instead of overlapping the margin.
 */
function bullets(items, opts = {}) {
  const size = opts.size ?? 10.2;
  const indent = opts.indent ?? 5;
  const usableW = CONTENT_W - indent;
  const step = lh(size);
  doc.setFontSize(size);

  for (const raw of items) {
    const isObj = typeof raw === "object";
    const label = isObj ? raw.label : null;
    const body = isObj ? raw.body : raw;

    ensure(step);
    doc.setFillColor(BRAND);
    doc.circle(MARGIN_X + 1, y - 1.1, 0.7, "F");

    if (label) {
      // Bold label word-wrapped on its own; body continues on the next
      // line so we never have to compute mixed-font wrap widths.
      doc.setFont("helvetica", "bold");
      doc.setTextColor(INK);
      const labelLines = doc.splitTextToSize(`${label}`, usableW);
      labelLines.forEach((line, i) => {
        if (i > 0) ensure(step);
        doc.text(line, MARGIN_X + indent, y);
        y += step;
      });
      doc.setFont("helvetica", "normal");
      doc.setTextColor(MUTED);
      const bodyLines = doc.splitTextToSize(body, usableW);
      bodyLines.forEach((line) => {
        ensure(step);
        doc.text(line, MARGIN_X + indent, y);
        y += step;
      });
    } else {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(INK);
      const lines = doc.splitTextToSize(String(body), usableW);
      lines.forEach((line, i) => {
        if (i > 0) ensure(step);
        doc.text(line, MARGIN_X + indent, y);
        y += step;
      });
    }
    y += 1.4;
  }
  y += opts.gap ?? 2;
}

function note(text, kind = "info") {
  const size = 9.6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(size);
  const lines = doc.splitTextToSize(text, CONTENT_W - 10);
  const boxH = lines.length * lh(size) + 6;
  ensure(boxH + 3);
  const bg =
    kind === "warning" ? "#fffbeb" : kind === "critical" ? "#fef2f2" : "#eff6ff";
  const border = kind === "warning" ? WARNING : kind === "critical" ? CRITICAL : BRAND;
  doc.setFillColor(bg);
  doc.setDrawColor(border);
  doc.roundedRect(MARGIN_X, y - 4, CONTENT_W, boxH, 2, 2, "FD");
  doc.setTextColor(border);
  let ty = y;
  for (const line of lines) {
    doc.text(line, MARGIN_X + 5, ty);
    ty += lh(size);
  }
  y += boxH + 4;
}

function table(headers, rows, colWidths) {
  const size = 9.4;
  const rowH = lh(size) + 3.2;
  const widths = colWidths ?? headers.map(() => CONTENT_W / headers.length);
  ensure(rowH + 2);
  // header
  doc.setFillColor("#121820");
  doc.rect(MARGIN_X, y - rowH + 3, CONTENT_W, rowH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(size);
  doc.setTextColor("#ffffff");
  let x = MARGIN_X + 2;
  headers.forEach((h, i) => {
    doc.text(h, x, y);
    x += widths[i];
  });
  y += rowH;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(INK);
  rows.forEach((row, ri) => {
    ensure(rowH + 2);
    if (ri % 2 === 1) {
      doc.setFillColor("#f4f6f8");
      doc.rect(MARGIN_X, y - rowH + 3, CONTENT_W, rowH, "F");
    }
    x = MARGIN_X + 2;
    row.forEach((cell, i) => {
      const cellLines = doc.splitTextToSize(String(cell), widths[i] - 4);
      doc.text(cellLines[0] ?? "", x, y);
      x += widths[i];
    });
    y += rowH;
  });
  y += 4;
}

// ================================================================ COVER ===
doc.setFillColor(INK);
doc.rect(0, 0, PAGE_W, PAGE_H, "F");
doc.setFillColor(BRAND);
doc.rect(0, 118, PAGE_W, 2.2, "F");

doc.setFont("helvetica", "bold");
doc.setFontSize(13);
doc.setTextColor("#93c5fd");
doc.text("BUILDVISION AI", MARGIN_X, 90);

doc.setFontSize(30);
doc.setTextColor("#ffffff");
doc.text("3D Building Planner", MARGIN_X, 104);
doc.text("User & Platform Guide", MARGIN_X, 114);

doc.setFont("helvetica", "normal");
doc.setFontSize(12);
doc.setTextColor("#cbd5e1");
const coverIntro = doc.splitTextToSize(
  "A complete walkthrough of the real-time 3D planning workspace: floors, " +
    "pillars, beams, slabs, walls, doors, windows, stairs, structural " +
    "validation, AI recommendations, cost estimation, and every control on " +
    "screen.",
  CONTENT_W - 10
);
let cy = 132;
coverIntro.forEach((l) => {
  doc.text(l, MARGIN_X, cy);
  cy += 6.2;
});

doc.setFontSize(10);
doc.setTextColor("#94a3b8");
doc.text(
  new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }),
  MARGIN_X,
  PAGE_H - 20
);
doc.text("Generated automatically from the live product", MARGIN_X, PAGE_H - 14);

// ============================================================ CONTENTS ===
doc.addPage();
y = MARGIN_TOP;
doc.setFont("helvetica", "bold");
doc.setFontSize(20);
doc.setTextColor(INK);
doc.text("Contents", MARGIN_X, y);
y += 12;
const TOC_PLACEHOLDER_PAGE = doc.getNumberOfPages();

// ================================================================ BODY ===

chapter("Welcome to BuildVision AI");
paragraph(
  "BuildVision AI is a real-time, browser-based 3D building planning " +
    "platform for houses, apartments, villas, commercial buildings and " +
    "offices. Everything happens inside one always-visible 3D model — " +
    "there are no separate 2D/3D editing pages to switch between. Every " +
    "change you make (moving a column, adding a floor, drawing a wall) " +
    "instantly updates the whole structure: connected beams stretch, " +
    "slabs rebuild, and material quantities recalculate live."
);
heading2("What you can do");
bullets([
  "Design a multi-storey building directly in 3D with pillars, beams, slabs, walls, doors, windows and stairs.",
  "Get live engineering feedback — the app checks column/beam/slab capacity and geometry sanity as you work.",
  "See cost, concrete and steel estimates update automatically.",
  "Get AI layout suggestions and structural recommendations with one-click apply.",
  "Undo/redo every change, and multi-select groups of pillars/beams to move them together.",
]);
heading2("Who this guide is for");
paragraph(
  "This guide covers everyday usage of the planner: navigating the 3D " +
    "view, placing and editing structural elements, reading validation " +
    "warnings, and using the AI/cost panel. It assumes no engineering " +
    "background — every safety/engineering check the app runs is explained " +
    "in plain language."
);

// -------------------------------------------------------------------------
chapter("Getting Started");
heading2("Accounts & access");
paragraph(
  "The marketing/landing pages (home, features, pricing) are open to " +
    "everyone. The planning tools themselves require an account:"
);
bullets([
  "3D Building Planner",
  "AI Structural Assistant",
  "Cost Estimator",
  "Webcam Measurement Tool",
  "Project saving & export",
  "Collaboration features",
]);
paragraph(
  "Visiting any of these while signed out redirects you to Login/Sign up " +
    "and brings you straight back afterward. Once logged in, your session " +
    "is remembered until you sign out."
);
heading2("Starting a project");
bullets([
  "From the dashboard, open an existing project/building, or start a new one — the planner opens with a demo structure pre-loaded so you always have something to explore.",
  "The planner URL can carry a projectId/buildingId; if present, your saved building's width, length and floor count are loaded automatically.",
  "If nothing is saved yet, a demo office/residential structure is generated so the workspace is never empty.",
]);

// -------------------------------------------------------------------------
chapter("The 3D Workspace");
paragraph(
  "The planner is one full-screen 3D scene. A floating toolbar sits at the " +
    "top, an optional left panel lists floors/layers, the Property " +
    "Inspector appears bottom-right when something is selected, and the " +
    "Cost & AI panel slides in from the right."
);
heading2("Camera controls");
table(
  ["Action", "Mouse / Trackpad", "Touch"],
  [
    ["Orbit", "Left-drag", "One-finger drag"],
    ["Pan", "Right-drag (or Shift+drag)", "Two-finger drag"],
    ["Zoom", "Scroll wheel", "Pinch"],
    ["Select", "Left-click", "Tap"],
  ],
  [45, 80, 65]
);
heading2("Camera view presets");
paragraph(
  "The toolbar's view group frames the whole building instantly:"
);
bullets([
  { label: "3D", body: "default perspective / three-quarter view" },
  { label: "Iso", body: "true isometric angle, good for measuring proportions" },
  { label: "Top", body: "plan view, looking straight down" },
  { label: "Front", body: "front elevation, camera at building mid-height" },
  { label: "Side", body: "side elevation" },
  { label: "Reset (circular arrow icon)", body: "returns to the default framing" },
]);
note(
  "There's also an axis gizmo in the bottom-right corner of the 3D view — " +
    "click any face or axis on it to snap the camera to that view, same as " +
    "the toolbar buttons."
);
heading2("Display toggles (toolbar)");
bullets([
  { label: "Inside", body: "walk inside the building at eye level; use WASD to move, mouse to look around, Esc to exit" },
  { label: "Cutaway", body: "hides the roof and floors above the active one so you can see/edit the room you're on" },
  { label: "Wire", body: "wireframe rendering of every member" },
  { label: "Rebar", body: "shows a schematic reinforcement cage inside pillars" },
  { label: "Labels", body: "shows floating name tags over every pillar/beam (off by default to reduce clutter — turn on when you need it)" },
  { label: "Dims", body: "shows dimensions on the currently selected member" },
  { label: "Explode", body: "separates floors vertically so you can see the whole stack at once" },
  { label: "Snap", body: "snaps dragged elements to the 0.25 m grid" },
  { label: "Rot", body: "rotates the whole building footprint 15° at a time" },
  { label: "Inspect", body: "opens/closes the Property Inspector panel" },
]);

// -------------------------------------------------------------------------
chapter("Toolbar & Tools");
paragraph(
  "The left tool group switches what clicking in the 3D view does. The " +
    "active tool is highlighted."
);
table(
  ["Tool", "What it does"],
  [
    ["Select", "Click/drag pillars, walls, stairs, doors & windows. Ctrl/⌘+click a pillar or beam to add it to a group selection."],
    ["Pillar", "Click the ground (or double-click in Select mode) to add a column at that point."],
    ["Wall", "Click a start point, then an end point, to draw a wall between them."],
    ["Door", "Click on an existing wall to place a door on it."],
    ["Window", "Click on an existing wall to place a window on it."],
    ["Stair", "Click the ground to place a staircase; it auto-sizes to the current floor height."],
    ["Delete", "Click any pillar, wall, opening or stair to remove it."],
  ],
  [26, 149]
);
note("Press Esc at any time to cancel a wall/stair draft, drop out of group-select, and clear the current selection.", "info");

// -------------------------------------------------------------------------
chapter("Floors");
paragraph(
  "The floor strip (toolbar, right side) lists every floor as F1, F2, … " +
    "You can have up to 20 floors."
);
bullets([
  { label: "Switch floor", body: "click its chip — this becomes the \"active\" floor for placing walls/doors/stairs" },
  { label: "Add floor (+ Floor)", body: "duplicates the structural grid & walls from the floor below onto a new floor" },
  { label: "Remove floor (−)", body: "removes the active floor (disabled once you're down to 1 floor)" },
  { label: "All floors / Isolate", body: "toggle whether every floor renders at once, or only the active one" },
]);
note(
  "Floor height, slab thickness and wall height are set per building in " +
    "the building configuration; when floor height changes, connected " +
    "beams, slabs and stairs automatically recompute (stairs re-fit their " +
    "step count rather than changing the floor height)."
);

// -------------------------------------------------------------------------
chapter("Pillars (Columns)");
heading2("Placing & moving");
bullets([
  "With the Pillar tool active, click anywhere on the ground/active floor plane to add a column.",
  "With the Select tool, click-drag a pillar to reposition it — connected beams, slabs, walls and openings update live as you drag.",
  "Works identically with mouse, touch (drag with one finger) and — once selected — arrow keys to nudge in small steps.",
]);
heading2("Multi-select / group editing");
bullets([
  "Ctrl (Windows) or ⌘ (Mac) + click a pillar or beam to add it to a group (highlighted amber).",
  "Ctrl/⌘+click again to remove it from the group.",
  "Drag any grouped pillar to move the whole group together as one rigid body — every connected beam/slab updates automatically.",
  "Delete/Backspace removes the entire selected group at once.",
]);
heading2("Pillar properties (Property Inspector)");
paragraph("Selecting a pillar opens its panel with editable:");
bullets([
  "Width, depth (length), height, shape (Square / Rectangle / Circular)",
  "Concrete grade, steel grade, clear cover",
  "Longitudinal reinforcement bars & stirrup spacing/shape/hook type",
  "Name, rotation, and exact X/Y location",
  "Foundation type (isolated, combined, strip, raft, pile) via the Site tab",
]);
note(
  "The inspector never pops open automatically when you click a pillar or " +
    "wall — it only opens if you toggle \"Inspect\" in the toolbar, so " +
    "selecting/dragging never gets interrupted by a panel appearing " +
    "mid-drag."
);

// -------------------------------------------------------------------------
chapter("Beams & Slabs");
heading2("Beams");
paragraph(
  "Beams are generated automatically between neighbouring pillars — you " +
    "don't draw them by hand. Ctrl/⌘+click a beam to select it (this also " +
    "selects the two pillars it connects to)."
);
bullets([
  "Editable: width, depth, elevation, concrete/steel grade, support condition (simply supported / continuous / cantilever), top/bottom/support reinforcement.",
  "If a pillar moves, its beams re-snap to the new column position and re-check their depth against the new span.",
  "If a beam can't safely span the distance, it's flagged (see Structural Validation, next chapter) instead of silently failing.",
]);
heading2("Slabs");
paragraph(
  "One slab plate covers each floor and rebuilds automatically whenever " +
    "columns or beams move."
);
bullets([
  "Editable: thickness, one-way/two-way/flat system, steel direction, finish load, waterproofing, top/bottom mesh reinforcement.",
  "Live checks confirm the slab is thick enough for its span and load before you build.",
]);

// -------------------------------------------------------------------------
chapter("Walls, Doors & Windows");
heading2("Walls");
bullets([
  "Select the Wall tool, click a start point, then an end point — the wall is drawn between them on the active floor.",
  "With the Select tool, drag any wall to reposition it (a fatter invisible hit-box makes thin walls easy to grab with mouse or finger).",
  "Editable: thickness, height, material, bearing type (load-bearing / non-load-bearing), lintel depth.",
]);
heading2("Doors & windows")
bullets([
  "Select the Door or Window tool, then click anywhere on an existing wall — the opening snaps onto that wall at the clicked point.",
  "With Select, click a placed door/window to edit its width, height and sill height, or to delete it.",
  "Doors and windows only respond to clicks/edits on the currently active floor, so you never accidentally edit the wrong storey while multiple floors are visible.",
]);

// -------------------------------------------------------------------------
chapter("Smart Stair Designer");
paragraph(
  "Place a stair with the Stair tool, then drag it or select it to edit " +
    "its properties."
);
heading2("How the auto-fit works");
paragraph(
  "You set a target step rise (mm) and tread (mm); the number of steps is " +
    "then computed live from the current floor-to-floor height, so " +
    "changing the stair's width or run never changes your floor height — " +
    "the stair simply re-fits itself with more or fewer steps."
);
heading2("Editable properties");
bullets([
  "Width, run (depth), X/Y position",
  "Stair type (straight, dog-legged, spiral), rise (mm), tread (mm)",
  "Waist thickness",
]);
heading2("Built-in safety checks");
table(
  ["Check", "Safe range used"],
  [
    ["Step rise", "150–200 mm"],
    ["Tread/run", "≥ 250 mm"],
    ["Comfort formula (2×Rise + Tread)", "550–700 mm"],
    ["Minimum stair width", "≥ 0.75 m"],
  ],
  [95, 80]
);
note(
  "A stair outside any of these ranges glows amber in 3D with a hover " +
    "tooltip explaining exactly which check failed — see the next chapter."
);

// -------------------------------------------------------------------------
chapter("Structural Validation Engine");
paragraph(
  "Every edit is re-checked in real time by two engines working together: " +
    "a capacity engine (is this member strong enough?) and a geometry " +
    "engine (does this design even make physical sense?)."
);
heading2("What gets checked");
bullets([
  "Missing / floating beams — a beam with no supporting column at one or both ends",
  "Long beam spans exceeding the safe limit for a normal RC beam",
  "Duplicate or overlapping columns",
  "Negative or zero dimensions on any pillar, beam, slab, wall or stair",
  "Floating slabs with no supporting beams underneath",
  "Zero-length walls, or walls extending outside the building footprint",
  "Doors/windows that no longer reference a real wall, are wider than their wall, or extend above the ceiling",
  "Unsafe floor heights (outside a typical 2.4–6 m range)",
  "Unsafe stair geometry (see previous chapter)",
  "Column/beam/slab capacity vs. estimated load, footing pressure vs. soil bearing capacity, and steel congestion",
]);
heading2("How issues are shown");
bullets([
  "In 3D: the flagged member glows red (critical) or amber (warning), with a small \"!\" badge floating above it — hover the badge to read the explanation.",
  "In the toolbar: a red/amber counter next to Undo/Redo shows how many open issues exist.",
  "In the Cost & AI panel: every issue is listed with severity, a plain-language explanation, and — where possible — a suggested fix.",
]);
note(
  "Click any issue in the panel's list to jump straight to that member in " +
    "3D (switching floor automatically if needed) and select it."
);
heading2("Applying a fix");
paragraph(
  "Some issues include an \"Apply fix\" button that immediately resizes " +
    "the flagged member (e.g. deepening an undersized beam, widening a " +
    "footing) to the recommended value — no manual re-entry needed."
);

// -------------------------------------------------------------------------
chapter("AI Assistant & Cost Estimator");
paragraph(
  "Open the right-hand panel (toolbar or the tab on the right edge) for " +
    "live costing and AI guidance."
);
heading2("Cost & materials");
bullets([
  "Grand total cost, split into concrete, steel, labour and formwork",
  "Concrete volume, steel weight, brick count, excavation volume and more",
  "A full bill of quantities (BOQ) broken down by category",
]);
heading2("AI structural recommendations");
paragraph(
  "Lists every open validation/engineering issue with a reason, the " +
    "current value, the recommended value, and (when available) an Apply " +
    "fix button."
);
heading2("AI layout suggestions");
paragraph(
  "Alternative column-grid layouts with a trade-off summary and estimated " +
    "cost — click one to apply it to the whole building instantly."
);

// -------------------------------------------------------------------------
chapter("Undo, Redo & History");
bullets([
  { label: "Undo (Ctrl/⌘+Z, or Back button)", body: "step back one edit" },
  { label: "Redo (Ctrl/⌘+Y, or Forward button)", body: "step forward again" },
  { label: "Every drag, add, delete or property edit", body: "is recorded as one history step, so undo always restores exactly what you'd expect" },
]);

// -------------------------------------------------------------------------
chapter("Keyboard Shortcuts");
table(
  ["Shortcut", "Action"],
  [
    ["Ctrl/⌘ + Z", "Undo"],
    ["Ctrl/⌘ + Y", "Redo"],
    ["Ctrl/⌘ + click (pillar/beam)", "Toggle multi-select group"],
    ["Arrow keys", "Nudge selected element / group"],
    ["Delete / Backspace", "Remove selected element or group"],
    ["Esc", "Cancel draft, clear selection, exit inside view"],
    ["W A S D (Inside view)", "Walk around at eye level"],
  ],
  [70, 105]
);

// -------------------------------------------------------------------------
chapter("Tips & Current Limitations");
heading2("Tips");
bullets([
  "Turn on Labels only when you need to read names at a glance — it's off by default to keep the 3D view clean.",
  "Use Cutaway or Isolate when editing a specific floor in a tall building so upper floors don't get in the way.",
  "Use the amber/red alert counter as your first stop after a big edit — it tells you at a glance whether anything needs attention.",
]);
heading2("Known limitations (roadmap)");
paragraph(
  "This is an actively evolving platform. At the time of writing:"
);
bullets([
  "Stair directions are currently straight / dog-legged / spiral; U-shape, L-shape and curved stairs are planned.",
  "Beams don't yet have an explicit Main/Secondary/Cantilever/Transfer type field.",
  "Slabs don't yet expose slope, drain direction, balcony or cut-out editing in the UI.",
  "Center of gravity and load-path preview visualizations are planned but not yet shown.",
  "Large buildings aren't yet optimized with instancing/LOD — very large models may slow down.",
  "The Property Inspector doesn't yet have a dedicated visual history/checkpoint timeline (undo/redo works via the linear stack described above).",
]);

// ================================================================= TOC ====
doc.setPage(TOC_PLACEHOLDER_PAGE);
y = MARGIN_TOP + 12;
doc.setFont("helvetica", "normal");
doc.setFontSize(11.5);
toc.forEach((entry) => {
  doc.setTextColor(INK);
  doc.text(entry.title, MARGIN_X, y);
  const pageLabel = String(entry.page);
  const dotsStart = MARGIN_X + doc.getTextWidth(entry.title) + 3;
  const dotsEnd = PAGE_W - MARGIN_X - doc.getTextWidth(pageLabel) - 3;
  doc.setTextColor(RULE);
  if (dotsEnd > dotsStart) {
    const dotWidth = doc.getTextWidth(".");
    let dx = dotsStart;
    while (dx < dotsEnd) {
      doc.text(".", dx, y);
      dx += dotWidth * 1.6;
    }
  }
  doc.setTextColor(MUTED);
  doc.text(pageLabel, PAGE_W - MARGIN_X, y, { align: "right" });
  y += 8.5;
});

// =============================================================== FOOTER ===
const totalPages = doc.getNumberOfPages();
for (let p = 2; p <= totalPages; p++) {
  doc.setPage(p);
  doc.setDrawColor(RULE);
  doc.setLineWidth(0.2);
  doc.line(MARGIN_X, PAGE_H - 14, PAGE_W - MARGIN_X, PAGE_H - 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(MUTED);
  doc.text("BuildVision AI — User & Platform Guide", MARGIN_X, PAGE_H - 9);
  doc.text(`Page ${p - 1} of ${totalPages - 1}`, PAGE_W - MARGIN_X, PAGE_H - 9, {
    align: "right",
  });
}

// ================================================================ WRITE ===
const outDir = path.join(__dirname, "..", "docs");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "BuildVision-AI-User-Guide.pdf");
fs.writeFileSync(outPath, Buffer.from(doc.output("arraybuffer")));
console.log("Wrote", outPath, `(${totalPages} pages)`);
