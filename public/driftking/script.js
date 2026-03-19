
// --- Constants & Config ---
const GAME_CONFIG = {
    FPS: 60,
    CANVAS_WIDTH: 1024,
    CANVAS_HEIGHT: 768,
    CAR_WIDTH: 24,
    CAR_LENGTH: 44,
    MAX_SPEED: 15,
    ACCELERATION: 0.2,
    BRAKING: 0.3,
    FRICTION: 0.98,
    TURN_SPEED: 0.06,
    MAX_STEER_ANGLE: 0.6,
    DRIFT_GRIP: 0.94,
    GRIP_THRESHOLD: 3,
    LATERAL_FRICTION: 0.85,
};

// --- Physics Utilities ---
const vecAdd = (v1, v2) => ({ x: v1.x + v2.x, y: v1.y + v2.y });
const vecSub = (v1, v2) => ({ x: v1.x - v2.x, y: v1.y - v2.y });
const vecMult = (v, s) => ({ x: v.x * s, y: v.y * s });
const vecDot = (v1, v2) => v1.x * v2.x + v1.y * v2.y;
const vecMag = (v) => Math.sqrt(v.x * v.x + v.y * v.y);
const vecNormalize = (v) => {
    const m = vecMag(v);
    return m === 0 ? { x: 0, y: 0 } : { x: v.x / m, y: v.y / m };
};
const vecRotate = (v, angle) => ({
    x: v.x * Math.cos(angle) - v.y * Math.sin(angle),
    y: v.x * Math.sin(angle) + v.y * Math.cos(angle),
});

const getLineIntersection = (p1, p2, p3, p4) => {
    const det = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
    if (det === 0) return false;
    const lambda = ((p4.y - p3.y) * (p4.x - p1.x) + (p3.x - p4.x) * (p4.y - p1.y)) / det;
    const gamma = ((p1.y - p2.y) * (p4.x - p1.x) + (p2.x - p1.x) * (p4.y - p1.y)) / det;
    return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
};

const getWallCollision = (pos, radius, walls) => {
    let best = null;
    for (const wall of walls) {
        const a = wall.p1;
        const b = wall.p2;
        const l2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
        let t = 0;
        if (l2 !== 0) {
            t = ((pos.x - a.x) * (b.x - a.x) + (pos.y - a.y) * (b.y - a.y)) / l2;
            t = Math.max(0, Math.min(1, t));
        }
        const proj = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
        const diff = vecSub(pos, proj);
        const d = vecMag(diff);
        if (d < radius) {
            if (!best || d < best.dist) {
                let normal = d > 0 ? vecNormalize(diff) : { x: 0, y: 0 };
                if (d === 0) {
                    const wallDir = vecSub(b, a);
                    const perp = { x: -wallDir.y, y: wallDir.x };
                    normal = vecNormalize(perp);
                }
                best = { wall, dist: d, normal };
            }
        }
    }
    return best;
};

// --- Track Data Helpers ---
const createBox = (x, y, w, h) => [
    { p1: { x, y }, p2: { x: x + w, y } },
    { p1: { x: x + w, y }, p2: { x: x + w, y: y + h } },
    { p1: { x: x + w, y: y + h }, p2: { x, y: y + h } },
    { p1: { x, y: y + h }, p2: { x, y } },
];

const generateWalls = (points) => {
    const walls = [];
    for (let i = 0; i < points.length; i++) {
        const next = (i + 1) % points.length;
        walls.push({
            p1: { x: points[i][0], y: points[i][1] },
            p2: { x: points[next][0], y: points[next][1] },
        });
    }
    return walls;
};

