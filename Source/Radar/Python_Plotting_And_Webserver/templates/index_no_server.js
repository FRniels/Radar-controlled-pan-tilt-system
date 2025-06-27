// HTML DOM components
// HTML main body container
const mainFlex = document.querySelector('.main-flex');
const canvas = document.getElementById('radarCanvas');
const ctx = canvas.getContext('2d');

// HTML pause / unpause button
const pauseBtn = document.getElementById('pauseBtn');
const pauseIcon = document.getElementById('pauseIcon');
const pauseText = document.getElementById('pauseText');
// HTML original scale / scale to window button
const btn = document.getElementById('scaleBtn');
const scaleIcon = document.getElementById('scaleIcon');
const scaleText = document.getElementById('scaleText');
// HTML Custom view mode select dropdown to allow for more flexibility in styling and functionality than a HTML <select>
const viewDropdown = document.getElementById('viewDropdown');
const viewDropdownSelected = document.querySelector('.custom-dropdown-selected');
const viewDropdownOptions = document.getElementById('viewDropdownOptions');
const viewOptions = viewDropdownOptions.querySelectorAll('.custom-dropdown-option');

// HTML timestamp
const dot = document.querySelector('#timestamp .dot');
// HTML data point / cluster centroid information 'on-click' div
const infoPanel = document.getElementById('info-panel'); 
// HTML stats panel
const statsPanel = document.getElementById('stats-panel');

// HTML hint icons (only the reset icon has dynamic functionality)
const resetPanZoomIcon = document.getElementById('resetZoomPanIcon');

// HTML SVG icons (only the icons that need to change dynamically are found here)
const lightModeIcon = `
<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" fill="rgba(183, 234, 255, 0.7)">
    <circle cx="14" cy="14" r="6" />
    <g stroke="rgba(183, 234, 255, 0.7)" stroke-width="2" stroke-linecap="round">
    <line x1="14" y1="2" x2="14" y2="6"/>
    <line x1="14" y1="22" x2="14" y2="26"/>
    <line x1="2" y1="14" x2="6" y2="14"/>
    <line x1="22" y1="14" x2="26" y2="14"/>
    <line x1="6.5" y1="6.5" x2="9.5" y2="9.5"/>
    <line x1="18.5" y1="18.5" x2="21.5" y2="21.5"/>
    <line x1="6.5" y1="21.5" x2="9.5" y2="18.5"/>
    <line x1="18.5" y1="9.5" x2="21.5" y2="6.5"/>
    </g>
</svg>
`;

const darkModeIcon = `
<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" fill="rgba(183, 234, 255, 0.7)">
    <path d="M19 14a7 7 0 1 1-9-6.708 9 9 0 1 0 9 6.708z"/>
</svg>
`;

const playIcon = `
<svg fill="rgba(183, 234, 255, 0.65)" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
    <polygon points="10,6 22,14 10,22" />
</svg>
`;

const pauseIconSVG = `
<svg fill="rgba(183, 234, 255, 0.65)" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
    <rect x="8" y="6" width="4" height="16" />
    <rect x="16" y="6" width="4" height="16" />
</svg>
`;

const fitToWindowIcon = `
<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="rgba(183, 234, 255, 0.7)" stroke-width="2" stroke-linecap="round">
    <polyline points="6,10 6,6 10,6" />
    <line x1="6" y1="6" x2="10" y2="10" />
    <polyline points="22,10 22,6 18,6" />
    <line x1="22" y1="6" x2="18" y2="10" />
    <polyline points="22,18 22,22 18,22" />
    <line x1="22" y1="22" x2="18" y2="18" />
    <polyline points="6,18 6,22 10,22" />
    <line x1="6" y1="22" x2="10" y2="18" />
</svg>
`;

const originalSizeIcon = `
<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="rgba(183, 234, 255, 0.7)" stroke-width="2" stroke-linecap="round">
    <polyline points="6,10 10,10 10,6" />
    <line x1="6" y1="6" x2="10" y2="10" />
    <polyline points="18,6 18,10 22,10" />
    <line x1="22" y1="6" x2="18" y2="10" />
    <polyline points="22,18 18,18 18,22" />
    <line x1="22" y1="22" x2="18" y2="18" />

    <polyline points="6,18 10,18 10,22" />
    <line x1="6" y1="22" x2="10" y2="18" />
</svg>
`;

const downArrowIcon = `
<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="rgba(183, 234, 255, 0.7)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="10,12 14,16 18,12" />
</svg>
`;


// CSS style variables
const styles = getComputedStyle(document.documentElement);
const axisXColor = styles.getPropertyValue('--axis-x').trim();
const axisYColor = styles.getPropertyValue('--axis-y').trim();
const axisZColor = styles.getPropertyValue('--axis-z').trim();

// Color table to give each unique cluster an unique color
const tab10Colors = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
];

// Application data
let lastData = null;         // Buffer to store the previous frame

// Application state variables
let viewMode = 'default';    // Keep track of which viewing mode the user selected
let lastViewMode = viewMode; // Track last selected view
let multiViewMode = false;   // Keep track if the user has chosen to show the multi-view
// Multiview 2x2 grid: Default, Top, Centroid, (empty or future implemented view)
const views = [
    { mode: 'default', label: 'Default View' },
    { mode: 'top', label: 'Top View' },
    { mode: 'centroid', label: 'Centroid View' },
    { mode: '', label: '' } // Unused cell for a possible future view
];
let showHeatmap = false;     // Keep track if the user has chosen to show the heatmap
let paused = false;          // Keep track if the plotting is playing or paused

