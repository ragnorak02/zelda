/**
 * WorldManager — JRPG-style game world with town, paths, and zones.
 *
 * Layout:
 *   South  — Starting path leading north to town
 *   Center — Millhaven town (Inn, Item Shop, Weapon Shop, Elder's House)
 *   North  — Path to the Fairy Tree
 *   West   — Path to Darkhollow Cave
 *   East   — Path to Broken Bridge (blocked off)
 *
 * Buildings are 3-walled structures with an open side so the player
 * can walk inside.  NPCs stand around the town and inside shops.
 */

import { clamp, lightenColor, darkenColor } from './utils.js';

// ── NPC definitions ──

const NPCS = [
    { name: 'Elder Marin', x: 1500, y: 1600, color: '#d4a574', radius: 14,
      dialogue: 'Welcome to Millhaven, traveler. The world beyond our borders grows restless.' },
    { name: 'Lira', x: 1400, y: 1650, color: '#e88ca5', radius: 12,
      dialogue: 'The fairy tree to the north... they say it grants wishes to the pure of heart.' },
    { name: 'Bram', x: 1600, y: 1550, color: '#7ec87e', radius: 14,
      dialogue: 'I used to be an adventurer. Now I just tend the garden.' },
    { name: 'Shopkeeper Fen', x: 1210, y: 1320, color: '#e6c84c', radius: 13,
      dialogue: 'Looking to buy something? Take a look at my wares!' },
    { name: 'Smith Dorn', x: 1790, y: 1320, color: '#c87850', radius: 15,
      dialogue: 'Need a weapon sharpened? I\'m the best smith in the region.' },
    { name: 'Guard Tomas', x: 1800, y: 1500, color: '#6088c8', radius: 14,
      dialogue: 'The bridge east is blocked. A landslide took out the supports.' },
    { name: 'Child Pip', x: 1450, y: 1700, color: '#c8a0e0', radius: 10,
      dialogue: 'Have you seen the cave to the west? Scary noises come from it at night!' },
];

export class WorldManager {
    constructor() {
        this.obstacles = [];
        this.buildings = [];   // walkable structures (floor + 3 walls)
        this.zones = [];       // named rectangular regions for location HUD
        this.npcs = [];
        this.signs = [];       // signposts with text
        this._generate();
    }

    // ── Map generation ──

    _generate() {
        this._buildStartingPath();
        this._buildTown();
        this._buildNorthPath();
        this._buildWestPath();
        this._buildEastPath();
        this._buildBorders();
        this._placeNPCs();
        this._defineZones();
    }

    // ── South: starting path ──

    _buildStartingPath() {
        // Tree-lined corridor leading north into town
        for (let y = 2100; y <= 2750; y += 50) {
            this._circle('tree', 1350, y, 18);
            this._circle('tree', 1650, y, 18);
        }
        // Atmosphere trees
        this._circle('tree', 1300, 2600, 16);
        this._circle('tree', 1700, 2500, 16);
        this._circle('tree', 1280, 2350, 14);
        this._circle('tree', 1720, 2250, 14);

        this.signs.push({ x: 1550, y: 2650, text: 'Millhaven - North' });
    }

    // ── Center: town ──

    _buildTown() {
        // ── Tree walls with gaps for each exit ──

        // West wall (gap y 1380–1620 for west path)
        for (let y = 1220; y <= 1340; y += 45) this._circle('tree', 1100, y, 16);
        for (let y = 1660; y <= 1850; y += 45) this._circle('tree', 1100, y, 16);

        // East wall (gap y 1380–1620 for east path)
        for (let y = 1220; y <= 1340; y += 45) this._circle('tree', 1900, y, 16);
        for (let y = 1660; y <= 1850; y += 45) this._circle('tree', 1900, y, 16);

        // North wall (gap x 1370–1630 for north path)
        for (let x = 1100; x <= 1330; x += 45) this._circle('tree', x, 1200, 16);
        for (let x = 1670; x <= 1900; x += 45) this._circle('tree', x, 1200, 16);

        // South wall (gap x 1370–1630 for starting path)
        for (let x = 1100; x <= 1330; x += 45) this._circle('tree', x, 1900, 16);
        for (let x = 1670; x <= 1900; x += 45) this._circle('tree', x, 1900, 16);

        // ── Buildings (3-wall, walkable interiors) ──

        // Item Shop — northwest, door faces south (toward square)
        this._addBuilding('shop', 1150, 1260, 110, 90, 'south');
        this.signs.push({ x: 1205, y: 1250, text: 'Item Shop' });

        // Weapon Shop — northeast, door faces south
        this._addBuilding('shop', 1740, 1260, 110, 90, 'south');
        this.signs.push({ x: 1795, y: 1250, text: 'Weapon Shop' });

        // Inn — southwest, door faces north (toward square)
        this._addBuilding('building', 1150, 1740, 110, 90, 'north');
        this.signs.push({ x: 1205, y: 1840, text: 'Inn' });

        // Elder's House — southeast, door faces north
        this._addBuilding('building', 1740, 1740, 110, 90, 'north');
        this.signs.push({ x: 1795, y: 1840, text: "Elder's House" });

        // Town well (center)
        this._circle('well', 1500, 1550, 12);
    }

    // ── North: fairy tree ──