const TRACKS = [
    {
        id: 'track1',
        name: 'The Donut',
        color: '#374151',
        startPosition: { x: 150, y: 384 },
        startRotation: -Math.PI / 2,
        outerWalls: generateWalls([[50, 50], [974, 50], [974, 718], [50, 718]]),
        innerWalls: generateWalls([[300, 200], [724, 200], [724, 568], [300, 568]]),
        checkpoints: [
            { p1: { x: 50, y: 384 }, p2: { x: 300, y: 384 } },
            { p1: { x: 512, y: 50 }, p2: { x: 512, y: 200 } },
            { p1: { x: 724, y: 384 }, p2: { x: 974, y: 384 } },
            { p1: { x: 512, y: 568 }, p2: { x: 512, y: 718 } },
        ]
    },
    {
        id: 'track2',
        name: 'Figure 8',
        color: '#1f2937',
        startPosition: { x: 100, y: 150 },
        startRotation: 0,
        outerWalls: generateWalls([[50, 50], [450, 50], [512, 300], [574, 50], [974, 50], [974, 718], [574, 718], [512, 468], [450, 718], [50, 718]]),
        innerWalls: generateWalls([[200, 200], [350, 200], [400, 350], [350, 568], [200, 568]]).concat(generateWalls([[674, 200], [824, 200], [824, 568], [674, 568], [624, 418]])),
        checkpoints: [
            { p1: { x: 50, y: 384 }, p2: { x: 200, y: 384 } },
            { p1: { x: 512, y: 300 }, p2: { x: 512, y: 468 } }
        ]
    },
    {
        id: 'track3',
        name: 'Hairpin Hollow',
        color: '#111827',
        startPosition: { x: 512, y: 680 },
        startRotation: Math.PI,
        outerWalls: generateWalls([[20, 20], [1004, 20], [1004, 748], [20, 748]]),
        innerWalls: [
            ...createBox(260, 150, 40, 450),
            ...createBox(512, 150, 40, 450),
            ...createBox(764, 150, 40, 450),
        ],
        checkpoints: [
            { p1: { x: 300, y: 650 }, p2: { x: 700, y: 748 } },
            { p1: { x: 20, y: 150 }, p2: { x: 260, y: 150 } },
            { p1: { x: 260, y: 600 }, p2: { x: 552, y: 600 } },
            { p1: { x: 552, y: 150 }, p2: { x: 804, y: 150 } },
        ]
    }
];

// --- Game Logic ---
let currentTrack = null;
let animationFrameId = null;
let lastTime = 0;

// State objects (similar to refs in React version)
const carState = {
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    angle: 0,
    angularVel: 0,
    steerAngle: 0,
    isDrifting: false
};

const particles = [];
const skidMarks = [];
const inputs = { up: false, down: false, left: false, right: false, space: false };

let nextCheckpointIndex = 1;
let currentLapStartTime = 0;
let lastCarPos = { x: 0, y: 0 };
let bestLapTime = null;
let currentLap = 1;
let driftScore = 0;

// --- DOM Elements ---
const mainMenu = document.getElementById('main-menu');
const gameInterface = document.getElementById('game-interface');
const trackList = document.getElementById('track-list');
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d', { alpha: false });

const hudScore = document.getElementById('hud-score');
const hudLap = document.getElementById('hud-lap');
const hudTime = document.getElementById('hud-time');
const hudBest = document.getElementById('hud-best');
const hudSpeed = document.getElementById('hud-speed');
const speedMeter = document.getElementById('speed-meter');
const exitButton = document.getElementById('exit-button');