// Application timers
let intervalId = null;       // The plotting set interval (timer) handle
const updateInterval = 250;  // Update interval in milliseconds (250ms = 4Hz)

// Window size
let scaledToWindow = false;
const defaultCanvasSize = { width: 1100, height: 800 };

// Parameters for 2.5D projection
const isoAngle = Math.PI / 6; // Isometric angle (PI / 6 = 30 degrees)
const yScale = 2;             // Squash the Y-axis to create a sense of perspective
const xSkew = 0.5;            // This sets how much X shifts with Y

// Axis system scaling and positioning
let scale;           // Base scale factor for the 2.5D projection
let userScale = 1.0; // User-controlled zoom factor (default 1.0)
let originX;         // Axis system 0,0,0 canvas x coordinate
let originY;         // Axis system 0,0,0 canvas y coordinate
// Axis system grid bounds and optional grid resolution upscaling (grid step) for a smoother heatmap gradient depeninding on data density
// Define the grid bounds and optionally upscale the grid resolution for a smooth heatmap gradient
const gridMinX = -5, gridMaxX = 5, gridMinY = 0, gridMaxY = 5;
const gridStep = 1; // Higher grid resolution can smooth the gradient depending on the overall point density. Note this does not change the actual grid cell size, but rather the resolution of the heatmap gradient.
const gridCols = Math.round((gridMaxX - gridMinX) / gridStep);
const gridRows = Math.round((gridMaxY - gridMinY) / gridStep);

// UI:
// Selected data point / cluster centroid
let lastSelected = null; // {type: 'point'|'cluster', data: {...}}
// Mouse panning 
let panX = 0, panY = 0;
let isPanning = false;
let panStart = { x: 0, y: 0 };
let originStart = { x: 0, y: 0 };
// Touch panning
let touchPanStart = null;
// Touch Zooming
let lastTouchDist = null;



// Hex to rgb color converter
function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
    const num = parseInt(hex, 16);
    return [num >> 16, (num >> 8) & 255, num & 255];
}

// TO DO: THIS SHOULD BE SPLIT UP INTO RadarDataRead() and DrawData()
function updateRadar() {
    // const data = generateSingleClusterData();
    const data = generateMultipleClusterData();
    drawData(data);
}

// Simulate radar data and generate a timestamp
function generateSingleClusterData() {
    const points = [];
    for (let i = 0; i < 10; i++) {
        points.push({
            x: Math.random() * (gridMaxX - gridMinX) + gridMinX, // Range: -5 to +5
            y: Math.random() * gridMaxY,      // Range: 0 to +5
            cluster: 0
        });
    }

    const cx = points.reduce((acc, p) => acc + p.x, 0) / points.length;
    const cy = points.reduce((acc, p) => acc + p.y, 0) / points.length;

    const clusters = [{
        x: cx,
        y: cy,
        cluster: 0
    }];

    return {
        points,
        clusters,
        timestamp: Date.now() / 1000
    };
}
// Simulate radar data and generate a timestamp
function generateMultipleClusterData() {
  // const pointsPerCluster = 5; // Static number of points per cluster
  const clusterRadius = 1;
  const centroidJitter = 0.6; // How far centroids can move within their region

  // Define center regions (each cluster will jitter within this)
  const baseCentroids = [
    { x: -3.5, y: 1 },
    { x: 0,    y: 3.5 },
    { x: 3.5,  y: 2 }
  ];

  const clusters = baseCentroids.map((base, i) => ({
    x: base.x + (Math.random() - 0.5) * centroidJitter,
    y: base.y + (Math.random() - 0.5) * centroidJitter,
    cluster: i
  }));

  const points = [];

  clusters.forEach((cluster, clusterIndex) => {
    // Pick a random number of points between 3 and 5, inclusive
    const pointsPerCluster = Math.floor(Math.random() * 3) + 3; // 0->2 + 3 => [3,4,5]

    for (let i = 0; i < pointsPerCluster; ++i) {
      const angle = Math.random() * 2 * Math.PI;
      const radius = Math.random() * clusterRadius;

      const x = cluster.x + Math.cos(angle) * radius;
      const y = cluster.y + Math.sin(angle) * radius;

      // Clamp to keep within overall bounds: X [-5,5], Y [0,5]
      const clampedX = Math.max(gridMinX, Math.min(gridMaxX, x));
      const clampedY = Math.max(gridMinY, Math.min(gridMaxY, y));

      points.push({ x: clampedX, y: clampedY, cluster: clusterIndex });
    }
  });

  return {
    points,
    clusters,
    timestamp: Date.now() / 1000
  };
}

// Fetch data from the python webserver
async function fetchData() {
    const response = await fetch('/data');
    const data = await response.json();
    drawData(data);
}

// Light/Dark mode toggle => window onload will check the localStorage for the dark mode setting
function setMode(dark) {
    document.body.classList.toggle('dark', dark);
    localStorage.setItem('radar_dark_mode', dark ? '1' : '0');
}