    _buildNorthPath() {
        for (let y = 400; y <= 1150; y += 50) {
            this._circle('tree', 1350, y, 18);
            this._circle('tree', 1650, y, 18);
        }
        this._circle('tree', 1300, 800, 14);
        this._circle('tree', 1700, 600, 14);

        // The Fairy Tree — large ancient tree
        this._circle('fairyTree', 1500, 280, 40);

        // Decorative rocks
        this._circle('rock', 1430, 220, 8);
        this._circle('rock', 1570, 240, 10);
        this._circle('rock', 1460, 360, 7);
        this._circle('rock', 1540, 350, 9);

        // Glowing spots
        this._circle('glow', 1440, 310, 4);
        this._circle('glow', 1560, 300, 4);
        this._circle('glow', 1480, 240, 3);
        this._circle('glow', 1520, 340, 3);

        this.signs.push({ x: 1550, y: 500, text: 'The Fairy Tree' });

        // Tutorial gap on north path
        this._rect('gap', 1470, 900, 40, 50);

        // Vine above the north path gap
        this.obstacles.push({
            shape: 'rect', type: 'vine',
            x: 1465, y: 895, w: 50, h: 60, grabHeight: 30
        });
    }

    // ── West: cave ──

    _buildWestPath() {
        for (let x = 400; x <= 1050; x += 50) {
            this._circle('tree', x, 1380, 18);
            this._circle('tree', x, 1620, 18);
        }

        // Cave dark interior backdrop
        this._rect('caveDark', 200, 1430, 100, 140);

        // Cave mouth rocks
        this._circle('caveRock', 280, 1420, 22);
        this._circle('caveRock', 280, 1580, 22);
        this._circle('caveRock', 250, 1455, 16);
        this._circle('caveRock', 250, 1545, 16);

        // Scattered rubble
        this._circle('rock', 380, 1450, 10);
        this._circle('rock', 350, 1560, 8);
        this._circle('rock', 420, 1520, 7);

        this.signs.push({ x: 470, y: 1450, text: 'Darkhollow Cave' });
    }

    // ── East: bridge (blocked) ──

    _buildEastPath() {
        for (let x = 1950; x <= 2400; x += 50) {
            this._circle('tree', x, 1380, 18);
            this._circle('tree', x, 1620, 18);
        }

        // Bridge planks
        this._rect('bridge', 2450, 1430, 200, 140);

        // Barricade blocking the bridge
        this._rect('barricade', 2560, 1440, 30, 120);

        this.signs.push({ x: 2420, y: 1420, text: 'Bridge Out - Danger!' });

        this._circle('rock', 2500, 1400, 10);
        this._circle('rock', 2480, 1610, 8);

        // Gap near broken bridge (jump to cross)
        this._rect('gap', 2420, 1450, 60, 100);
    }

    // ── Border fill ──

    _buildBorders() {
        // Corner clusters
        this._cluster(300, 300, 8, 120);
        this._cluster(600, 200, 6, 100);
        this._cluster(200, 600, 6, 100);

        this._cluster(2700, 300, 8, 120);
        this._cluster(2400, 200, 6, 100);
        this._cluster(2800, 600, 6, 100);

        this._cluster(300, 2700, 8, 120);
        this._cluster(600, 2800, 6, 100);
        this._cluster(200, 2400, 6, 100);

        this._cluster(2700, 2700, 8, 120);
        this._cluster(2400, 2800, 6, 100);
        this._cluster(2800, 2400, 6, 100);

        // Edge fill (north)
        for (let x = 800; x <= 1200; x += 200) this._cluster(x, 150, 4, 80);
        for (let x = 1800; x <= 2200; x += 200) this._cluster(x, 150, 4, 80);

        // Edge fill (south)
        for (let x = 200; x <= 1200; x += 200) this._cluster(x, 2850, 4, 80);
        for (let x = 1800; x <= 2800; x += 200) this._cluster(x, 2850, 4, 80);

        // Edge fill (west)
        for (let y = 800; y <= 1250; y += 200) this._cluster(150, y, 4, 80);
        for (let y = 1750; y <= 2200; y += 200) this._cluster(150, y, 4, 80);

        // Edge fill (east)
        for (let y = 800; y <= 1250; y += 200) this._cluster(2850, y, 4, 80);
        for (let y = 1750; y <= 2200; y += 200) this._cluster(2850, y, 4, 80);
    }

    // ── NPC & zone setup ──

    _placeNPCs() {
        this.npcs = NPCS.map(def => ({ ...def }));
    }

    _defineZones() {
        this.zones = [
            { name: 'Starting Path', x: 1300, y: 2050, w: 400, h: 750 },
            { name: 'Millhaven', x: 1100, y: 1200, w: 800, h: 700 },
            { name: 'North Path', x: 1300, y: 400, w: 400, h: 800 },
            { name: 'The Fairy Tree', x: 1300, y: 150, w: 400, h: 250 },
            { name: 'West Path', x: 400, y: 1350, w: 700, h: 300 },
            { name: 'Darkhollow Cave', x: 180, y: 1350, w: 220, h: 300 },
            { name: 'East Path', x: 1950, y: 1350, w: 500, h: 300 },
            { name: 'Broken Bridge', x: 2400, y: 1350, w: 300, h: 300 },
        ];
    }

    // ── Building helper ──

    _addBuilding(type, x, y, w, h, doorSide) {
        this.buildings.push({ type, x, y, w, h, doorSide });
        const t = 8; // wall thickness

        if (doorSide === 'south') {
            this._rect('wall', x, y, w, t);           // top
            this._rect('wall', x, y, t, h);            // left
            this._rect('wall', x + w - t, y, t, h);    // right
        } else if (doorSide === 'north') {
            this._rect('wall', x, y + h - t, w, t);    // bottom
            this._rect('wall', x, y, t, h);             // left
            this._rect('wall', x + w - t, y, t, h);     // right
        }
    }

    // ── Primitive helpers ──

    _circle(type, x, y, radius) {
        this.obstacles.push({ shape: 'circle', type, x, y, radius });
    }

    _rect(type, x, y, w, h) {
        this.obstacles.push({ shape: 'rect', type, x, y, w, h });
    }

