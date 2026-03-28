import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Chess board state management
class ChessBoard {
  constructor() {
    this.board = this.initializeBoard();
    this.selectedPiece = null;
    this.animationQueue = [];
  }

  initializeBoard() {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // Set up pieces
    const pieces = {
      'r': 'rook', 'n': 'knight', 'b': 'bishop', 'q': 'queen', 'k': 'king', 'p': 'pawn'
    };

    // Black pieces
    board[0][0] = { type: 'rook', color: 'black', position: [0, 0] };
    board[0][1] = { type: 'knight', color: 'black', position: [0, 1] };
    board[0][2] = { type: 'bishop', color: 'black', position: [0, 2] };
    board[0][3] = { type: 'queen', color: 'black', position: [0, 3] };
    board[0][4] = { type: 'king', color: 'black', position: [0, 4] };
    board[0][5] = { type: 'bishop', color: 'black', position: [0, 5] };
    board[0][6] = { type: 'knight', color: 'black', position: [0, 6] };
    board[0][7] = { type: 'rook', color: 'black', position: [0, 7] };

    for (let i = 0; i < 8; i++) {
      board[1][i] = { type: 'pawn', color: 'black', position: [1, i] };
    }

    // White pieces
    for (let i = 0; i < 8; i++) {
      board[6][i] = { type: 'pawn', color: 'white', position: [6, i] };
    }

    board[7][0] = { type: 'rook', color: 'white', position: [7, 0] };
    board[7][1] = { type: 'knight', color: 'white', position: [7, 1] };
    board[7][2] = { type: 'bishop', color: 'white', position: [7, 2] };
    board[7][3] = { type: 'queen', color: 'white', position: [7, 3] };
    board[7][4] = { type: 'king', color: 'white', position: [7, 4] };
    board[7][5] = { type: 'bishop', color: 'white', position: [7, 5] };
    board[7][6] = { type: 'knight', color: 'white', position: [7, 6] };
    board[7][7] = { type: 'rook', color: 'white', position: [7, 7] };

    return board;
  }

  movePiece(fromRow, fromCol, toRow, toCol) {
    const piece = this.board[fromRow][fromCol];
    if (!piece) return false;

    const targetPiece = this.board[toRow][toCol];
    if (targetPiece && targetPiece.color === piece.color) return false;

    this.board[toRow][toCol] = piece;
    this.board[fromRow][fromCol] = null;
    piece.position = [toRow, toCol];

    this.animationQueue.push({
      piece: piece,
      fromPos: [fromRow, fromCol],
      toPos: [toRow, toCol],
      duration: 500,
      startTime: Date.now()
    });

    return true;
  }

  getBoard() {
    return this.board;
  }

  getPieceAt(row, col) {
    return this.board[row][col];
  }
}

// 3D Rendering engine simulation
class ChessBoardRenderer {
  constructor() {
    this.camera = {
      position: { x: 0, y: 8, z: 10 },
      target: { x: 3.5, y: 0, z: 3.5 },
      rotation: { x: 0.5, y: 0, z: 0 },
      zoom: 1.0,
      fov: 45
    };
    this.board = new ChessBoard();
    this.renderStats = {
      fps: 60,
      frameTime: 16.67,
      triangles: 0,
      drawCalls: 0
    };
    this.pieceModels = this.createPieceModels();
    this.lastFrameTime = Date.now();
    this.frameCount = 0;
    this.fpsTimer = 0;
  }

  createPieceModels() {
    const models = {};
    const pieceTypes = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];
    
    pieceTypes.forEach(type => {
      models[type] = {
        type: type,
        vertices: this.generatePieceVertices(type),
        faces: this.generatePieceFaces(type),
        boundingBox: this.calculateBoundingBox(type),
        loaded: true
      };
    });