// Light/Dark mode toggle
function toggleMode() {
    setMode(!document.body.classList.contains('dark'));
    if( localStorage.getItem('radar_dark_mode') === '1') {
        lightDarkIcon.innerHTML = darkModeIcon; 
        lightDarkText.innerText = "Dark mode"; 
    } else {
        lightDarkIcon.innerHTML = lightModeIcon; 
        lightDarkText.innerText = "Light mode"; 
    }
}

// Stop/Start the radar Update/Read timer and Stop/Start plotting
function togglePause() {
    paused = !paused;

    if (paused) {
        pauseText.innerText = 'Resume';
        pauseIcon.innerHTML = playIcon;   // Show Play icon
        clearInterval(intervalId);
        dot.style.background = '#e74c3c'; // red
        dot.style.boxShadow = '0 0 6px #e74c3c';
    } else {
        pauseText.innerText = 'Pause';
        pauseIcon.innerHTML = pauseIconSVG;  // Show Pause icon
        intervalId = setInterval(() => {
            // const data = generateSingleClusterData();
            const data = generateMultipleClusterData();
            drawData(data);
        }, updateInterval);
        dot.style.background = '#38e0b6'; // green
        dot.style.boxShadow = '0 0 6px #38e0b6';
    }
}

function toggleHeatmap() {
    showHeatmap = !showHeatmap;
    document.getElementById('heatmapText').innerText = showHeatmap ? "Hide Heatmap" : "Show Heatmap";
    drawData(lastData);
    if (lastSelected) showInfoPanelAndLeg(lastSelected);
}

// Normalize a 3D vector
function normalize(v) {
    const len = Math.hypot(...v);
    return len === 0 ? [0,0,0] : v.map(x => x/len);
}

// Cross product of two 3D vectors
function cross(a, b) {
    return [
        a[1]*b[2] - a[2]*b[1],
        a[2]*b[0] - a[0]*b[2],
        a[0]*b[1] - a[1]*b[0]
    ];
}

// Make a 2.5D projection of the data points and cluster centroids onto the camera projection plane
function project3D(x, y, z = 0, centroid = null) {
    const ox = originX;
    const oy = originY;

    // TOP VIEW: orthographic projection onto XY plane 
    if (viewMode === 'top') {
        let px = x * scale;
        let py = -y * scale; // minus so Y increases upward on canvas
        px += ox;
        py += oy;
        return { x: px, y: py };
    }

    // ISOMETRIC and CENTROID VIEWS
    // Camera and target setup
    let camPos, target, up;
    if (viewMode === 'centroid' && centroid) { // TO DO: THE centroid SHOULD BE THE TRACKED TARGET CLUSTER
        camPos = [centroid.x, centroid.y, 1];
        target = [0, 0, 0];
        up = [0, 0, 1];
    } else {
        camPos = [10, -10, 5];
        target = [0, 0, 0];
        up = [0, 0, 1];
    }

    // Build view matrix (lookAt)
    let zc = normalize([camPos[0]-target[0], camPos[1]-target[1], camPos[2]-target[2]]);
    let xc = normalize(cross(up, zc));
    let yc = cross(zc, xc);

    // World to camera
    let pt = [x-camPos[0], y-camPos[1], z-camPos[2]];
    let camX = xc[0]*pt[0] + xc[1]*pt[1] + xc[2]*pt[2];
    let camY = yc[0]*pt[0] + yc[1]*pt[1] + yc[2]*pt[2];
    // let camZ = zc[0]*pt[0] + zc[1]*pt[1] + zc[2]*pt[2]; // 2.5D projection ignores the Z-axis

    // Simple perspective (orthographic for isometric effect)
    let px = camX * scale * 1.0;
    let py = -camY * scale * 1.0;

    // Center on canvas
    px += ox;
    py += oy;

    return { x: px, y: py };
}

function drawAxisLine(axis_center_point, axis_end_point_x, axis_end_point_y, axis_end_point_z, axisColor, centroid) {
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(axis_center_point.x, axis_center_point.y);
    const axis_end_point = project3D(axis_end_point_x, axis_end_point_y, axis_end_point_z, centroid);
    ctx.lineTo(axis_end_point.x, axis_end_point.y);
    ctx.stroke();
}

function drawAxisLineTicks(axis_name, range_start, range_end, axisColor, tick_num_label_offset_x, tick_num_label_offset_y, markerColor, centroid) {
    let tickStart = 0;
    let tickEnd = 0;
    
    for (let i = range_start; i <= range_end; ++i) {
        if( axis_name === 'x') {
            tickStart = project3D(i, 0, 0, centroid);
            tickEnd = project3D(i, 0, 0.1, centroid);
        } else if (axis_name === 'y') {
            tickStart = project3D(0, i, 0, centroid);
            tickEnd = project3D(0, i, 0.1, centroid);
        } else {
            console.error("Invalid axis name for drawAxisLineTicks:", axis_name);
        }
        
        ctx.strokeStyle = axisColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tickStart.x, tickStart.y);
        ctx.lineTo(tickEnd.x, tickEnd.y);
        ctx.stroke();

        ctx.fillStyle = markerColor;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(i.toString(), tickStart.x + tick_num_label_offset_x, tickStart.y + tick_num_label_offset_y);
    }
}

