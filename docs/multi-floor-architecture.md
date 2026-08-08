# Multi-floor structural editing

The planner treats `Floor.id` as the stable owner of every structural member.
`floorNumber` is display/order data and is recomputed after a floor is deleted
or reordered. Pillars additionally use `stackId` for vertical continuity; each
segment keeps its own ID, section, loads and check result.

`useStructureStore.floors` is canonical state. The flat member arrays remain
compatibility DTOs for reports and older tools. `cloneFloor` deep-clones
members, remaps beam endpoint IDs and preserves stack IDs. Floor creation
supports full-layout, pillar-only and empty modes, with a 50-floor limit.

Dimensions are stored internally in metres while the inspector displays and
accepts millimetres. Fast checks run per floor and then validate vertical
alignment, section reductions, upper-section increases and explicit transfer
conditions. Ghosted floors have pointer events disabled.

The bulk persistence endpoints are:

- `GET /api/v1/buildings/:id/structure`
- `PUT /api/v1/buildings/:id/structure` with `{ structure, version }`
- `POST /api/v1/buildings/:id/structure/analyze`

Relational tables store floor-owned members and stable client UUIDs. The
revision snapshot preserves walls, openings, stairs, foundation, roof and
other planner entities that do not yet have dedicated relational tables. The
DTO response uses canonical frontend names such as `floorId`, `stackId` and
`startPillarId`.

`PyniteModelBuilder` creates nodes at each actual storey elevation and a
separate member/section for every pillar segment and beam. Results retain floor
ID, member ID, stack ID, member type, load combination and force/displacement
utilization fields.

These checks and PyNite results are educational design assistance. They do not
replace project-specific code checks, detailing, geotechnical review or
approval by a qualified structural engineer. The application reports a
column offset or discontinuity and never silently invents a transfer member.