    return models;
  }

  generatePieceVertices(type) {
    const baseVertices = [
      { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 },
      { x: 1, y: 1, z: 0 }, { x: 0, y: 1, z: 0 },
      { x: 0.5, y: 0, z: 1 }, { x: 0.5, y: 1, z: 1 }
    ];

    const heightMultipliers = {
      'pawn': 0.6,
      'knight': 1.0,
      'bishop': 1.3,
      'rook': 1.1,
      'queen': 1.5,
      'king': 1.6
    };

    return baseVertices.map((v, i) => ({
      x: v.x - 0.5,
      y: v.y * (heightMultipliers[type] || 1.0),
      z: v.z - 0.5
    }));
  }

  generatePieceFaces(type) {
    return [
      [0, 1, 2], [0, 2, 3],
      [4, 5, 1], [4, 1, 0],
      [1, 5, 2], [5, 3, 2],
      [3, 5, 4], [3, 4, 0]
    ];
  }

  calculateBoundingBox(type) {
    return {
      min: { x: -0.5, y: 0, z: -0.5 },
      max: { x: 0.5, y: 1.6, z: 0.5 }
    };
  }

  rotateCamera(deltaX, deltaY) {
    this.camera.rotation.x += deltaY * 0.01;
    this.camera.rotation.y += deltaX * 0.01;
    
    this.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotation.x));
  }

  zoomCamera(delta) {
    this.camera.zoom += delta * 0.1;
    this.camera.zoom = Math.max(0.5, Math.min(3.0, this.camera.zoom));
  }

  panCamera(deltaX, deltaY) {
    const moveSpeed = 0.05;
    this.camera.target.x += deltaX * moveSpeed;
    this.camera.target.z += deltaY * moveSpeed;
  }

  render() {
    const now = Date.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Update animations
    this.updateAnimations();

    // Calculate rendering stats
    this.updateRenderStats(deltaTime);

    // Generate render data
    const renderData = {
      camera: this.camera,
      board: this.getBoardRenderData(),
      pieces: this.getPiecesRenderData(),
      stats: this.renderStats,
      timestamp: now
    };

    return renderData;
  }

  updateAnimations() {
    const now = Date.now();
    const animations = this.board.animationQueue;

    for (let i = animations.length - 1; i >= 0; i--) {
      const anim = animations[i];
      const elapsed = now - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1.0);

      if (progress >= 1.0) {
        animations.splice(i, 1);
      }
    }
  }

  updateRenderStats(deltaTime) {
    this.frameCount++;
    this.fpsTimer += deltaTime;

    if (this.fpsTimer >= 1000) {
      this.renderStats.fps = this.frameCount;
      this.renderStats.frameTime = 1000 / this.frameCount;
      this.renderStats.triangles = this.calculateTriangleCount();
      this.renderStats.drawCalls = this.calculateDrawCalls();
      this.frameCount = 0;
      this.fpsTimer = 0;
    }
  }

  calculateTriangleCount() {
    let count = 12; // Board faces
    const boardState = this.board.getBoard();
    boardState.forEach(row => {
      row.forEach(piece => {
        if (piece) {
          const model = this.pieceModels[piece.type];
          if (model) {
            count += model.faces.length;
          }
        }
      });
    });
    return count;
  }

  calculateDrawCalls() {
    let calls = 1; // Board
    const boardState = this.board.getBoard();
    boardState.forEach(row => {
      row.forEach(piece => {
        if (piece) calls++;
      });
    });
    return calls;
  }

  getBoardRenderData() {
    return {
      size: 8,
      squareSize: 1.0,
      position: { x: 0, y: 0, z: 0 },
      material: { color: 0xffffff, wireframe: false },
      squares: this.generateSquares()
    };
  }

  generateSquares() {
    const squares = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isLight = (row + col) % 2 === 0;
        squares.push({
          row: row,
          col: col,
          position: { x: col - 3.5, y: 0.01, z: row - 3.5 },
          color: isLight ? 0xe6d5b8 : 0x8b7355,
          size: 1.0
        });
      }
    }
    return squares;
  }

  getPiecesRenderData() {
    const pieces = [];
    const boardState = this.board.getBoard();
    const now = Date.now();

    boardState.forEach((row, rowIdx) => {
      row.forEach((piece, colIdx) => {
        if (!piece) return;

        // Find animation for this piece
        let position = { 
          x: colIdx - 3.5, 
          y: 0.5, 
          z: rowIdx - 3.5 
        };

        const animation = this.board.animationQueue.find(a => a.piece === piece);
        if (animation) {
          const progress = Math.min((now - animation.startTime) / animation.duration, 1.0);
          const easeProgress = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
          
          position.x = animation.fromPos[1] - 3.5 + (animation.toPos[1] - animation.fromPos[1]) * easeProgress;
          position.z = animation.fromPos[0] - 3.5 + (animation.toPos[0] - animation.fromPos[0]) * easeProgress;
          position.y = 0.5 + Math.sin(easeProgress * Math.PI) * 0.3;
        }

        const model = this.pieceModels[piece.type];
        pieces.push({
          id: `${piece.color}-${piece.type}-${rowIdx}-${colIdx}`,
          type: piece.type,
          color: piece.color,
          position: position,
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          model: model,
          isAnimating: !!animation
        });
      });
    });

    return pieces;
  }

  getPieceModel(type) {
    return this.pieceModels[type];
  }
}

// Express routes
const renderer = new ChessBoardRenderer();

app.get('/api/render', (req, res) => {
  const renderData = renderer.render();
  res.json(renderData);
});

app.post('/api/move', (req, res) => {
  const { fromRow, fromCol, toRow, toCol } = req.body;
  const success = renderer.board.movePiece(fromRow, fromCol, toRow, toCol);
  res.json({ success, board: renderer.board.getBoard() });
});