function drawAxisLabel(label_text, label_position_x, label_position_y, label_position_z, offset_2d_x, offset_2d_y, axisColor, centroid){
    const pLabel = project3D(label_position_x, label_position_y, label_position_z, centroid);
    ctx.save();
    ctx.font = 'bold 22px Candara, Avenir, Trebuchet MS, Segoe UI, Arial, sans-serif';
    ctx.fillStyle = axisColor;
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label_text, pLabel.x + offset_2d_x, pLabel.y + offset_2d_y);
    ctx.restore();
}

function drawAxisPlaneGridXY(grid_start_x, grid_end_x, grid_start_y, grid_end_y, gridColor, centroid) {
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    // Draw the Y grid lines
    for (let x = grid_start_x; x <= grid_end_x; ++x) {
        ctx.beginPath();
        let a = project3D(x, grid_start_y, 0, centroid), b = project3D(x, grid_end_y, 0, centroid);
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
    }
    // Draw the X grid lines
    for (let y = grid_start_y; y <= grid_end_y; ++y) {
        ctx.beginPath();
        let a = project3D(grid_start_x, y, 0, centroid), b = project3D(grid_end_x, y, 0, centroid);
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
    }
}

function drawMultiViewGridCellLabel(label) {
    ctx.save();
    ctx.font = 'bold 18px Candara, Avenir, Trebuchet MS, Segoe UI, Arial, sans-serif';
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 8;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(label, 16, 12);
    ctx.restore();
}

// Compute grid cell density by counting the amount of points per cell
function computeHeatmapGridCellDensity(data){
    // Create (and initialize to 0) a density array to count points in each grid cell
    const density = Array.from({length: gridCols * gridRows}, () => 0);
    
    // Count the amount of points per cell
    for (const p of data.points) {
        const gx = Math.floor((p.x - gridMinX) / gridStep);
        const gy = Math.floor((p.y - gridMinY) / gridStep);
        if (gx >= 0 && gx < gridCols && gy >= 0 && gy < gridRows) {
            density[gy * gridCols + gx]++;
        }
    }

    return density;
}

// Color and blur the heatmap grid cells based on the density of points in each cell
function computeHeatmapGridCellDensityColorBlur(density){
    // Simple box blur for smoothing color transitions 
    const blurred = density.slice();

    for (let gx = 0; gx < gridCols; gx++) {
        for (let gy = 0; gy < gridRows; gy++) {
            let sum = 0, count = 0;
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const nx = gx + dx, ny = gy + dy;
                    if (nx >= 0 && nx < gridCols && ny >= 0 && ny < gridRows) {
                        sum += density[ny * gridCols + nx];
                        count++;
                    }
                }
            }
            blurred[gy * gridCols + gx] = sum / count;
        }
    }

    return blurred;
}

// Drw the grid cells of the heatmap with colors based on the density of points in each cell
function colorHeatmapGridCells(maxDensity, blurred, hctx, centroid) {
    for (let gx = 0; gx < gridCols; gx++) {
        for (let gy = 0; gy < gridRows; gy++) {
            const count = blurred[gy * gridCols + gx];
            let fillStyle;
            if (count === 0) {
                fillStyle = 'rgba(40,120,255,0.18)';
            } else {
                const t = count / maxDensity;
                const r = Math.round(40 + 215 * t);
                const g = Math.round(120 + 120 * (1 - Math.abs(t - 0.5) * 2));
                const b = Math.round(220 - 220 * t);
                const alpha = 0.18 + 0.35 * t;
                fillStyle = `rgba(${r},${g},${b},${alpha})`;
            }

            // Get the grid cell corners in canvas coordinates
            const x0 = gridMinX + gx * gridStep, x1 = x0 + gridStep;
            const y0 = gridMinY + gy * gridStep, y1 = y0 + gridStep;
            const p00 = project3D(x0, y0, 0, centroid);
            const p10 = project3D(x1, y0, 0, centroid);
            const p11 = project3D(x1, y1, 0, centroid);
            const p01 = project3D(x0, y1, 0, centroid);

            hctx.save();
            hctx.beginPath();
            hctx.moveTo(p00.x, p00.y);
            hctx.lineTo(p10.x, p10.y);
            hctx.lineTo(p11.x, p11.y);
            hctx.lineTo(p01.x, p01.y);
            hctx.closePath();
            hctx.fillStyle = fillStyle;
            hctx.fill();
            hctx.restore();
        }
    }
}

// Apply the heatmap map to the main canvas
function applyHeatmapToMainCanvas(heatmapCanvas) {
    // Apply a blur filter and draw the offscreen canvas to the main canvas
    ctx.save();
    ctx.filter = 'blur(16px) contrast(1.2) saturate(1.3)'; // Optionl: Use a blur filter for a smoother heatmap
    ctx.globalAlpha = 0.85;                                // Optional: adjust overall heatmap opacity
    ctx.drawImage(heatmapCanvas, 0, 0);                    // Copy/Draw the offscreen canvas to the main canvas
    ctx.globalAlpha = 1.0;
    ctx.filter = 'none';
    ctx.restore();
}

