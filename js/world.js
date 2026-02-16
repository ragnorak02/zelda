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

import { clamp } from './utils.js';

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
            ctx.fillStyle = bld.type === 'shop' ? '#2d3a26' : '#3a2d20';
            ctx.fillRect(s.x, s.y, bld.w, bld.h);
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 1;
            ctx.strokeRect(s.x, s.y, bld.w, bld.h);
        }
    }

    _ground(ctx, camera, wx, wy, ww, wh, color) {
        const tl = camera.worldToScreen(wx, wy);
        const br = camera.worldToScreen(wx + ww, wy + wh);
        ctx.fillStyle = color;
        ctx.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
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
        ctx.fillStyle = '#5a3d1e';
        ctx.fillRect(s.x - 3, s.y - 3, 6, 6);
        ctx.fillStyle = '#2d5a1e';
        ctx.beginPath();
        ctx.arc(s.x, s.y, obs.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1a3d12';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    _renderWall(ctx, camera, obs) {
        const s = camera.worldToScreen(obs.x, obs.y);
        ctx.fillStyle = '#5a4a3a';
        ctx.fillRect(s.x, s.y, obs.w, obs.h);
        ctx.strokeStyle = '#3d2a1a';
        ctx.lineWidth = 1;
        ctx.strokeRect(s.x, s.y, obs.w, obs.h);
    }

    _renderRock(ctx, camera, obs) {
        const s = camera.worldToScreen(obs.x, obs.y);
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.arc(s.x, s.y, obs.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    _renderWell(ctx, camera, obs) {
        const s = camera.worldToScreen(obs.x, obs.y);
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(s.x, s.y, obs.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#2a5a8a';
        ctx.beginPath();
        ctx.arc(s.x, s.y, obs.radius - 2, 0, Math.PI * 2);
        ctx.fill();
    }

    _renderFairyTree(ctx, camera, obs) {
        const s = camera.worldToScreen(obs.x, obs.y);
        const pulse = 0.7 + Math.sin(performance.now() / 800) * 0.3;

        // Glow aura
        ctx.globalAlpha = 0.15 * pulse;
        ctx.fillStyle = '#88ffaa';
        ctx.beginPath();
        ctx.arc(s.x, s.y, obs.radius + 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Trunk
        ctx.fillStyle = '#6b4a2e';
        ctx.fillRect(s.x - 10, s.y - 10, 20, 20);

        // Canopy
        ctx.fillStyle = '#1a6b2e';
        ctx.beginPath();
        ctx.arc(s.x, s.y, obs.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0d4a1a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Sparkles
        ctx.fillStyle = `rgba(180, 255, 200, ${0.3 * pulse})`;
        ctx.beginPath();
        ctx.arc(s.x - 10, s.y - 8, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(s.x + 12, s.y + 5, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    _renderCaveRock(ctx, camera, obs) {
        const s = camera.worldToScreen(obs.x, obs.y);
        ctx.fillStyle = '#3a3a3a';
        ctx.beginPath();
        ctx.arc(s.x, s.y, obs.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    _renderCaveDark(ctx, camera, obs) {
        const s = camera.worldToScreen(obs.x, obs.y);
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(s.x, s.y, obs.w, obs.h);
    }

    _renderBridge(ctx, camera, obs) {
        const s = camera.worldToScreen(obs.x, obs.y);
        ctx.fillStyle = '#7a5a30';
        ctx.fillRect(s.x, s.y, obs.w, obs.h);
        // Plank lines
        ctx.strokeStyle = '#5a4020';
        ctx.lineWidth = 1;
        for (let px = 0; px < obs.w; px += 20) {
            ctx.beginPath();
            ctx.moveTo(s.x + px, s.y);
            ctx.lineTo(s.x + px, s.y + obs.h);
            ctx.stroke();
        }
        // Railings
        ctx.strokeStyle = '#6a4a28';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + obs.w, s.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s.x, s.y + obs.h);
        ctx.lineTo(s.x + obs.w, s.y + obs.h);
        ctx.stroke();
    }

    _renderBarricade(ctx, camera, obs) {
        const s = camera.worldToScreen(obs.x, obs.y);
        ctx.fillStyle = '#aa3333';
        ctx.fillRect(s.x, s.y, obs.w, obs.h);
        ctx.fillStyle = '#ddddaa';
        for (let by = 0; by < obs.h; by += 20) {
            ctx.fillRect(s.x, s.y + by, obs.w, 8);
        }
        ctx.strokeStyle = '#882222';
        ctx.lineWidth = 2;
        ctx.strokeRect(s.x, s.y, obs.w, obs.h);
    }

    _renderGlow(ctx, camera, obs) {
        const s = camera.worldToScreen(obs.x, obs.y);
        const pulse = 0.5 + Math.sin(performance.now() / 600 + obs.x) * 0.5;
        ctx.globalAlpha = 0.6 * pulse;
        ctx.fillStyle = '#aaffcc';
        ctx.beginPath();
        ctx.arc(s.x, s.y, obs.radius + 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ccffdd';
        ctx.beginPath();
        ctx.arc(s.x, s.y, obs.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    _renderGap(ctx, camera, obs) {
        const s = camera.worldToScreen(obs.x, obs.y);
        // Dark pit
        ctx.fillStyle = '#080810';
        ctx.fillRect(s.x, s.y, obs.w, obs.h);
        // Edge highlights
        ctx.strokeStyle = 'rgba(100, 80, 60, 0.6)';
        ctx.lineWidth = 2;
        ctx.strokeRect(s.x, s.y, obs.w, obs.h);
        // Inner shadow
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(s.x + 2, s.y + 2, obs.w - 4, obs.h - 4);
    }

    _renderVine(ctx, camera, obs) {
        const s = camera.worldToScreen(obs.x, obs.y);
        const cx = s.x + obs.w / 2;
        const cy = s.y + obs.h / 2;

        // Rope line (vertical)
        ctx.strokeStyle = '#6b4a2e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, s.y);
        ctx.lineTo(cx, s.y + obs.h);
        ctx.stroke();

        // Leaf dots along the rope
        ctx.fillStyle = '#2d7a1e';
        for (let i = 0; i < 4; i++) {
            const ly = s.y + (obs.h / 4) * i + obs.h / 8;
            const lx = cx + (i % 2 === 0 ? -4 : 4);
            ctx.beginPath();
            ctx.arc(lx, ly, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ── Sign & NPC renderers ──

    _renderSign(ctx, camera, sign) {
        const s = camera.worldToScreen(sign.x, sign.y);
        ctx.fillStyle = '#6b4a2e';
        ctx.fillRect(s.x - 2, s.y - 8, 4, 16);
        ctx.fillStyle = '#8b6a3e';
        ctx.fillRect(s.x - 22, s.y - 16, 44, 14);
        ctx.strokeStyle = '#5a3a1e';
        ctx.lineWidth = 1;
        ctx.strokeRect(s.x - 22, s.y - 16, 44, 14);
    }

    _renderNPC(ctx, camera, npc) {
        const s = camera.worldToScreen(npc.x, npc.y);
        // Body
        ctx.fillStyle = npc.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, npc.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Name tag
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(npc.name, s.x, s.y - npc.radius - 6);
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