app.post('/api/camera/rotate', (req, res) => {
  const { deltaX, deltaY } = req.body;
  renderer.rotateCamera(deltaX, deltaY);
  res.json({ camera: renderer.camera });
});

app.post('/api/camera/zoom', (req, res) => {
  const { delta } = req.body;
  renderer.zoomCamera(delta);
  res.json({ camera: renderer.camera });
});

app.post('/api/camera/pan', (req, res) => {
  const { deltaX, deltaY } = req.body;
  renderer.panCamera(deltaX, deltaY);
  res.json({ camera: renderer.camera });
});

app.get('/api/board', (req, res) => {
  res.json(renderer.board.getBoard());
});

app.get('/api/camera', (req, res) => {
  res.json(renderer.camera);
});

app.get('/api/stats', (req, res) => {
  res.json(renderer.renderStats);
});

app.get('/api/piece/:type', (req, res) => {
  const model = renderer.getPieceModel(req.params.type);
  if (model) {
    res.json(model);
  } else {
    res.status(404).json({ error: 'Piece model not found' });
  }
});

// Test suite
async function runTests() {
  console.log('Starting 3D Chess Board Visualization Tests...\n');
  
  const tests = [];
  let passed = 0;
  let failed = 0;

  // Test 1: Piece model loading
  try {
    const pieceTypes = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];
    let allLoaded = true;
    for (const type of pieceTypes) {
      const model = renderer.getPieceModel(type);
      if (!model || !model.loaded || !model.vertices || !model.faces) {
        allLoaded = false;
        break;
      }
    }
    tests.push({
      name: 'Piece model loading',
      passed: allLoaded,
      details: allLoaded ? 'All piece models loaded successfully' : 'Failed to load piece models'
    });
    if (allLoaded) passed++; else failed++;
  } catch (e) {
    tests.push({ name: 'Piece model loading', passed: false, details: e.message });
    failed++;
  }

  // Test 2: Camera controls
  try {
    const initialCamera = JSON.stringify(renderer.camera);
    renderer.rotateCamera(100, 50);
    const rotatedCamera = JSON.stringify(renderer.camera);
    const rotateWorks = initialCamera !== rotatedCamera;
    
    renderer.zoomCamera(10);
    const zoomWorks = renderer.camera.zoom > 1.0;
    
    renderer.panCamera(50, 50);
    const panWorks = renderer.camera.target.x !== 3.5 || renderer.camera.target.z !== 3.5;
    
    const allWork = rotateWorks && zoomWorks && panWork;
    tests.push({
      name: 'Camera controls',
      passed: allWork,
      details: `Rotate: ${rotateWorks}, Zoom: ${zoomWorks}, Pan: ${panWorks}`
    });
    if (allWork) passed++; else failed++;
  } catch (e) {
    tests.push({ name: 'Camera controls', passed: false, details: e.message });
    failed++;
  }

  // Test 3: Piece placement accuracy
  try {
    const board = renderer.board.getBoard();
    let correctPlacements = 0;
    
    // Check white pieces
    if (board[7][4] && board[7][4].type === 'king' && board[7][4].color === 'white') correctPlacements++;
    if (board[7][3] && board[7][3].type === 'queen' && board[7][3].color === 'white') correctPlacements++;
    if (board[6][0] && board[6][0].type === 'pawn' && board[6][0].color === 'white') correctPlacements++;
    
    // Check black pieces
    if (board[0][4] && board[0][4].type === 'king' && board[0][4].color === 'black') correctPlacements++;
    if (board[0][3] && board[0][3].type === 'queen' && board[0][3].color === 'black') correctPlacements++;
    if (board[1][0] && board[1][0].type === 'pawn' && board[1][0].color === 'black') correctPlacements++;
    
    tests.push({
      name: 'Piece placement accuracy',
      passed: correctPlacements === 6,
      details: `${correctPlacements}/6 pieces correctly placed`
    });
    if (correctPlacements === 6) passed++; else failed++;
  } catch (e) {
    tests.push({ name: 'Piece placement accuracy', passed: false, details: e.message });
    failed++;
  }

  // Test 4: Piece movement
  try {
    const success = renderer.board.movePiece(6, 4, 5, 4);
    const piece = renderer.board.getPieceAt(5, 4);
    const moveWorks = success && piece && piece.type === 'pawn';
    
    tests.push({
      name: 'Piece movement',
      passed: moveWorks,
      details: moveWorks ? 'Pawn moved successfully' : 'Piece movement failed'
    });
    if (moveWorks) passed++; else failed++;
  } catch (e) {
    tests.push({ name: 'Piece movement', passed: false, details: e.message });
    failed++;
  }

  // Test 5: Animation system
  try {
    const initialQueueLength = renderer.board.animationQueue.length;
    renderer.board.movePiece(5, 4, 5, 5);
    const queueLengthIncreased = renderer.board.animationQueue.length > initialQueueLength;
    
    // Simulate animation update
    renderer.render();
    
    tests.push({
      name: 'Animation system',
      passed: queueLengthIncreased,
      details: queueLengthIncreased ? 'Animation queued successfully' : 'Animation queue failed'
    });
    if (queueLengthIncreased) passed++; else failed++;
  } catch (e) {
    tests.push({ name: 'Animation system', passed: false, details: e.message });
    failed++;
  }

  // Test 6: Rendering performance (FPS)
  try {
    let fpsCheck = true;
    for (let i = 0; i < 60; i++) {
      renderer.render();
    }
    // Check if FPS is tracked
    fpsCheck = renderer.renderStats.fps > 0 && renderer.renderStats.frameTime > 0;
    
    tests.push({
      name: 'Rendering performance (FPS)',
      passed: fpsCheck,
      details: `FPS: ${renderer.renderStats.fps}, Frame Time: ${renderer.renderStats.frameTime.toFixed(2)}ms`
    });
    if (fpsCheck) passed++; else failed++;
  } catch (e) {
    tests.push({ name: 'Rendering performance (FPS)', passed: false, details: e.message });
    failed++;
  }

  // Test 7: Board rotation
  try {
    const renderer2 = new ChessBoardRenderer();
    const initialRotation = JSON.stringify(renderer2.camera.rotation);
    renderer2.rotateCamera(180, 90);
    const rotatedRotation = JSON.stringify(renderer2.camera.rotation);
    const rotationWorks = initialRotation !== rotatedRotation;
    
    tests.push({
      name: 'Board rotation',
      passed: rotationWorks,
      details: rotationWorks ? 'Board rotated successfully' : 'Board rotation failed'
    });
    if (rotationWorks) passed++; else failed++;
  } catch (e) {
    tests.push({ name: 'Board rotation', passed: false, details: e.message });
    failed++;
  }

  // Test 8: Triangle count calculation
  try {
    renderer.render();
    const triangleCount = renderer.renderStats.triangles;
    const isValid = triangleCount > 0;
    
    tests.push({
      name: 'Triangle count calculation',
      passed: isValid,
      details: `Triangles: ${triangleCount}`
    });
    if (isValid) passed++; else failed++;
  } catch (e) {
    tests.push({ name: 'Triangle count calculation', passed: false, details: e.message });
    failed++;
  }

  // Test 9: Draw calls calculation
  try {
    renderer.render();
    const drawCalls = renderer.renderStats.drawCalls;
    const isValid = drawCalls > 0;
    
    tests.push({
      name: 'Draw calls calculation',
      passed: isValid,
      details: `Draw Calls: ${drawCalls}`
    });
    if (isValid) passed++; else failed++;
  } catch (e) {
    tests.push({ name: 'Draw calls calculation', passed: false, details: e.message });
    failed++;
  }

  // Test 10: Board state consistency
  try {
    const board1 = renderer.board.getBoard();
    let isConsistent = true;
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board1[row][col];
        if (piece) {
          if (piece.position[0] !== row || piece.position[1] !== col) {
            isConsistent = false;
            break;
          }
        }
      }
      if (!isConsistent) break;
    }
    
    tests.push({
      name: 'Board state consistency',
      passed: isConsistent,
      details: isConsistent ? 'Board state is consistent' : 'Board state is inconsistent'
    });
    if (isConsistent) passed++; else failed++;
  } catch (e) {
    tests.push({ name: 'Board state consistency', passed: false, details: e.message });
    failed++;
  }

  // Print results
  console.log('='.repeat(70));
  console.log('TEST RESULTS');
  console.log('='.repeat(70));
  
  tests.forEach((test, index) => {
    const status = test.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`\n${index + 1}. ${test.name}`);
    console.log(`   Status: ${status}`);
    console.log(`   Details: ${test.details}`);
  });

  console.log('\n' + '='.repeat(70));
  console.log(`SUMMARY: ${passed} passed, ${failed} failed out of ${tests.length} tests`);
  console.log('='.repeat(70));

  if (failed === 0) {
    console.log('\n✓ ALL TESTS PASSED');
    return 'PASS';
  } else {
    console.log(`\n✗ ${failed} TEST(S) FAILED`);
    return 'FAIL';
  }
}

// Start server and run tests
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log('API endpoints ready for testing\n');
  
  const testResult = await runTests();
  
  server.close(() => {
    console.log('\nServer closed. Test suite completed.');
    process.exit(testResult === 'PASS' ? 0 : 1);
  });
});

export { ChessBoard, ChessBoardRenderer };