function drawHeatmap(data, centroid){
    // Create an offscreen canvas to draw the heatmap on. This offscreen canvas will be copied to the main canvas after applying a blur filter.
    // This allows for applying a blur filter without affecting the main canvas rendering performance.
    const heatmapCanvas = document.createElement('canvas'); 
    heatmapCanvas.width = canvas.width;
    heatmapCanvas.height = canvas.height;
    const hctx = heatmapCanvas.getContext('2d');

    // TO DO: ADD THE OTHER FUNCTIONS
    const density = computeHeatmapGridCellDensity(data);
    const blurred = computeHeatmapGridCellDensityColorBlur(density);
    const maxDensity = Math.max(...blurred, 1); // Avoid division by zero

    colorHeatmapGridCells(maxDensity, blurred, hctx, centroid)
    applyHeatmapToMainCanvas(heatmapCanvas);
}

function drawShadedCircle(x, y, r, colorStops) {
    const grad = ctx.createRadialGradient(
        x - r * 0.4, y - r * 0.4, r * 0.1,
        x, y, r
    );

    for (const stop of colorStops) {
        grad.addColorStop(stop.offset, stop.color);
    }

    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = grad;
    ctx.fill();
}

function drawDataPoints(data, centroid) {
    for (const p of data.points) {
        const proj = project3D(p.x, p.y, 0, centroid);
        const r = 5;
        const colorIdx = (typeof p.cluster === "number" && p.cluster >= 0) ? p.cluster % tab10Colors.length : 0;
        const [r0, g0, b0] = hexToRgb(tab10Colors[colorIdx]); // TO DO: CONVERT THE TABLE TO RGBA COLORS AND REMOVE THE HEX CONVERSION

        const colorStops = [
            { offset: 0, color: `rgba(${Math.round(r0*0.5+255*0.5)},${Math.round(g0*0.5+255*0.5)},${Math.round(b0*0.5+255*0.5)},0.98)` },
            { offset: 0.85, color: `rgba(${r0},${g0},${b0},1)` },
            { offset: 1, color: `rgba(${Math.round(r0*0.7+255*0.3)},${Math.round(g0*0.7+255*0.3)},${Math.round(b0*0.7+255*0.3)},0.45)` }
        ];

        drawShadedCircle(proj.x, proj.y, r, colorStops);
    }
}

function drawClusterCentroids(data, centroid) {
    for (const c of data.clusters) {
        const proj = project3D(c.x, c.y, 0, centroid);
        const r = 8;
        const colorStops = [
            { offset: 0, color: "rgba(245,210,210,0.85)" },
            { offset: 0.25, color: "rgba(230,110,110,0.85)" },
            { offset: 0.7, color: "#a83232" },
            { offset: 1, color: "rgba(220,110,110,0.18)" }
        ];

        drawShadedCircle(proj.x, proj.y, r, colorStops);
    }
}

// Clear canvas, Draw grid, axis, markers, points and centroids. Handles the drawing of single and multi-view modes.
function drawData(data) {
    const width = canvas.width;
    const height = canvas.height;
    let centroid = (data.clusters[0] === null) ? null : data.clusters[0]; // TO DO: THE centroid SHOULD BE THE TRACKED TARGET CLUSTER

    // Clear the canvas before drawing to remove all previous content
    ctx.clearRect(0, 0, width, height);

    if (multiViewMode) {
        // Multiview 2x2 grid cell dimensions
        const cellW = width / 2;
        const cellH = height / 2;

        // Draw all views in there corresponding grid cells
        for (let i = 0; i < 3; i++) { // i === 3 because only 3views are available, the 4th cell can serve for a future view
            // Calculate the grid cell position based on the index
            const col = i % 2, row = Math.floor(i / 2);
            ctx.save();
            ctx.beginPath();
            ctx.rect(col * cellW, row * cellH, cellW, cellH);
            ctx.clip();
            ctx.translate(col * cellW, row * cellH); // Offset drawing origin for this cell
            // Set up the axis system for the current grid cell
            updateAxisSystem(cellW, cellH);
            // Set the axis system view mode to draw for the current grid cell
            const prevView = viewMode;
            viewMode = views[i].mode;
            // Draw each view of the multiview mode
            drawSingleView(data, centroid, views[i].label);
            viewMode = prevView;
            ctx.restore();
        }
        // Restore axis system for the main canvas
        updateAxisSystem(width, height);

        // Show the stats panel for the multi-view => TO DO: THIS SHOULD BE SEPARATED FROM DRAWDATA
        updateStatsPanel(data);

        // Update the timestamp => TO DO: THIS SHOULD BE SEPARATED FROM DRAWDATA
        document.getElementById('timestamp-text').innerText = "Last Update: " + new Date(data.timestamp * 1000).toLocaleTimeString();

        return;
    }

    // Single view mode
    drawSingleView(data, centroid, null);
}