    _cluster(cx, cy, count, spread) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + i * 1.7;
            const dist = spread * 0.3 + (i % 3) * spread * 0.25;
            this._circle('tree',
                cx + Math.cos(angle) * dist,
                cy + Math.sin(angle) * dist,
                16 + (i % 3) * 2
            );
        }
    }

    // ── Queries ──

    getZoneName(x, y) {
        for (const z of this.zones) {
            if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) {
                return z.name;
            }
        }
        return 'Wilderness';
    }

    getNearbyNPC(x, y, range = 60) {
        let closest = null;
        let closestDist = range;
        for (const npc of this.npcs) {
            const dx = npc.x - x;
            const dy = npc.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < closestDist) {
                closestDist = dist;
                closest = npc;
            }
        }
        return closest;
    }

    // ── Collision ──

    resolveCollision(px, py, pr, isAirborne = false) {
        for (const obs of this.obstacles) {
            // Skip gaps when airborne (player jumps over them)
            if (obs.type === 'gap' && isAirborne) continue;
            // Vines are scenery, never solid
            if (obs.type === 'vine') continue;
            // Gaps are not solid colliders — they are checked separately via checkGap
            if (obs.type === 'gap') continue;

            if (obs.shape === 'circle') {
                const result = this._pushFromCircle(px, py, pr, obs);
                if (result) { px = result.x; py = result.y; }
            } else {
                const result = this._pushFromRect(px, py, pr, obs);
                if (result) { px = result.x; py = result.y; }
            }
        }
        return { x: px, y: py };
    }

    /** Returns gap obstacle if player overlaps one, else null. */
    checkGap(px, py, pr) {
        for (const obs of this.obstacles) {
            if (obs.type !== 'gap') continue;
            // Circle-rect overlap
            const nx = Math.max(obs.x, Math.min(px, obs.x + obs.w));
            const ny = Math.max(obs.y, Math.min(py, obs.y + obs.h));
            const dx = px - nx;
            const dy = py - ny;
            if (dx * dx + dy * dy < pr * pr) {
                return obs;
            }
        }
        return null;
    }

    /** Returns vine if airborne player overlaps vine and z >= grabHeight. */
    checkVineGrab(px, py, pr, z) {
        for (const obs of this.obstacles) {
            if (obs.type !== 'vine') continue;
            // Circle-rect overlap
            const nx = Math.max(obs.x, Math.min(px, obs.x + obs.w));
            const ny = Math.max(obs.y, Math.min(py, obs.y + obs.h));
            const dx = px - nx;
            const dy = py - ny;
            if (dx * dx + dy * dy < pr * pr && z >= obs.grabHeight) {
                return obs;
            }
        }
        return null;
    }

    _pushFromCircle(px, py, pr, obs) {
        const dx = px - obs.x;
        const dy = py - obs.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = pr + obs.radius;
        if (dist < minDist && dist > 0.001) {
            const push = (minDist - dist);
            return { x: px + (dx / dist) * push, y: py + (dy / dist) * push };
        }
        return null;
    }

    _pushFromRect(px, py, pr, obs) {
        const nx = clamp(px, obs.x, obs.x + obs.w);
        const ny = clamp(py, obs.y, obs.y + obs.h);
        const dx = px - nx;
        const dy = py - ny;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < pr) {
            if (dist > 0.001) {
                const push = pr - dist;
                return { x: px + (dx / dist) * push, y: py + (dy / dist) * push };
            }
            const dl = px - obs.x;
            const dr = (obs.x + obs.w) - px;
            const dt = py - obs.y;
            const db = (obs.y + obs.h) - py;
            const min = Math.min(dl, dr, dt, db);
            if (min === dl) return { x: obs.x - pr, y: py };
            if (min === dr) return { x: obs.x + obs.w + pr, y: py };
            if (min === dt) return { x: px, y: obs.y - pr };
            return { x: px, y: obs.y + obs.h + pr };
        }
        return null;
    }

    // ── Rendering ──

    /** Render path / floor ground tiles (call before obstacles). */
    renderGround(ctx, camera) {
        // Starting path
        this._ground(ctx, camera, 1350, 1900, 300, 900, '#22221e');
        // Town square
        this._ground(ctx, camera, 1100, 1200, 800, 700, '#24241f');
        // North path
        this._ground(ctx, camera, 1350, 150, 300, 1050, '#22221e');
        // West path
        this._ground(ctx, camera, 200, 1380, 900, 240, '#22221e');
        // East path
        this._ground(ctx, camera, 1900, 1380, 750, 240, '#22221e');

        // Gap pits (render in ground layer so they appear below obstacles)
        for (const obs of this.obstacles) {
            if (obs.type !== 'gap') continue;
            const cx = obs.x + obs.w / 2;
            const cy = obs.y + obs.h / 2;
            if (!camera.isVisible(cx, cy, Math.max(obs.w, obs.h))) continue;
            this._renderGap(ctx, camera, obs);
        }

        // Building floors
        for (const bld of this.buildings) {
            if (!camera.isVisible(bld.x + bld.w / 2, bld.y + bld.h / 2, Math.max(bld.w, bld.h))) continue;
            const s = camera.worldToScreen(bld.x, bld.y);
            const baseColor = bld.type === 'shop' ? '#2d3a26' : '#3a2d20';
            ctx.fillStyle = baseColor;
            ctx.fillRect(s.x, s.y, bld.w, bld.h);

            // Wood plank pattern
            const plankH = 10;
            ctx.strokeStyle = bld.type === 'shop' ? 'rgba(30,50,20,0.3)' : 'rgba(50,30,15,0.3)';
            ctx.lineWidth = 0.5;
            for (let py = 0; py < bld.h; py += plankH) {
                ctx.beginPath();
                ctx.moveTo(s.x, s.y + py);
                ctx.lineTo(s.x + bld.w, s.y + py);
                ctx.stroke();
            }

            // Doorway highlight
            const doorSide = bld.doorSide;
            ctx.fillStyle = 'rgba(255,200,100,0.04)';
            if (doorSide === 'south') {
                ctx.fillRect(s.x + bld.w * 0.3, s.y + bld.h - 5, bld.w * 0.4, 5);
            } else if (doorSide === 'north') {
                ctx.fillRect(s.x + bld.w * 0.3, s.y, bld.w * 0.4, 5);
            }

            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 1;
            ctx.strokeRect(s.x, s.y, bld.w, bld.h);
        }
    }

    _ground(ctx, camera, wx, wy, ww, wh, color) {
        const tl = camera.worldToScreen(wx, wy);
        const br = camera.worldToScreen(wx + ww, wy + wh);
        const sw = br.x - tl.x;
        const sh = br.y - tl.y;

        // Base fill
        ctx.fillStyle = color;
        ctx.fillRect(tl.x, tl.y, sw, sh);

        // Edge gradient for depth
        const edgeGrad = ctx.createLinearGradient(tl.x, tl.y, tl.x, tl.y + 8);
        edgeGrad.addColorStop(0, 'rgba(255,255,255,0.04)');
        edgeGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = edgeGrad;
        ctx.fillRect(tl.x, tl.y, sw, 8);

        // Subtle grass/stone detail (sparse for performance)
        const isTown = color === '#24241f';
        ctx.fillStyle = isTown ? 'rgba(60,55,45,0.3)' : 'rgba(40,55,30,0.25)';
        // Use world coords for consistent placement
        const step = 40;
        const startWX = Math.floor(wx / step) * step;
        const startWY = Math.floor(wy / step) * step;
        for (let gx = startWX; gx < wx + ww; gx += step) {
            for (let gy = startWY; gy < wy + wh; gy += step) {
                // Deterministic pseudo-random
                const hash = ((gx * 73 + gy * 137) & 0xff) / 255;
                if (hash > 0.6) {
                    const gs = camera.worldToScreen(gx, gy);
                    if (isTown) {
                        // Small stone marks
                        ctx.fillRect(gs.x, gs.y, 3, 2);
                    } else {
                        // Grass tufts
                        ctx.beginPath();
                        ctx.moveTo(gs.x, gs.y);
                        ctx.lineTo(gs.x - 2, gs.y - 4);
                        ctx.lineTo(gs.x + 1, gs.y);
                        ctx.fill();
                        ctx.beginPath();
                        ctx.moveTo(gs.x + 3, gs.y + 1);
                        ctx.lineTo(gs.x + 4, gs.y - 3);
                        ctx.lineTo(gs.x + 5, gs.y + 1);
                        ctx.fill();
                    }
                }
            }
        }
    }

    /** Render obstacles, signs, and NPCs. */
    render(ctx, camera) {
        for (const obs of this.obstacles) {
            const cx = obs.shape === 'rect' ? obs.x + obs.w / 2 : obs.x;
            const cy = obs.shape === 'rect' ? obs.y + obs.h / 2 : obs.y;
            const margin = obs.shape === 'rect' ? Math.max(obs.w, obs.h) : obs.radius;
            if (!camera.isVisible(cx, cy, margin + 20)) continue;

            switch (obs.type) {
                case 'tree':      this._renderTree(ctx, camera, obs); break;
                case 'wall':      this._renderWall(ctx, camera, obs); break;
                case 'rock':      this._renderRock(ctx, camera, obs); break;
                case 'well':      this._renderWell(ctx, camera, obs); break;
                case 'fairyTree': this._renderFairyTree(ctx, camera, obs); break;
                case 'caveRock':  this._renderCaveRock(ctx, camera, obs); break;
                case 'caveDark':  this._renderCaveDark(ctx, camera, obs); break;
                case 'bridge':    this._renderBridge(ctx, camera, obs); break;
                case 'barricade': this._renderBarricade(ctx, camera, obs); break;
                case 'glow':      this._renderGlow(ctx, camera, obs); break;
                case 'vine':      this._renderVine(ctx, camera, obs); break;
            }
        }

        // Signs
        for (const sign of this.signs) {
            if (!camera.isVisible(sign.x, sign.y, 40)) continue;
            this._renderSign(ctx, camera, sign);
        }

        // NPCs
        for (const npc of this.npcs) {
            if (!camera.isVisible(npc.x, npc.y, npc.radius + 30)) continue;
            this._renderNPC(ctx, camera, npc);
        }
    }

    // ── Obstacle renderers ──

    _renderTree(ctx, camera, obs) {
        const s = camera.worldToScreen(obs.x, obs.y);
        const r = obs.radius;

        // Trunk (tapered)
        ctx.fillStyle = '#4a2d14';
        ctx.beginPath();
        ctx.moveTo(s.x - 3, s.y + 3);
        ctx.lineTo(s.x - 2, s.y - 3);
        ctx.lineTo(s.x + 2, s.y - 3);
        ctx.lineTo(s.x + 3, s.y + 3);
        ctx.fill();

        // Canopy shadow layer
        ctx.fillStyle = '#1a4012';
        ctx.beginPath();
        ctx.arc(s.x + 1, s.y + 1, r, 0, Math.PI * 2);
        ctx.fill();

        // Main canopy with gradient
        const grad = ctx.createRadialGradient(s.x - r * 0.3, s.y - r * 0.3, r * 0.1, s.x, s.y, r);
        grad.addColorStop(0, '#3d7a22');
        grad.addColorStop(0.6, '#2d5a1e');
        grad.addColorStop(1, '#1a4012');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fill();

        // Leaf highlight clusters
        ctx.fillStyle = '#4a8a2e';
        ctx.beginPath();
        ctx.arc(s.x - r * 0.3, s.y - r * 0.35, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(s.x + r * 0.25, s.y - r * 0.2, r * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Outline
        ctx.strokeStyle = '#163a0e';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    _renderWall(ctx, camera, obs) {
        const s = camera.worldToScreen(obs.x, obs.y);
        // Base stone wall
        ctx.fillStyle = '#5a4a3a';
        ctx.fillRect(s.x, s.y, obs.w, obs.h);

        // Brick pattern
        ctx.strokeStyle = '#4a3a2a';
        ctx.lineWidth = 0.5;
        const brickH = 6;
        const brickW = 10;
        for (let row = 0; row < obs.h; row += brickH) {
            const offset = (Math.floor(row / brickH) % 2) * (brickW / 2);
            for (let col = -brickW; col < obs.w + brickW; col += brickW) {
                const bx = s.x + col + offset;
                if (bx + brickW > s.x && bx < s.x + obs.w) {
                    ctx.strokeRect(
                        Math.max(s.x, bx), s.y + row,
                        Math.min(brickW, s.x + obs.w - Math.max(s.x, bx)), brickH
                    );
                }
            }
        }

        // Top highlight
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(s.x, s.y, obs.w, 2);
        // Bottom shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(s.x, s.y + obs.h - 2, obs.w, 2);

        ctx.strokeStyle = '#3d2a1a';
        ctx.lineWidth = 1;
        ctx.strokeRect(s.x, s.y, obs.w, obs.h);
    }

    _renderRock(ctx, camera, obs) {
        const s = camera.worldToScreen(obs.x, obs.y);
        const r = obs.radius;

        // Irregular polygon (seeded by position for consistency)
        const seed = (obs.x * 7 + obs.y * 13) | 0;
        const points = 7;
        ctx.beginPath();
        for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const vary = 0.75 + ((seed + i * 31) % 100) / 200;
            const px = s.x + Math.cos(angle) * r * vary;
            const py = s.y + Math.sin(angle) * r * vary;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();

        // Gradient fill
        const grad = ctx.createRadialGradient(s.x - r * 0.25, s.y - r * 0.25, 1, s.x, s.y, r);
        grad.addColorStop(0, '#888');
        grad.addColorStop(0.5, '#666');
        grad.addColorStop(1, '#4a4a4a');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#3a3a3a';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Highlight mark
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath();
        ctx.arc(s.x - r * 0.2, s.y - r * 0.2, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
    }

    _renderWell(ctx, camera, obs) {
        const s = camera.worldToScreen(obs.x, obs.y);
        const r = obs.radius;

        // Water with shimmer
        const shimmer = Math.sin(performance.now() / 500) * 0.1;
        const waterGrad = ctx.createRadialGradient(s.x - 2, s.y - 2, 1, s.x, s.y, r - 3);
        waterGrad.addColorStop(0, '#3a7aaa');
        waterGrad.addColorStop(0.5 + shimmer, '#2a5a8a');
        waterGrad.addColorStop(1, '#1a3a5a');
        ctx.fillStyle = waterGrad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r - 3, 0, Math.PI * 2);
        ctx.fill();

        // Stone ring
        ctx.strokeStyle = '#777';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.stroke();

        // Stone highlight
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, -0.8, 0.8);
        ctx.stroke();

        // Rope across top
        ctx.strokeStyle = '#8b6a3e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(s.x - r + 2, s.y);
        ctx.quadraticCurveTo(s.x, s.y + 3, s.x + r - 2, s.y);
        ctx.stroke();

        // Bucket hint
        ctx.fillStyle = '#6b4a2e';
        ctx.fillRect(s.x - 2, s.y - 1, 4, 4);
    }

    _renderFairyTree(ctx, camera, obs) {
        const s = camera.worldToScreen(obs.x, obs.y);
        const r = obs.radius;
        const time = performance.now();
        const pulse = 0.7 + Math.sin(time / 800) * 0.3;

        // Outer glow aura
        const glowGrad = ctx.createRadialGradient(s.x, s.y, r, s.x, s.y, r + 30);
        glowGrad.addColorStop(0, `rgba(100, 255, 150, ${0.12 * pulse})`);
        glowGrad.addColorStop(1, 'rgba(100, 255, 150, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r + 30, 0, Math.PI * 2);
        ctx.fill();

        // Root tendrils
        ctx.strokeStyle = '#5a3a1e';
        ctx.lineWidth = 3;
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 + 0.3;
            ctx.beginPath();
            ctx.moveTo(s.x + Math.cos(angle) * 6, s.y + Math.sin(angle) * 6);
            ctx.quadraticCurveTo(
                s.x + Math.cos(angle) * r * 0.6, s.y + Math.sin(angle) * r * 0.8,
                s.x + Math.cos(angle) * r * 0.9, s.y + Math.sin(angle) * r * 0.9
            );
            ctx.stroke();
        }

        // Thick trunk
        const trunkGrad = ctx.createLinearGradient(s.x - 10, s.y, s.x + 10, s.y);
        trunkGrad.addColorStop(0, '#5a3a1e');
        trunkGrad.addColorStop(0.5, '#7a5a3e');
        trunkGrad.addColorStop(1, '#4a2a14');
        ctx.fillStyle = trunkGrad;
        ctx.beginPath();
        ctx.moveTo(s.x - 12, s.y + 10);
        ctx.lineTo(s.x - 8, s.y - 12);
        ctx.lineTo(s.x + 8, s.y - 12);
        ctx.lineTo(s.x + 12, s.y + 10);
        ctx.fill();

        // Canopy layers
        const canopyGrad = ctx.createRadialGradient(s.x - r * 0.2, s.y - r * 0.2, r * 0.1, s.x, s.y, r);
        canopyGrad.addColorStop(0, '#2a8a3e');
        canopyGrad.addColorStop(0.5, '#1a6b2e');
        canopyGrad.addColorStop(1, '#0d4a1a');
        ctx.fillStyle = canopyGrad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fill();

        // Highlight canopy clusters
        ctx.fillStyle = '#3aaa4e';
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(s.x - r * 0.3, s.y - r * 0.3, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(s.x + r * 0.2, s.y - r * 0.15, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = '#0d4a1a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.stroke();

        // Animated sparkles
        for (let i = 0; i < 6; i++) {
            const sparkAngle = time / 2000 + i * 1.05;
            const sparkR = r * 0.5 + Math.sin(time / 400 + i * 2) * r * 0.3;
            const sx = s.x + Math.cos(sparkAngle) * sparkR;
            const sy = s.y + Math.sin(sparkAngle) * sparkR;
            const sparkAlpha = (0.3 + Math.sin(time / 300 + i * 1.5) * 0.3) * pulse;
            const sparkSize = 1.5 + Math.sin(time / 250 + i) * 1;

            ctx.globalAlpha = sparkAlpha;
            ctx.fillStyle = '#ccffdd';
            ctx.beginPath();
            ctx.arc(sx, sy, sparkSize, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    _renderCaveRock(ctx, camera, obs) {
        const s = camera.worldToScreen(obs.x, obs.y);
        const r = obs.radius;

        // Irregular boulder polygon
        const seed = (obs.x * 3 + obs.y * 7) | 0;
        const points = 8;
        ctx.beginPath();
        for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const vary = 0.8 + ((seed + i * 17) % 100) / 250;
            const px = s.x + Math.cos(angle) * r * vary;
            const py = s.y + Math.sin(angle) * r * vary;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();

        const grad = ctx.createRadialGradient(s.x - r * 0.2, s.y - r * 0.2, 1, s.x, s.y, r);
        grad.addColorStop(0, '#4a4a4a');
        grad.addColorStop(0.6, '#333');
        grad.addColorStop(1, '#1a1a1a');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#151515';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Moss patches
        ctx.fillStyle = '#2a3a22';
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(s.x + r * 0.3, s.y + r * 0.4, r * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    _renderCaveDark(ctx, camera, obs) {
        const s = camera.worldToScreen(obs.x, obs.y);
        const cx = s.x + obs.w / 2;
        const cy = s.y + obs.h / 2;

        // Dark interior
        ctx.fillStyle = '#060610';
        ctx.fillRect(s.x, s.y, obs.w, obs.h);

        // Radial darkness fade from center
        const darkGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, Math.max(obs.w, obs.h) * 0.6);
        darkGrad.addColorStop(0, 'rgba(0,0,0,0.6)');
        darkGrad.addColorStop(1, 'rgba(10,10,20,0)');
        ctx.fillStyle = darkGrad;
        ctx.fillRect(s.x - 20, s.y - 20, obs.w + 40, obs.h + 40);

        // Atmospheric purple glow hint
        ctx.fillStyle = 'rgba(40, 20, 60, 0.15)';
        ctx.beginPath();
        ctx.arc(cx, cy, 25, 0, Math.PI * 2);
        ctx.fill();
    }

    _renderBridge(ctx, camera, obs) {
        const s = camera.worldToScreen(obs.x, obs.y);

        // Base wood
        ctx.fillStyle = '#6a4a25';
        ctx.fillRect(s.x, s.y, obs.w, obs.h);

        // Individual planks with alternating shade
        const plankW = 18;
        for (let px = 0; px < obs.w; px += plankW) {
            const shade = (Math.floor(px / plankW) % 2 === 0) ? '#7a5a30' : '#6a4a28';
            const pw = Math.min(plankW - 1, obs.w - px);
            ctx.fillStyle = shade;
            ctx.fillRect(s.x + px, s.y + 1, pw, obs.h - 2);
            // Wood grain lines
            ctx.strokeStyle = 'rgba(90,60,30,0.4)';
            ctx.lineWidth = 0.5;
            for (let gy = 0; gy < obs.h; gy += 8) {
                ctx.beginPath();
                ctx.moveTo(s.x + px + 2, s.y + gy);
                ctx.lineTo(s.x + px + pw - 2, s.y + gy + 3);
                ctx.stroke();
            }
        }

        // Plank gaps
        ctx.strokeStyle = '#3a2a15';
        ctx.lineWidth = 1;
        for (let px = plankW; px < obs.w; px += plankW) {
            ctx.beginPath();
            ctx.moveTo(s.x + px, s.y);
            ctx.lineTo(s.x + px, s.y + obs.h);
            ctx.stroke();
        }

        // Rope railings
        ctx.strokeStyle = '#8b6a3e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + obs.w, s.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s.x, s.y + obs.h);
        ctx.lineTo(s.x + obs.w, s.y + obs.h);
        ctx.stroke();

        // Railing posts
        ctx.fillStyle = '#5a3a1e';
        for (let px = 0; px <= obs.w; px += 40) {
            ctx.fillRect(s.x + px - 2, s.y - 3, 4, 6);
            ctx.fillRect(s.x + px - 2, s.y + obs.h - 3, 4, 6);
        }
    }

    _renderBarricade(ctx, camera, obs) {
        const s = camera.worldToScreen(obs.x, obs.y);

        // Wooden boards (crossed)
        ctx.fillStyle = '#8b6a3e';
        for (let by = 0; by < obs.h; by += 18) {
            ctx.fillStyle = (Math.floor(by / 18) % 2 === 0) ? '#8b6a3e' : '#7a5a30';
            ctx.fillRect(s.x, s.y + by, obs.w, 14);
            // Wood grain
            ctx.strokeStyle = 'rgba(100,70,40,0.3)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(s.x + 2, s.y + by + 4);
            ctx.lineTo(s.x + obs.w - 2, s.y + by + 6);
            ctx.stroke();
        }

        // Danger X marks
        ctx.strokeStyle = '#cc3333';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(s.x + 3, s.y + 3);
        ctx.lineTo(s.x + obs.w - 3, s.y + obs.h - 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s.x + obs.w - 3, s.y + 3);
        ctx.lineTo(s.x + 3, s.y + obs.h - 3);
        ctx.stroke();

        // Nails
        ctx.fillStyle = '#666';
        ctx.beginPath(); ctx.arc(s.x + 5, s.y + 5, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(s.x + obs.w - 5, s.y + 5, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(s.x + 5, s.y + obs.h - 5, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(s.x + obs.w - 5, s.y + obs.h - 5, 1.5, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = '#5a3a1e';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(s.x, s.y, obs.w, obs.h);
    }

    _renderGlow(ctx, camera, obs) {
        const s = camera.worldToScreen(obs.x, obs.y);
        const time = performance.now();
        const pulse = 0.5 + Math.sin(time / 600 + obs.x) * 0.5;
        const r = obs.radius;

        // Outer glow halo
        const glowGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r + 5);
        glowGrad.addColorStop(0, `rgba(170, 255, 204, ${0.5 * pulse})`);
        glowGrad.addColorStop(0.6, `rgba(170, 255, 204, ${0.2 * pulse})`);
        glowGrad.addColorStop(1, 'rgba(170, 255, 204, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r + 5, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = '#ccffdd';
        ctx.globalAlpha = 0.8 + pulse * 0.2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Bright center
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, r * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    _renderGap(ctx, camera, obs) {
        const s = camera.worldToScreen(obs.x, obs.y);
        const cx = s.x + obs.w / 2;
        const cy = s.y + obs.h / 2;

        // Deep darkness
        ctx.fillStyle = '#040408';
        ctx.fillRect(s.x, s.y, obs.w, obs.h);

        // Depth gradient from center
        const depthGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, Math.max(obs.w, obs.h) * 0.6);
        depthGrad.addColorStop(0, 'rgba(0,0,0,0.5)');
        depthGrad.addColorStop(1, 'rgba(20,15,10,0)');
        ctx.fillStyle = depthGrad;
        ctx.fillRect(s.x, s.y, obs.w, obs.h);

        // Crumbling edge (top and left get highlights, bottom and right get shadow)
        ctx.fillStyle = 'rgba(100, 80, 60, 0.5)';
        ctx.fillRect(s.x, s.y, obs.w, 2);
        ctx.fillRect(s.x, s.y, 2, obs.h);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(s.x, s.y + obs.h - 2, obs.w, 2);
        ctx.fillRect(s.x + obs.w - 2, s.y, 2, obs.h);

        // Jagged edge detail
        ctx.fillStyle = 'rgba(60, 50, 40, 0.3)';
        ctx.fillRect(s.x + 3, s.y - 1, 5, 2);
        ctx.fillRect(s.x + obs.w - 8, s.y - 1, 5, 2);
        ctx.fillRect(s.x - 1, s.y + 4, 2, 4);
    }

    _renderVine(ctx, camera, obs) {
        const s = camera.worldToScreen(obs.x, obs.y);
        const cx = s.x + obs.w / 2;
        const sway = Math.sin(performance.now() / 800) * 2;

        // Main vine rope (wavy)
        ctx.strokeStyle = '#5a3a1e';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(cx, s.y);
        ctx.quadraticCurveTo(cx + sway * 2, s.y + obs.h * 0.5, cx + sway, s.y + obs.h);
        ctx.stroke();

        // Thinner vine wrap
        ctx.strokeStyle = '#4a6a2e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx + 2, s.y + 3);
        ctx.quadraticCurveTo(cx - 3 + sway, s.y + obs.h * 0.4, cx + sway - 1, s.y + obs.h - 3);
        ctx.stroke();

        // Leaves along the vine
        for (let i = 0; i < 5; i++) {
            const t = (i + 0.5) / 5;
            const ly = s.y + obs.h * t;
            const lx = cx + sway * t + (i % 2 === 0 ? -1 : 1) * 3;
            const leafAngle = (i % 2 === 0 ? -0.5 : 0.5) + Math.sin(performance.now() / 600 + i) * 0.1;

            ctx.save();
            ctx.translate(lx, ly);
            ctx.rotate(leafAngle);
            ctx.fillStyle = i % 3 === 0 ? '#3d8a22' : '#2d7a1e';
            ctx.beginPath();
            ctx.ellipse(0, 0, 4.5, 2, 0, 0, Math.PI * 2);
            ctx.fill();
            // Leaf vein
            ctx.strokeStyle = '#1a5a12';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(-3, 0);
            ctx.lineTo(3, 0);
            ctx.stroke();
            ctx.restore();
        }
    }

    // ── Sign & NPC renderers ──

    _renderSign(ctx, camera, sign) {
        const s = camera.worldToScreen(sign.x, sign.y);

        // Post with taper
        ctx.fillStyle = '#5a3a1e';
        ctx.beginPath();
        ctx.moveTo(s.x - 2.5, s.y + 10);
        ctx.lineTo(s.x - 2, s.y - 10);
        ctx.lineTo(s.x + 2, s.y - 10);
        ctx.lineTo(s.x + 2.5, s.y + 10);
        ctx.fill();

        // Board with gradient
        const boardGrad = ctx.createLinearGradient(s.x, s.y - 18, s.x, s.y - 4);
        boardGrad.addColorStop(0, '#9b7a4e');
        boardGrad.addColorStop(1, '#7a5a30');
        ctx.fillStyle = boardGrad;
        ctx.fillRect(s.x - 24, s.y - 18, 48, 14);

        // Wood grain on board
        ctx.strokeStyle = 'rgba(90,60,30,0.3)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(s.x - 22, s.y - 13);
        ctx.lineTo(s.x + 22, s.y - 12);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s.x - 22, s.y - 8);
        ctx.lineTo(s.x + 22, s.y - 9);
        ctx.stroke();

        // Board outline
        ctx.strokeStyle = '#4a2a14';
        ctx.lineWidth = 1;
        ctx.strokeRect(s.x - 24, s.y - 18, 48, 14);

        // Sign text
        ctx.fillStyle = '#ddd';
        ctx.font = '6px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sign.text.substring(0, 12), s.x, s.y - 11);
    }

    _renderNPC(ctx, camera, npc) {
        const s = camera.worldToScreen(npc.x, npc.y);
        const r = npc.radius;

        // Ground shadow
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(s.x, s.y + r * 0.3, r * 0.8, r * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Body with gradient
        const bodyGrad = ctx.createRadialGradient(s.x - 1, s.y - 1, 1, s.x, s.y, r);
        bodyGrad.addColorStop(0, lightenColor(npc.color, 40));
        bodyGrad.addColorStop(0.7, npc.color);
        bodyGrad.addColorStop(1, darkenColor(npc.color, 40));
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = darkenColor(npc.color, 50);
        ctx.lineWidth = 1;
        ctx.stroke();

        // Role-specific accents
        const name = npc.name;
        if (name.includes('Elder')) {
            // Robe collar
            ctx.strokeStyle = lightenColor(npc.color, 60);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(s.x, s.y, r * 0.6, Math.PI + 0.5, -0.5);
            ctx.stroke();
            // Staff (vertical line to the side)
            ctx.strokeStyle = '#8b6a3e';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(s.x + r + 3, s.y - r);
            ctx.lineTo(s.x + r + 3, s.y + r * 0.5);
            ctx.stroke();
            ctx.fillStyle = '#aaccff';
            ctx.beginPath();
            ctx.arc(s.x + r + 3, s.y - r - 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
        } else if (name.includes('Shopkeeper')) {
            // Apron
            ctx.fillStyle = lightenColor(npc.color, 50);
            ctx.fillRect(s.x - r * 0.5, s.y, r, r * 0.5);
        } else if (name.includes('Smith')) {
            // Hammer
            ctx.fillStyle = '#888';
            ctx.fillRect(s.x + r + 1, s.y - 3, 3, 6);
            ctx.fillStyle = '#666';
            ctx.fillRect(s.x + r + 4, s.y - 5, 5, 4);
        } else if (name.includes('Guard')) {
            // Helmet visor
            ctx.fillStyle = darkenColor(npc.color, 30);
            ctx.beginPath();
            ctx.arc(s.x, s.y - r * 0.3, r * 0.6, Math.PI + 0.3, -0.3);
            ctx.fill();
            // Shield
            ctx.fillStyle = darkenColor(npc.color, 20);
            ctx.beginPath();
            ctx.arc(s.x - r - 2, s.y, 5, 0, Math.PI * 2);
            ctx.fill();
        } else if (name.includes('Child')) {
            // Rosy cheeks
            ctx.fillStyle = 'rgba(255, 150, 150, 0.3)';
            ctx.beginPath();
            ctx.arc(s.x - r * 0.4, s.y + 1, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(s.x + r * 0.4, s.y + 1, 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (name === 'Lira') {
            // Flower in hair
            ctx.fillStyle = '#ff88aa';
            ctx.beginPath();
            ctx.arc(s.x + r * 0.5, s.y - r * 0.6, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.arc(s.x + r * 0.5, s.y - r * 0.6, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Eyes
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(s.x - r * 0.25, s.y - r * 0.15, 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(s.x + r * 0.25, s.y - r * 0.15, 1.3, 0, Math.PI * 2);
        ctx.fill();

        // Name tag with background
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        const nameWidth = npc.name.length * 6 + 8;
        ctx.fillRect(s.x - nameWidth / 2, s.y - r - 18, nameWidth, 13);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(npc.name, s.x, s.y - r - 6);
    }

    /** Render NPC dialogue bubble (call after player so it draws on top). */
    renderDialogue(ctx, camera, npc) {
        if (!npc) return;
        const s = camera.worldToScreen(npc.x, npc.y);
        const text = npc.dialogue;

        ctx.font = '12px monospace';
        const lines = this._wrapText(ctx, text, 250);
        const lineHeight = 16;

        let maxLineWidth = 0;
        for (const line of lines) {
            const w = ctx.measureText(line).width;
            if (w > maxLineWidth) maxLineWidth = w;
        }

        const bw = maxLineWidth + 20;
        const bh = lines.length * lineHeight + 16;
        const bx = s.x - bw / 2;
        const by = s.y - npc.radius - 30 - bh;

        // Bubble
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, bw, bh);

        // Pointer
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.beginPath();
        ctx.moveTo(s.x - 6, by + bh);
        ctx.lineTo(s.x, by + bh + 8);
        ctx.lineTo(s.x + 6, by + bh);
        ctx.fill();

        // Text
        ctx.fillStyle = '#eee';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], bx + 10, by + 8 + i * lineHeight);
        }
    }

    _wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        for (const word of words) {
            const test = currentLine ? currentLine + ' ' + word : word;
            if (ctx.measureText(test).width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = test;
            }
        }
        if (currentLine) lines.push(currentLine);
        return lines;
    }
}
