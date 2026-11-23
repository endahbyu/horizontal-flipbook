// Loads the outline of the world's land (public/data/land.json) and turns it into a quick
// "is this point on land?" test, by painting the outline onto a small hidden canvas once.
// Data: Natural Earth (public domain), packaged as TopoJSON by the world-atlas project (ISC licence).
import type { LandTest } from '~/lib/shapes';

type Topology = { transform?: { scale: [number, number]; translate: [number, number] }; arcs: number[][][]; objects: { land: { geometries: { type: string; arcs: number[][][] | number[][] }[] } } };

export async function loadLandTest(url: string): Promise<LandTest | undefined> {
  try {
    const topo = (await (await fetch(url)).json()) as Topology;
    const [sx, sy] = topo.transform?.scale ?? [1, 1], [tx, ty] = topo.transform?.translate ?? [0, 0];
    // arcs are stored as steps from the previous point; rebuild real longitude/latitude pairs
    const arcs = topo.arcs.map((arc) => { let x = 0, y = 0; return arc.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); });
    const W = 1024, H = 512, canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.fillStyle = '#fff';
    // Collect a ring's points with longitudes "unwrapped": a ring that crosses the date line keeps going
    // past ±180 instead of jumping to the other edge of the map (which would smear a stripe across it).
    const ring = (indexes: number[]) => {
      const pts: number[][] = [];
      let shift = 0, prev: number | null = null;
      for (const i of indexes) {
        for (const [lon, lat] of i < 0 ? arcs[~i].slice().reverse() : arcs[i]) { // a negative index means "this arc, backwards"
          if (prev !== null && Math.abs(lon - prev) > 180) shift += lon < prev ? 360 : -360;
          prev = lon; pts.push([lon + shift, lat]);
        }
      }
      return pts;
    };
    const trace = (pts: number[][], offset: number) => {
      pts.forEach(([lon, lat], k) => { const x = ((lon + offset + 180) / 360) * W, y = ((90 - lat) / 180) * H; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.closePath();
    };
    for (const g of topo.objects.land.geometries) {
      const polygons = (g.type === 'MultiPolygon' ? g.arcs : [g.arcs]) as number[][][];
      for (const polygon of polygons) {
        const rings = polygon.map(ring);
        for (const offset of [-360, 0, 360]) { ctx.beginPath(); for (const r of rings) trace(r, offset); ctx.fill('evenodd'); } // draw the copies that fall off either edge too
      }
    }
    const pixels = ctx.getImageData(0, 0, W, H).data;
    return (lon, lat) => {
      const x = Math.min(W - 1, Math.max(0, Math.floor(((lon + 180) / 360) * W))), y = Math.min(H - 1, Math.max(0, Math.floor(((90 - lat) / 180) * H)));
      return pixels[(y * W + x) * 4 + 3] > 127;
    };
  } catch {
    return undefined; // the globe falls back to a plain sphere
  }
}