// Draw grid, axis, markers, points and centroids for a single view
function drawSingleView(data, centroid, label) {
    // Initialize colors depending on the user's choice of dark or light mode 
    const isDark = document.body.classList.contains('dark');
    const gridColor = isDark ? '#333' : '#ddd';
    const axisColor = isDark ? '#fff' : 'black';
    const markerColor = isDark ? '#f1f1f1' : 'black';
    
    // Store the current data => TO DO: ASSIGN BEFORE CALLING DRAWDATA, THIS DOES NOT BELONG IN THIS FUNCTION, SEPPARATE CONCERNS
    lastData = data;

    // Axis system's projected center point
    let p0 = project3D(0, 0, 0, centroid);

    // Draw the X-axis
    drawAxisLine(p0, 5, 0, 0, axisXColor, centroid);
    drawAxisLineTicks('x', -5, 5, axisColor, 0, 8, markerColor, centroid);
    drawAxisLabel("X", 5.5, 0, 0, 0, 0, axisXColor, centroid);
    // Draw the Y-axis
    drawAxisLine(p0, 0, 5, 0, axisYColor, centroid);
    drawAxisLineTicks('y', 0, 5, axisColor, 8, 0, markerColor, centroid);
    drawAxisLabel("Y", 0, 5.5, 0, 0, 0, axisYColor, centroid);
    // Draw the Z-axis
    drawAxisLine(p0, 0, 0, 3, axisZColor, centroid);
    // Draw the Z-axis meter ticks => USING A TI IWR1642 RADAR WHICH CAN NOT MEASURE ELEVATION, SO THE Z-TICKS ARE NOT DRAWN
    if (viewMode === 'top') { // Move the Z-label lower in the top view to avoid overlap with the X-axis
        drawAxisLabel("Z", 0, 0, 3.5, 0, 45, axisZColor, centroid);
    } else {
        drawAxisLabel("Z", 0, 0, 3.5, 0, 0, axisZColor, centroid);
    }

    // Draw a grid on the X-Y plane (Z=0)
    drawAxisPlaneGridXY(gridMinX, gridMaxX, gridMinY, gridMaxY, gridColor, centroid);

    // Draw the multiview labels:
    if (label) {
        drawMultiViewGridCellLabel(label);
    }

    // Draw the heatmap if enabled
    if (showHeatmap) {
        drawHeatmap(data, centroid);
    }

    // Draw all data points (with per-cluster color and subtle ball shading)
    drawDataPoints(data, centroid);

    // Draw all estimated cluster centroids (ball shading, red, but not dimmed)
    drawClusterCentroids(data, centroid);

    // Update the live stats panel => TO DO: THIS SHOULD BE SEPARATED FROM DRAWDATA
    updateStatsPanel(data);

    // Update the timestamp => TO DO: THIS SHOULD BE SEPARATED FROM DRAWDATA
    document.getElementById('timestamp-text').innerText = "Last Update: " + new Date(data.timestamp * 1000).toLocaleTimeString();
}

// Update the general data status panel with the current data points and clusters information
function updateStatsPanel(data) {
    if (!statsPanel) return;

    let html = `Points: <b>${data.points.length}</b><br>`;
    html += `Clusters: <b>${data.clusters.length}</b><br>`;
    if (data.clusters.length) {
        html += `<hr style="margin:6px 0;">`;
        html += `<b>Cluster centroids:</b><br>`;
        for (const c of data.clusters) {
            html += `ID: <b>${c.cluster ?? '-'}</b> &nbsp; X: <b>${c.x.toFixed(2)}</b> &nbsp; Y: <b>${c.y.toFixed(2)}</b><br>`; // TO DO: THE GENEREATE FUNCTION SHOULD GENERATE THE CLUSTER ID
        }
    }
    statsPanel.innerHTML = html;
}

// Show the selected point / cluster centroid info panel and draw a leg from the panel to the selected point or cluster centroid
function showInfoPanelAndLeg(selection) {
    if (!selection) return;

    // Recalculate projection for the current view
    let centroid = (viewMode === 'centroid' && lastData.clusters && lastData.clusters.length) ? lastData.clusters[0] : null;
    let proj;
    if (selection.type === 'point') {
        proj = project3D(selection.data.x, selection.data.y, 0, centroid);
        infoPanel.innerHTML = `<b>Point</b><br>x: ${selection.data.x.toFixed(2)}<br>y: ${selection.data.y.toFixed(2)}`;
    } else {
        proj = project3D(selection.data.x, selection.data.y, 0, centroid);
        infoPanel.innerHTML = `<b>Cluster</b><br>x: ${selection.data.x.toFixed(2)}<br>y: ${selection.data.y.toFixed(2)}`;
    }

    // Measure the panel dimensions after setting the content
    infoPanel.style.display = 'block';
    const panelRect = infoPanel.getBoundingClientRect();
    // Position the panel top left of the pointer
    let left = proj.x - panelRect.width - 12;
    let top = proj.y - panelRect.height - 12;
    // Clamp the panel position to the canvas bounds if it goes out of bounds
    if (left < 0) left = 10;
    if (top < 0) top = 10;
    if (left + panelRect.width > canvas.width) left = canvas.width - panelRect.width - 10;
    if (top + panelRect.height > canvas.height) top = canvas.height - panelRect.height - 10;
    infoPanel.style.left = left + 'px';
    infoPanel.style.top = top + 'px';

    // Draw the panel leg from the bottom right corner of the panel to the selected point or cluster centroid
    drawData(lastData);
    const panelRight = left + panelRect.width;
    const panelBottom = top + panelRect.height;
    const elbowX = panelRight + 5;
    const elbowY = panelBottom;
    ctx.save();
    ctx.strokeStyle = "#e2e5e7";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(panelRight, panelBottom);
    ctx.lineTo(elbowX, elbowY);
    ctx.lineTo(proj.x, proj.y);
    ctx.stroke();
    ctx.restore();
}

