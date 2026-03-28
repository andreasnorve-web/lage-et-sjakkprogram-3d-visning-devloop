# Integration File

```javascript
// ============================================
// CHESS GAME - COMPLETE INTEGRATION
// ============================================

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================
// 1. CHESS ENGINE CORE
// ============================================

class ChessEngine {
  constructor() {
    this.board = this.initializeBoard();
    this.moveHistory = [];
    this.currentPlayer = 'white';
    this.gameState = 'active';
    this.castlingRights = {
      white: { kingside: true, queenside: true },
      black: { kingside: true, queenside: true }
    };
    this.enPassantTarget = null;
    this.halfmoveClock = 0;
    this.fullmoveNumber = 1;
  }

  initializeBoard() {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    
    for (let i = 0; i < 8; i++) {
      board[1][i] = { type: 'pawn', color: 'black' };
      board[6][i] = { type: 'pawn', color: 'white' };
    }
    
    board[0][0] = { type: 'rook', color: 'black' };
    board[0][7] = { type: 'rook', color: 'black' };
    board[7][0] = { type: 'rook', color: 'white' };
    board[7][7] = { type: 'rook', color: 'white' };
    
    board[0][1] = { type: 'knight', color: 'black' };
    board[0][6] = { type: 'knight', color: 'black' };
    board[7][1] = { type: 'knight', color: 'white' };
    board[7][6] = { type: 'knight', color: 'white' };
    
    board[0][2] = { type: 'bishop', color: 'black' };
    board[0][5] = { type: 'bishop', color: 'black' };
    board[7][2] = { type: 'bishop', color: 'white' };
    board[7][5] = { type: 'bishop', color: 'white' };
    
    board[0][3] = { type: 'queen', color: 'black' };
    board[7][3] = { type: 'queen', color: 'white' };
    
    board[0][4] = { type: 'king', color: 'black' };
    board[7][4] = { type: 'king', color: 'white' };
    
    return board;
  }

  isValidPosition(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  getPiece(row, col) {
    if (!this.isValidPosition(row, col)) return null;
    return this.board[row][col];
  }

  setPiece(row, col, piece) {
    if (this.isValidPosition(row, col)) {
      this.board[row][col] = piece;
    }
  }

  isSquareAttacked(row, col, byColor) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.getPiece(r, c);
        if (piece && piece.color === byColor) {
          if (this.canPieceAttack(r, c, row, col)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  canPieceAttack(fromRow, fromCol, toRow, toCol) {
    const piece = this.getPiece(fromRow, fromCol);
    if (!piece) return false;
    
    const target = this.getPiece(toRow, toCol);
    if (target && target.color === piece.color) return false;
    
    switch (piece.type) {
      case 'pawn':
        return this.canPawnAttack(fromRow, fromCol, toRow, toCol, piece.color);
      case 'knight':
        return this.canKnightAttack(fromRow, fromCol, toRow, toCol);
      case 'bishop':
        return this.canBishopAttack(fromRow, fromCol, toRow, toCol);
      case 'rook':
        return this.canRookAttack(fromRow, fromCol, toRow, toCol);
      case 'queen':
        return this.canQueenAttack(fromRow, fromCol, toRow, toCol);
      case 'king':
        return this.canKingAttack(fromRow, fromCol, toRow, toCol);
      default:
        return false;
    }
  }

  canPawnAttack(fromRow, fromCol, toRow, toCol, color) {
    const direction = color === 'white' ? -1 : 1;
    return toRow === fromRow + direction && Math.abs(toCol - fromCol) === 1;
  }

  canPawnMove(fromRow, fromCol, toRow, toCol, color) {
    const direction = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;
    
    if (fromCol === toCol && !this.getPiece(toRow, toCol)) {
      if (toRow === fromRow + direction) return true;
      if (fromRow === startRow && toRow === fromRow + 2 * direction) {
        return !this.getPiece(fromRow + direction, fromCol);
      }
    }
    
    if (Math.abs(toCol - fromCol) === 1 && toRow === fromRow + direction) {
      const target = this.getPiece(toRow, toCol);
      if (target && target.color !== color) return true;
      
      if (!target && this.enPassantTarget && 
          this.enPassantTarget[0] === toRow && this.enPassantTarget[1] === toCol) {
        return true;
      }
    }
    
    return false;
  }

  canKnightAttack(fromRow, fromCol, toRow, toCol) {
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);
    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
  }

  canBishopAttack(fromRow, fromCol, toRow, toCol) {
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);
    
    if (rowDiff !== colDiff || rowDiff === 0) return false;
    
    const rowDir = toRow > fromRow ? 1 : -1;
    const colDir = toCol > fromCol ? 1 : -1;
    
    let r = fromRow + rowDir;
    let c = fromCol + colDir;
    
    while (r !== toRow) {
      if (this.getPiece(r, c)) return false;
      r += rowDir;
      c += colDir;
    }
    
    return true;
  }

  canRookAttack(fromRow, fromCol, toRow, toCol) {
    if (fromRow !== toRow && fromCol !== toCol) return false;
    if (fromRow === toRow && fromCol === toCol) return false;
    
    if (fromRow === toRow) {
      const start = Math.min(fromCol, toCol) + 1;
      const end = Math.max(fromCol, toCol);
      for (let c = start; c < end; c++) {
        if (this.getPiece(fromRow, c)) return false;
      }
      return true;
    }
    
    const start = Math.min(fromRow, toRow) + 1;
    const end = Math.max(fromRow, toRow);
    for (let r = start; r < end; r++) {
      if (this.getPiece(r, fromCol)) return false;
    }
    return true;
  }

  canQueenAttack(fromRow, fromCol, toRow, toCol) {
    return this.canRookAttack(fromRow, fromCol, toRow, toCol) ||
           this.canBishopAttack(fromRow, fromCol, toRow, toCol);
  }

  canKingAttack(fromRow, fromCol, toRow, toCol) {
    return Math.abs(toRow - fromRow) <= 1 && Math.abs(toCol - fromCol) <= 1 &&
           !(toRow === fromRow && toCol === fromCol);
  }

  canCastle(fromRow, fromCol, toRow, toCol, color) {
    const piece = this.getPiece(fromRow, fromCol);
    if (!piece || piece.type !== 'king') return false;
    
    const kingStartCol = 4;
    if (fromCol !== kingStartCol || toRow !== fromRow) return false;
    
    const rights = this.castlingRights[color];
    
    if (toCol === 6 && rights.kingside) {
      const rook = this.getPiece(fromRow, 7);
      if (!rook || rook.type !== 'rook') return false;
      if (this.getPiece(fromRow, 5) || this.getPiece(fromRow, 6)) return false;
      const opponentColor = color === 'white' ? 'black' : 'white';
      if (this.isSquareAttacked(fromRow, 4, opponentColor)) return false;
      if (this.isSquareAttacked(fromRow, 5, opponentColor)) return false;
      if (this.isSquareAttacked(fromRow, 6, opponentColor)) return false;
      return true;
    }
    
    if (toCol === 2 && rights.queenside) {
      const rook = this.getPiece(fromRow, 0);
      if (!rook || rook.type !== 'rook') return false;
      if (this.getPiece(fromRow, 1) || this.getPiece(fromRow, 2) || this.getPiece(fromRow, 3)) return false;
      const opponentColor = color === 'white' ? 'black' : 'white';
      if (this.isSquareAttacked(fromRow, 4, opponentColor)) return false;
      if (this.isSquareAttacked(fromRow, 3, opponentColor)) return false;
      if (this.isSquareAttacked(fromRow, 2, opponentColor)) return false;
      return true;
    }
    
    return false;
  }

  isValidMove(fromRow, fromCol, toRow, toCol) {
    const piece = this.getPiece(fromRow, fromCol);
    if (!piece || piece.color !== this.currentPlayer) return false;
    if (!this.isValidPosition(toRow, toCol)) return false;
    
    const target = this.getPiece(toRow, toCol);
    if (target && target.color === piece.color) return false;
    
    let isValid = false;
    
    if (piece.type === 'pawn') {
      isValid = this.canPawnMove(fromRow, fromCol, toRow, toCol, piece.color);
    } else if (piece.type === 'knight') {
      isValid = this.canKnightAttack(fromRow, fromCol, toRow, toCol);
    } else if (piece.type === 'bishop') {
      isValid = this.canBishopAttack(fromRow, fromCol, toRow, toCol);
    } else if (piece.type === 'rook') {
      isValid = this.canRookAttack(fromRow, fromCol, toRow, toCol);
    } else if (piece.type === 'queen') {
      isValid = this.canQueenAttack(fromRow, fromCol, toRow, toCol);
    } else if (piece.type === 'king') {
      if (this.canCastle(fromRow, fromCol, toRow, toCol, piece.color)) {
        isValid = true;
      } else {
        isValid = this.canKingAttack(fromRow, fromCol, toRow, toCol);
      }
    }
    
    if (!isValid) return false;
    
    const originalPiece = this.board[toRow][toCol];
    this.board[toRow][toCol] = piece;
    this.board[fromRow][fromCol] = null;
    
    let kingRow = -1, kingCol = -1;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.getPiece(r, c);
        if (p && p.type === 'king' && p.color === piece.color) {
          kingRow = r;
          kingCol = c;
          break;
        }
      }
      if (kingRow !== -1) break;
    }
    
    const opponentColor = piece.color === 'white' ? 'black' : 'white';
    const inCheck = this.isSquareAttacked(kingRow, kingCol, opponentColor);
    
    this.board[fromRow][fromCol] = piece;
    this.board[toRow][toCol] = originalPiece;
    
    return !inCheck;
  }

  makeMove(fromRow, fromCol, toRow, toCol) {
    if (!this.isValidMove(fromRow, fromCol, toRow, toCol)) {
      return { success: false, error: 'Invalid move' };
    }
    
    const piece = this.getPiece(fromRow, fromCol);
    const target = this.getPiece(toRow, toCol);
    const moveData = {
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      piece: piece.type,
      capture: target ? target.type : null,
      castling: false,
      enPassant: false,
      promotion: false
    };
    
    if (piece.type === 'king' && Math.abs(toCol - fromCol) === 2) {
      moveData.castling = true;
      if (toCol === 6) {
        const rook = this.getPiece(fromRow, 7);
        this.board[fromRow][5] = rook;
        this.board[fromRow][7] = null;
      } else {
        const rook = this.getPiece(fromRow, 0);
        this.board[fromRow][3] = rook;
        this.board[fromRow][0] = null;
      }
      this.castlingRights[this.currentPlayer].kingside = false;
      this.castlingRights[this.currentPlayer].queenside = false;
    }
    
    if (piece.type === 'pawn' && Math.abs(toCol - fromCol) === 1 && !target) {
      moveData.enPassant = true;
      const captureRow = fromRow;
      this.board[captureRow][toCol] = null;
      moveData.capture = 'pawn';
    }
    
    this.enPassantTarget = null;
    if (piece.type === 'pawn' && Math.abs(toRow - fromRow) === 2) {
      this.enPassantTarget = [fromRow + (toRow - fromRow) / 2, fromCol];
    }
    
    if (piece.type === 'pawn' && (toRow === 0 || toRow === 7)) {
      moveData.promotion = true;
      this.board[toRow][toCol] = { type: 'queen', color: piece.color };
    } else {
      this.board[toRow][toCol] = piece;
    }
    this.board[fromRow][fromCol] = null;
    
    if (piece.type === 'king') {
      this.castlingRights[this.currentPlayer].kingside = false;
      this.castlingRights[this.currentPlayer].queenside = false;
    }
    if (piece.type === 'rook') {
      if (fromCol === 0) this.castlingRights[this.currentPlayer].queenside = false;
      if (fromCol === 7) this.castlingRights[this.currentPlayer].kingside = false;
    }
    
    if (piece.type === 'pawn' || target) {
      this.halfmoveClock = 0;
    } else {
      this.halfmoveClock++;
    }
    
    this.moveHistory.push(moveData);
    this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
    if (this.currentPlayer === 'white') {
      this.fullmoveNumber++;
    }
    
    this.updateGameState();
    
    return { success: true, moveData };
  }

  isInCheck(color) {
    let kingRow = -1, kingCol = -1;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.getPiece(r, c);
        if (piece && piece.type === 'king' && piece.color === color) {
          kingRow = r;
          kingCol = c;
          break;
        }
      }
      if (kingRow !== -1) break;
    }
    
    const opponentColor = color === 'white' ? 'black' : 'white';
    return this.isSquareAttacked(kingRow, kingCol, opponentColor);
  }

  hasLegalMoves(color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.getPiece(r, c);
        if (piece && piece.color === color) {
          for (let tr = 0; tr < 8; tr++) {
            for (let tc = 0; tc < 8; tc++) {
              if (this.isValidMove(r, c, tr, tc)) {
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  }

  updateGameState() {
    const playerInCheck = this.isInCheck(this.currentPlayer);
    const hasLegals = this.hasLegalMoves(this.currentPlayer);
    
    if (!hasLegals) {
      this.gameState = playerInCheck ? 'checkmate' : 'stalemate';
    } else if (this.halfmoveClock >= 100) {
      this.gameState = 'draw';
    } else {
      this.gameState = 'active';
    }
  }

  getBoardFEN() {
    let fen = '';
    for (let r = 0; r < 8; r++) {
      let empty = 0;
      for (let c = 0; c < 8; c++) {
        const piece = this.getPiece(r, c);
        if (!piece) {
          empty++;
        } else {
          if (empty) {
            fen += empty;
            empty = 0;
          }
          const symbol = piece.type[0];
          fen += piece.color === 'white' ? symbol.toUpperCase() : symbol;
        }
      }
      if (empty) fen += empty;
      if (r < 7) fen += '/';
    }
    return fen;
  }
}

// ============================================
// 2. AI OPPONENT
// ============================================

class ChessAI {
  constructor() {
    this.client = new Anthropic();
    this.difficultyLevels = {
      easy: { depth: 2, evalFactor: 0.7 },
      medium: { depth: 4, evalFactor: 0.9 },
      hard: { depth: 6, evalFactor: 1.0 },
      expert: { depth: 8, evalFactor: 1.1 }
    };

    this.pieceValues = {
      p: 1, n: 3, b: 3, r: 5, q: 9, k: 0
    };

    this.pruneStats = {
      nodeCount: 0,
      pruneCount: 0
    };
  }

  getValidMoves(engine) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = engine.getPiece(r, c);
        if (piece && piece.color === 'black') {
          for (let tr = 0; tr < 8; tr++) {
            for (let tc = 0; tc < 8; tc++) {
              if (engine.isValidMove(r, c, tr, tc)) {
                moves.push({ from: [r, c], to: [tr, tc] });
              }
            }
          }
        }
      }
    }
    return moves;
  }

  evaluatePosition(engine) {
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = engine.getPiece(r, c);
        if (piece) {
          const value = this.pieceValues[piece.type[0]] || 0;
          if (piece.color === 'white') {
            score += value;
          } else {
            score -= value;
          }
        }
      }
    }
    return score;
  }

  findBestMove(engine, difficulty = 'medium') {
    const config = this.difficultyLevels[difficulty] || this.difficultyLevels.medium;
    const moves = this.getValidMoves(engine);
    
    if (moves.length === 0) return null;
    
    let bestMove = moves[0];
    let bestScore = Infinity;
    
    for (const move of moves) {
      const newEngine = new ChessEngine();
      newEngine.board = JSON.parse(JSON.stringify(engine.board));
      newEngine.currentPlayer = engine.currentPlayer;
      newEngine.castlingRights = JSON.parse(JSON.stringify(engine.castlingRights));
      
      newEngine.makeMove(move.from[0], move.from[1], move.to[0], move.to[1]);
      const score = this.evaluatePosition(newEngine);
      
      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    
    return { move: bestMove, score: bestScore };
  }
}

// ============================================
// 3. 3D RENDERING ENGINE
// ============================================

class ChessBoardRenderer {
  constructor() {
    this.camera = {
      position: { x: 0, y: 8, z: 10 },
      target: { x: 3.5, y: 0, z: 3.5 },
      rotation: { x: 0.5, y: 0, z: 0 },
      zoom: 1.0,
      fov: 45
    };
    this.renderStats = {
      fps: 60,
      frameTime: 16.67,
      triangles: 0,
      drawCalls: 0
    };
    this.lastFrameTime = Date.now();
    this.frameCount = 0;
    this.fpsTimer = 0;
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

  render(engine) {
    const now = Date.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.frameCount++;
    this.fpsTimer += deltaTime;

    if (this.fpsTimer >= 1000) {
      this.renderStats.fps = this.frameCount;
      this.renderStats.frameTime = 1000 / this.frameCount;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    return {
      camera: this.camera,
      board: engine.board,
      gameState: {
        currentPlayer: engine.currentPlayer,
        gameState: engine.gameState,
        moveHistory: engine.moveHistory
      },
      stats: this.renderStats,
      timestamp: now
    };
  }
}

// ============================================
// 4. EXPRESS SERVER & API
// ============================================

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let gameEngine = new ChessEngine();
let gameAI = new ChessAI();
let gameRenderer = new ChessBoardRenderer();

// API Routes
app.post('/api/move', (req, res) => {
  const { fromRow, fromCol, toRow, toCol } = req.body;
  const result = gameEngine.makeMove(fromRow, fromCol, toRow, toCol);
  
  if (result.success && gameEngine.currentPlayer === 'black' && gameEngine.gameState === 'active') {
    const aiMove = gameAI.findBestMove(gameEngine, 'medium');
    if (aiMove) {
      gameEngine.makeMove(aiMove.move.from[0], aiMove.move.from[1], 
                         aiMove.move.to[0], aiMove.move.to[1]);
    }
  }
  
  res.json({
    success: result.success,
    error: result.error,
    moveData: result.moveData,
    board: gameEngine.board,
    gameState: gameEngine.gameState,
    currentPlayer: gameEngine.currentPlayer
  });
});

app.get('/api/board', (req, res) => {
  res.json({
    board: gameEngine.board,
    currentPlayer: gameEngine.currentPlayer,
    gameState: gameEngine.gameState
  });
});

app.post('/api/reset', (req, res) => {
  gameEngine = new ChessEngine();
  res.json({ success: true, board: gameEngine.board });
});

app.post('/api/camera/rotate', (req, res) => {
  const { deltaX, deltaY } = req.body;
  gameRenderer.rotateCamera(deltaX, deltaY);
  res.json({ camera: gameRenderer.camera });
});

app.post('/api/camera/zoom', (req, res) => {
  const { delta } = req.body;
  gameRenderer.zoomCamera(delta);
  res.json({ camera: gameRenderer.camera });
});

app.get('/api/render', (req, res) => {
  const renderData = gameRenderer.render(gameEngine);
  res.json(renderData);
});

// ============================================
// 5. START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log('Chess Game Server Started');
  console.log(`${'='.repeat(50)}`);
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('\nAvailable Endpoints:');
  console.log('  POST   /api/move           - Make a move');
  console.log('  GET    /api/board          - Get current board state');
  console.log('  POST   /api/reset          - Reset the game');
  console.log('  POST   /api/camera/rotate  - Rotate camera');
  console.log('  POST   /api/camera/zoom    - Zoom camera');
  console.log('  GET    /api/render         - Get render data');
  console.log(`${'='.repeat(50)}\n`);
});

export { ChessEngine, ChessAI, ChessBoardRenderer, gameEngine, gameAI, gameRenderer };
```