// --- Initialization ---
function init() {
    // Generate Track Buttons
    TRACKS.forEach(track => {
        const btn = document.createElement('button');
        btn.className = "group relative overflow-hidden rounded-2xl bg-gray-800 border border-gray-700 hover:border-yellow-400 transition-all duration-300 hover:shadow-[0_0_30px_rgba(250,204,21,0.3)]";
        
        let technicality = track.id === 'track1' ? 2 : track.id === 'track2' ? 4 : 5;
        let stars = '';
        for(let i=0; i<5; i++) {
            stars += `<div class="w-2 h-2 rounded-full mx-0.5 ${i < technicality ? 'bg-yellow-500' : 'bg-gray-600'}"></div>`;
        }

        // SVG Mini Map
        let wallsSvg = '';
        track.outerWalls.forEach(w => wallsSvg += `<line x1="${w.p1.x}" y1="${w.p1.y}" x2="${w.p2.x}" y2="${w.p2.y}" stroke="#4b5563" stroke-width="20" />`);
        track.innerWalls.forEach(w => wallsSvg += `<line x1="${w.p1.x}" y1="${w.p1.y}" x2="${w.p2.x}" y2="${w.p2.y}" stroke="#4b5563" stroke-width="20" />`);

        btn.innerHTML = `
            <div class="h-32 w-full bg-gray-700 relative">
                <svg class="w-full h-full p-4" viewBox="0 0 1024 768">${wallsSvg}</svg>
            </div>
            <div class="p-6 text-left">
                <h3 class="text-2xl font-bold mb-1 group-hover:text-yellow-400 transition-colors uppercase italic">${track.name}</h3>
                <div class="flex items-center text-sm text-gray-400 space-x-2">
                    <span>Technicality:</span>
                    <div class="flex">${stars}</div>
                </div>
            </div>
        `;
        btn.onclick = () => startTrack(track);
        trackList.appendChild(btn);
    });

    // Event Listeners
    window.onkeydown = (e) => handleKey(e.code, true);
    window.onkeyup = (e) => handleKey(e.code, false);
    exitButton.onclick = exitTrack;
    
    // Canvas Sizing
    canvas.width = GAME_CONFIG.CANVAS_WIDTH;
    canvas.height = GAME_CONFIG.CANVAS_HEIGHT;
}

function handleKey(code, isPressed) {
    switch(code) {
        case 'ArrowUp': case 'KeyW': inputs.up = isPressed; break;
        case 'ArrowDown': case 'KeyS': inputs.down = isPressed; break;
        case 'ArrowLeft': case 'KeyA': inputs.left = isPressed; break;
        case 'ArrowRight': case 'KeyD': inputs.right = isPressed; break;
        case 'Space': inputs.space = isPressed; break;
    }
}

function startTrack(track) {
    currentTrack = track;
    mainMenu.classList.add('hidden');
    gameInterface.classList.remove('hidden');

    // Reset State
    carState.pos = { ...track.startPosition };
    carState.vel = { x: 0, y: 0 };
    carState.angle = track.startRotation;
    carState.steerAngle = 0;
    carState.isDrifting = false;
    
    lastCarPos = { ...track.startPosition };
    particles.length = 0;
    skidMarks.length = 0;
    driftScore = 0;
    nextCheckpointIndex = 1;
    currentLapStartTime = performance.now();
    currentLap = 1;
    bestLapTime = null;

    updateHUD(0);
    lastTime = performance.now();
    animationFrameId = requestAnimationFrame(gameLoop);
}

function exitTrack() {
    cancelAnimationFrame(animationFrameId);
    currentTrack = null;
    gameInterface.classList.add('hidden');
    mainMenu.classList.remove('hidden');
}

function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centis = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
}

function updateHUD(time) {
    hudScore.textContent = driftScore.toLocaleString();
    hudLap.textContent = currentLap;
    hudTime.textContent = formatTime(performance.now() - currentLapStartTime);
    hudBest.textContent = bestLapTime ? formatTime(bestLapTime) : '--:--.--';
    
    const speed = Math.round(vecMag(carState.vel) * 10);
    hudSpeed.textContent = speed;
    speedMeter.style.transform = `rotate(${-135 + (speed * 1.5)}deg)`;
}

// --- Main Loop ---
function gameLoop(time) {
    const dt = time - lastTime;
    lastTime = time;

    updatePhysics();
    updateParticles();
    draw();

    // Update HUD at lower frequency (~15fps)
    if (Math.floor(time / 66) !== Math.floor((time - dt) / 66)) {
        updateHUD(time);
    }

    animationFrameId = requestAnimationFrame(gameLoop);
}