// NOT USED YET: Center the axis system based on the view and grid bounds
function centerAxisSystem(view, width, height, gridMinX, gridMaxX, gridMinY, gridMaxY) {
    if (view === 'top') {
        // Center the grid midpoint
        const gridCenterX = (gridMinX + gridMaxX) / 2;
        const gridCenterY = (gridMinY + gridMaxY) / 2;
        const projected = project3D(gridCenterX, gridCenterY, 0);
        originX = width / 2 - (projected.x - originX);
        originY = height / 2 - (projected.y - originY);
    } else {
        // Center (0,0,0)
        const projected = project3D(0, 0, 0);
        originX = width / 2 - (projected.x - originX);
        originY = height / 2 - (projected.y - originY);
    }
}

// Update/Scale the axis system based on the canvas size
function updateAxisSystem(width, height) {
    const baseScale = 80; // or your preferred fixed scale
    scale = baseScale * userScale;
    originX = width / 2.1 + panX;
    originY = height - (height / 2.35) + panY;
}

// Resize the canvas, update the axis system rendering dimensions and redraw the canvas
function setCanvasSize(width, height) {
    const maxW = Math.floor(window.innerWidth * 0.98);
    canvas.width = Math.min(width, maxW);
    canvas.height = height;
    updateAxisSystem(canvas.width, canvas.height);
    drawData(lastData);
}

// Adjust the canvas size depending on the user's choice to scale the canvas to the window size or keep the default canvas size
function scaleToWindow() {
    scaledToWindow = !scaledToWindow;

    if (scaledToWindow) {
        // Scale to window
        const w = Math.max(300, window.innerWidth - 100);
        const h = Math.max(300, window.innerHeight - 120);
        setCanvasSize(w, h);
        scaleIcon.innerHTML = originalSizeIcon;
        scaleText.innerText = "Original Size";
        mainFlex.classList.add('scaled');
    } else {
        // Restore original size
        setCanvasSize(defaultCanvasSize.width, defaultCanvasSize.height);
        scaleIcon.innerHTML = fitToWindowIcon;
        scaleText.innerText = "Scale to Window";
        mainFlex.classList.remove('scaled');
    }
    // Recalculate info panel and leg if something is selected
    if (lastSelected) {
        showInfoPanelAndLeg(lastSelected); // TO DO: THE POSITIONING OF THE INFO PANEL IS WAY OFF AND THE LEG IS NOT DRAWN
    }
}

// ----- EVENT HANDLERS -----

// Initialize the webpage and get the first radar data => 'Application starting point'
window.onload = () => {
    // Dark/Light mode: Default to dark mode if the browser local storage wasn't set before
    const stored = localStorage.getItem('radar_dark_mode');
    const dark = stored === null ? true : stored === '1';
    setMode(dark);

    if (dark) {
        lightDarkIcon.innerHTML = darkModeIcon;
        lightDarkText.innerText = "Dark mode";
    } else {
        lightDarkIcon.innerHTML = lightModeIcon;
        lightDarkText.innerText = "Light mode";
    }

    // Set initial active option of the dropdown menu in the button panel
    viewOptions[0].classList.add('active');

    // Initialize the axis system to match the initial canvas size => TO DO: call centerAxisSystem() to center the axis system ??
    updateAxisSystem(canvas.width, canvas.height);
    // Set a timer for Updating/Reading new radar data and manually call the first radar data Update/Read
    intervalId = setInterval(updateRadar, 250);
    updateRadar();
};

// Resize the canvas on window resize if the user has chosen to scale the canvas to the window size
window.addEventListener('resize', () => {
    if (scaledToWindow) {
        const w = Math.max(300, window.innerWidth - 100);
        const h = Math.max(300, window.innerHeight - 120);
        setCanvasSize(w, h);
    }
});

// Mouse panning (left button)
canvas.addEventListener('mousedown', function(e) {
    if (e.button === 0) { // left mouse button
        isPanning = true;
        panStart.x = e.clientX;
        panStart.y = e.clientY;
        originStart.x = panX;
        originStart.y = panY;
        canvas.style.cursor = 'grabbing';
    }
});
window.addEventListener('mousemove', function(e) {
    if (isPanning) {
        panX = originStart.x + (e.clientX - panStart.x);
        panY = originStart.y + (e.clientY - panStart.y);
        updateAxisSystem(canvas.width, canvas.height);
        drawData(lastData);
    }
});
window.addEventListener('mouseup', function(e) {
    if (isPanning && e.button === 0) {
        isPanning = false;
        canvas.style.cursor = '';
    }
});

// Touch panning (single finger) 
canvas.addEventListener('touchstart', function(e) {
    if (e.touches.length === 1) {
        touchPanStart = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            panX: panX,
            panY: panY
        };
        canvas.style.cursor = 'grabbing';
    }
});
canvas.addEventListener('touchmove', function(e) {
    if (e.touches.length === 1 && touchPanStart) {
        e.preventDefault();
        panX = touchPanStart.panX + (e.touches[0].clientX - touchPanStart.x);
        panY = touchPanStart.panY + (e.touches[0].clientY - touchPanStart.y);
        updateAxisSystem(canvas.width, canvas.height);
        drawData(lastData);
    }
}, { passive: false });
canvas.addEventListener('touchend', function(e) {
    if (e.touches.length === 0) {
        touchPanStart = null;
        canvas.style.cursor = '';
    }
});

