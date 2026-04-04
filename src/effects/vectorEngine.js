const CUBE_VERTICES = [
  [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
  [-1, -1, 1],  [1, -1, 1],  [1, 1, 1],  [-1, 1, 1]
];

const CUBE_FACES = [
  [0, 1, 2, 3], // Front
  [1, 5, 6, 2], // Right
  [5, 4, 7, 6], // Back
  [4, 0, 3, 7], // Left
  [3, 2, 6, 7], // Top
  [4, 5, 1, 0]  // Bottom
];

// A square-based pyramid
const PYRAMID_VERTICES = [
  [0, -1, 0],   // Top apex
  [-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1] // Base
];

const PYRAMID_FACES = [
  [0, 1, 2], // Front face
  [0, 2, 3], // Right face
  [0, 3, 4], // Back face
  [0, 4, 1], // Left face
  [4, 3, 2, 1] // Base
];

export function createVectorEngine(canvas, initialConfig = {}) {
  function render(ctx, time, _delta, config) {
    const {
      vectorType = 'cube',
      vectorStyle = 'wireframe',
      vectorColor = '#ff0055',
      vectorSpeed = 1
    } = config || {};

    const vertices = vectorType === 'pyramid' ? PYRAMID_VERTICES : CUBE_VERTICES;
    const faces = vectorType === 'pyramid' ? PYRAMID_FACES : CUBE_FACES;

    // Rotation angles based on time
    const angleX = time * 0.0009 * vectorSpeed;
    const angleY = time * 0.0011 * vectorSpeed;
    const angleZ = time * 0.0007 * vectorSpeed;

    const sinX = Math.sin(angleX), cosX = Math.cos(angleX);
    const sinY = Math.sin(angleY), cosY = Math.cos(angleY);
    const sinZ = Math.sin(angleZ), cosZ = Math.cos(angleZ);

    const fov = Math.min(canvas.width, canvas.height) * 0.8;
    const cameraZ = 4.0;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // 1. Math & Projection: Rotate all vertices
    const rotatedVertices = vertices.map(([x, y, z]) => {
      // Rotate X
      const x1 = x, y1 = y * cosX - z * sinX, z1 = y * sinX + z * cosX;
      // Rotate Y
      const x2 = x1 * cosY + z1 * sinY, y2 = y1, z2 = -x1 * sinY + z1 * cosY;
      // Rotate Z
      const x3 = x2 * cosZ - y2 * sinZ, y3 = x2 * sinZ + y2 * cosZ, z3 = z2;
      return [x3, y3, z3];
    });

    // 2. Depth Sorting (Painter's Algorithm)
    const renderFaces = faces.map((faceIndices) => {
      const faceVertices = faceIndices.map(idx => rotatedVertices[idx]);
      const zAvg = faceVertices.reduce((sum, v) => sum + v[2], 0) / faceVertices.length;
      return { faceIndices, zAvg };
    }).sort((a, b) => b.zAvg - a.zAvg); // Sort furthest faces first

    // 3. Rendering
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;

    renderFaces.forEach(({ faceIndices }) => {
      ctx.beginPath();
      faceIndices.forEach((idx, i) => {
        const [x, y, z] = rotatedVertices[idx];
        const zDist = z + cameraZ; // Move into the distance
        const projX = (x / zDist) * fov + cx;
        const projY = (y / zDist) * fov + cy;
        
        if (i === 0) ctx.moveTo(projX, projY);
        else ctx.lineTo(projX, projY);
      });
      ctx.closePath();

      if (vectorStyle === 'filled') {
        ctx.fillStyle = vectorColor;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'; // Stroke prevents faces from blending into a single flat shape
        ctx.stroke();
      } else {
        ctx.strokeStyle = vectorColor;
        ctx.stroke();
      }
    });

    ctx.restore();
  }

  function updateConfig(config) {
    // Placeholder for any layout resets when config changes, if needed
  }

  function resize() {
    // Engine re-calculates projection automatically via canvas width/height each frame
  }

  return {
    render,
    updateConfig,
    resize
  };
}