function updatePhysics() {
    const car = carState;
    const input = inputs;

    // Steering
    const targetSteer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    car.steerAngle += (targetSteer * GAME_CONFIG.MAX_STEER_ANGLE - car.steerAngle) * 0.08;

    // Acceleration
    const accelDir = { x: Math.cos(car.angle), y: Math.sin(car.angle) };
    if (input.up) {
        car.vel = vecAdd(car.vel, vecMult(accelDir, GAME_CONFIG.ACCELERATION));
    } else if (input.down) {
        car.vel = vecAdd(car.vel, vecMult(accelDir, -GAME_CONFIG.BRAKING));
    }

    // Max Speed
    const currentSpeed = vecMag(car.vel);
    if (currentSpeed > GAME_CONFIG.MAX_SPEED) {
        car.vel = vecMult(car.vel, GAME_CONFIG.MAX_SPEED / currentSpeed);
    }

    // Drifting Physics
    const localVel = vecRotate(car.vel, -car.angle);
    let gripThreshold = GAME_CONFIG.GRIP_THRESHOLD;
    if (input.up) gripThreshold *= 0.85;

    const isSliding = Math.abs(localVel.y) > gripThreshold;
    const isHandBraking = input.space;

    let lateralFriction = GAME_CONFIG.LATERAL_FRICTION;
    if (isSliding || isHandBraking) {
        car.isDrifting = true;
        lateralFriction = 0.97;
        if (isHandBraking) lateralFriction = 0.95;
    } else {
        car.isDrifting = false;
        lateralFriction = 0.75;
    }

    localVel.x *= GAME_CONFIG.FRICTION;
    localVel.y *= lateralFriction;
    car.vel = vecRotate(localVel, car.angle);

    // Rotation
    if (currentSpeed > 0.5) {
        const dir = vecDot(car.vel, accelDir) < -0.1 ? -1 : 1;
        let turnRate = GAME_CONFIG.TURN_SPEED;
        if (car.isDrifting) {
            turnRate *= 1.4;
            if (input.up) turnRate *= 1.3;
            if (input.space) turnRate *= 1.5;
        }
        car.angle += car.steerAngle * turnRate * dir;
    }

    // Position
    const prevPos = { ...car.pos };
    car.pos = vecAdd(car.pos, car.vel);

    // Collision
    const radius = GAME_CONFIG.CAR_WIDTH / 1.5;
    const collision = getWallCollision(car.pos, radius, [...currentTrack.outerWalls, ...currentTrack.innerWalls]);
    if (collision) {
        const penetration = radius - collision.dist;
        car.pos = vecAdd(car.pos, vecMult(collision.normal, penetration + 0.1));
        const wallVec = vecSub(collision.wall.p2, collision.wall.p1);
        const wallDir = vecNormalize(wallVec);
        car.vel = vecMult(wallDir, vecDot(car.vel, wallDir) * 0.92);
    }

    // Checkpoints
    if (currentTrack.checkpoints.length > 0) {
        const target = currentTrack.checkpoints[nextCheckpointIndex];
        if (getLineIntersection(lastCarPos, car.pos, target.p1, target.p2)) {
            if (nextCheckpointIndex === 0) {
                const now = performance.now();
                const lapTime = now - currentLapStartTime;
                if (lapTime > 5000) {
                    if (bestLapTime === null || lapTime < bestLapTime) bestLapTime = lapTime;
                    currentLap++;
                    currentLapStartTime = now;
                }
            }
            nextCheckpointIndex = (nextCheckpointIndex + 1) % currentTrack.checkpoints.length;
        }
    }
    lastCarPos = { ...car.pos };

    // Effects
    if (car.isDrifting && currentSpeed > 2) {
        const rearOffset = 15;
        const wheelOffset = 10;
        const rearCenter = vecSub(car.pos, vecMult({x: Math.cos(car.angle), y: Math.sin(car.angle)}, rearOffset));
        const leftWheel = vecAdd(rearCenter, vecRotate({x: 0, y: -wheelOffset}, car.angle));
        const rightWheel = vecAdd(rearCenter, vecRotate({x: 0, y: wheelOffset}, car.angle));

        skidMarks.push({ p1: leftWheel, p2: vecAdd(leftWheel, vecMult(car.vel, -0.1)), opacity: 0.3 });
        skidMarks.push({ p1: rightWheel, p2: vecAdd(rightWheel, vecMult(car.vel, -0.1)), opacity: 0.3 });

        if (Math.random() > 0.7) {
            particles.push({
                pos: vecAdd(rearCenter, { x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 10 }),
                vel: { x: (Math.random() - 0.5), y: (Math.random() - 0.5) },
                life: 1.0,
                size: 5 + Math.random() * 5,
                color: `rgba(200, 200, 200, 0.5)`
            });
        }
        driftScore += Math.round(vecMag(car.vel) * Math.abs(car.steerAngle) * 10);
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= 0.02;
        p.pos = vecAdd(p.pos, p.vel);
        p.size += 0.2;
        if (p.life <= 0) particles.splice(i, 1);
    }
    if (skidMarks.length > 300) skidMarks.splice(0, skidMarks.length - 300);
}