// Handle canvas pinch-to-zoom with two fingers
canvas.addEventListener('touchmove', function(e) {
    if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        if (lastTouchDist) {
            let delta = dist - lastTouchDist;
            userScale *= (1 + delta / 1000); // Adjust denominator for sensitivity
            userScale = Math.max(0.2, Math.min(5, userScale));
            updateAxisSystem(canvas.width, canvas.height);
            drawData(lastData);
        }
        lastTouchDist = dist;
    }
}, { passive: false });
canvas.addEventListener('touchend', function(e) {
    if (e.touches.length < 2) lastTouchDist = null;
});

// Handle canvas mouse wheel zooming
canvas.addEventListener('wheel', function(e) {
    e.preventDefault();
    const zoomIntensity = 0.08;
    
    if (e.deltaY < 0) {
        userScale *= (1 + zoomIntensity);
    } else {
        userScale /= (1 + zoomIntensity);
    }
    
    userScale = Math.max(0.2, Math.min(5, userScale)); // Clamp zoom
    updateAxisSystem(canvas.width, canvas.height);
    drawData(lastData);
}, { passive: false });

// Reset the zoom and pan values to their defaults
resetPanZoomIcon.addEventListener('click', function() {
    userScale = 1.0;
    panX = 0;
    panY = 0;
    updateAxisSystem(canvas.width, canvas.height);
    drawData(lastData);
    if (lastSelected) showInfoPanelAndLeg(lastSelected);
});

// Handle canvas clicks to show/hide data point / cluster centroid info
canvas.addEventListener('click', function(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find nearest point within 15px
    let found = null, minDist = 15;
    let centroid = (viewMode === 'centroid' && lastData.clusters && lastData.clusters.length) ? lastData.clusters[0] : null;
    for (const p of lastData.points) {
        const proj = project3D(p.x, p.y, 0, centroid);
        const dist = Math.hypot(proj.x - x, proj.y - y);
        if (dist < minDist) {
            found = { type: 'point', data: p, proj };
            minDist = dist;
        }
    }
    // Check clusters 
    for (const c of lastData.clusters) {
        const proj = project3D(c.x, c.y, 0, centroid);
        const dist = Math.hypot(proj.x - x, proj.y - y);
        if (dist < minDist + 8) {
            found = { type: 'cluster', data: c, proj };
            minDist = dist;
        }
    }

    if (found) {
        lastSelected = found;
        showInfoPanelAndLeg(found);
    } else {
        lastSelected = null;
        infoPanel.style.display = 'none';
        drawData(lastData);
    }
});
// Handle canvas touches to show/hide data point / cluster centroid info and reset the touch scaling if only 1 finger is used
canvas.addEventListener('touchstart', function(e) {
    if (e.touches.length === 1) {
        canvas.dispatchEvent(new MouseEvent('click', {
            clientX: e.touches[0].clientX,
            clientY: e.touches[0].clientY
        }));
    }

    if (e.touches.length < 2) lastTouchDist = null;
});

// Open/close custom dropdown menu in the button panel
viewDropdown.addEventListener('click', function(e) {
    // Only toggle if not clicking an option
    if (!e.target.classList.contains('custom-dropdown-option')) {
        viewDropdown.classList.toggle('open');
    }
});
// Close custom dropdown menu on outside click
document.addEventListener('click', function(e) {
    if (!viewDropdown.contains(e.target)) {
        viewDropdown.classList.remove('open');
    }
});
// Click handlers for the custom dropdown options => TO DO: DOES CLICK ALSO WORK ON MOBILE?
viewOptions.forEach(opt => {
    opt.addEventListener('click', function(e) {
    const selectedValue = this.getAttribute('data-value');
    // If multiViewMode is on and user clicks the already-selected view, turn off multiViewMode
    if (multiViewMode && selectedValue === lastViewMode) {
        multiViewMode = false;
        updateAxisSystem(canvas.width, canvas.height);
        drawData(lastData);
        if (lastSelected) showInfoPanelAndLeg(lastSelected);
    } else if (selectedValue !== viewMode) {
        // Change view
        viewMode = selectedValue;
        lastViewMode = viewMode;
        multiViewMode = false;
        // Update label
        viewDropdownSelected.innerHTML = this.innerHTML + downArrowIcon;
        // Highlight active
        viewOptions.forEach(o => o.classList.remove('active'));
        this.classList.add('active');
        // centerAxisSystem(viewMode, canvas.width, canvas.height, gridMinX, gridMaxX, gridMinY, gridMaxY);
        updateAxisSystem(canvas.width, canvas.height);
        drawData(lastData);
        if (lastSelected) showInfoPanelAndLeg(lastSelected);
    }
    viewDropdown.classList.remove('open');
    e.stopPropagation();
    });
});

// Toggle multiViewMode and redraw the canvas
document.getElementById('multiViewBtn').addEventListener('click', function() {
    multiViewMode = !multiViewMode;
    drawData(lastData);
});