function draw() {
    ctx.fillStyle = currentTrack.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 4;
    skidMarks.forEach(s => {
        ctx.strokeStyle = `rgba(20, 20, 20, ${s.opacity})`;
        ctx.beginPath();
        ctx.moveTo(s.p1.x, s.p1.y);
        ctx.lineTo(s.p2.x, s.p2.y);
        ctx.stroke();
    });

    const drawWalls = (walls, color) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 8;
        ctx.beginPath();
        walls.forEach(w => { ctx.moveTo(w.p1.x, w.p1.y); ctx.lineTo(w.p2.x, w.p2.y); });
        ctx.stroke();
    };

    ctx.setLineDash([20, 20]);
    drawWalls(currentTrack.outerWalls, '#ef4444');
    ctx.lineDashOffset = 20;
    drawWalls(currentTrack.outerWalls, '#ffffff');
    drawWalls(currentTrack.innerWalls, '#ef4444');
    ctx.lineDashOffset = 0;
    drawWalls(currentTrack.innerWalls, '#ffffff');
    ctx.setLineDash([]);
    drawWalls(currentTrack.outerWalls, '#111');
    drawWalls(currentTrack.innerWalls, '#111');

    if (currentTrack.checkpoints.length > 0) {
        const start = currentTrack.checkpoints[0];
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 10;
        ctx.setLineDash([10, 10]);
        ctx.beginPath(); ctx.moveTo(start.p1.x, start.p1.y); ctx.lineTo(start.p2.x, start.p2.y); ctx.stroke();
        ctx.setLineDash([]);
    }

    const car = carState;
    ctx.save();
    ctx.translate(car.pos.x, car.pos.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-GAME_CONFIG.CAR_LENGTH / 2 + 5, -GAME_CONFIG.CAR_WIDTH / 2 + 5, GAME_CONFIG.CAR_LENGTH, GAME_CONFIG.CAR_WIDTH);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-GAME_CONFIG.CAR_LENGTH / 2, -GAME_CONFIG.CAR_WIDTH / 2, GAME_CONFIG.CAR_LENGTH, GAME_CONFIG.CAR_WIDTH);
    ctx.fillStyle = '#111'; ctx.fillRect(-5, -10, 15, 20);
    ctx.fillStyle = '#fef08a';
    ctx.beginPath(); ctx.arc(GAME_CONFIG.CAR_LENGTH/2 - 2, -8, 3, 0, Math.PI * 2); ctx.arc(GAME_CONFIG.CAR_LENGTH/2 - 2, 8, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 200, 0.1)';
    ctx.beginPath(); ctx.moveTo(20, -10); ctx.lineTo(150, -40); ctx.lineTo(150, -5); ctx.fill();
    ctx.beginPath(); ctx.moveTo(20, 10); ctx.lineTo(150, 40); ctx.lineTo(150, 5); ctx.fill();
    ctx.fillStyle = '#000'; ctx.fillRect(-18, -14, 10, 4); ctx.fillRect(-18, 10, 10, 4);
    ctx.save(); ctx.translate(18, -14); ctx.rotate(car.steerAngle); ctx.fillRect(-5, -2, 10, 4); ctx.restore();
    ctx.save(); ctx.translate(18, 10); ctx.rotate(car.steerAngle); ctx.fillRect(-5, -2, 10, 4); ctx.restore();
    ctx.restore();

    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1.0;
    });
}

// Start
init();
