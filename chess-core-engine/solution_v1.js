import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Chess Board representation and game logic
class ChessEngine {
  constructor() {
    this.board = this.initializeBoard();
    this.moveHistory = [];
    this.currentPlayer = 'white';
    this.gameState = 'active'; // active, checkmate, stalemate, draw
    this.castlingRights = {
      white: { kingside: true, queenside: true },
      black: { kingside: true, queenside: true }
    };
    this.enPassantTarget = null;
    this.halfmoveClock = 0; // For 50-move rule
    this.fullmoveNumber = 1;
  }

  initializeBoard() {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // Place pawns
    for (let i = 0; i < 8; i++) {
      board[1][i] = { type: 'pawn', color: 'black' };
      board[6][i] = { type: 'pawn', color: 'white' };
    }
    
    // Rooks
    board[0][0] = { type: 'rook', color: 'black' };
    board[0][7] = { type: 'rook', color: 'black' };
    board[7][0] = { type: 'rook', color: 'white' };
    board[7][7] = { type: 'rook', color: 'white' };
    
    // Knights
    board[0][1] = { type: 'knight', color: 'black' };
    board[0][6] = { type: 'knight', color: 'black' };
    board[7][1] = { type: 'knight', color: 'white' };
    board[7][6] = { type: 'knight', color: 'white' };
    
    // Bishops
    board[0][2] = { type: 'bishop', color: 'black' };
    board[0][5] = { type: 'bishop', color: 'black' };
    board[7][2] = { type: 'bishop', color: 'white' };
    board[7][5] = { type: 'bishop', color: 'white' };
    
    // Queens
    board[0][3] = { type: 'queen', color: 'black' };
    board[7][3] = { type: 'queen', color: 'white' };
    
    // Kings
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
    // Check if square is attacked by opponent pieces
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
    
    if (piece.type === 'pawn') {
      return this.canPawnAttack(fromRow, fromCol, toRow, toCol, piece.color);
    }
    if (piece.type === 'knight') {
      return this.canKnightAttack(fromRow, fromCol, toRow, toCol);
    }
    if (piece.type === 'bishop') {
      return this.canBishopAttack(fromRow, fromCol, toRow, toCol);
    }
    if (piece.type === 'rook') {
      return this.canRookAttack(fromRow, fromCol, toRow, toCol);
    }
    if (piece.type === 'queen') {
      return this.canQueenAttack(fromRow, fromCol, toRow, toCol);
    }
    if (piece.type === 'king') {
      return this.canKingAttack(fromRow, fromCol, toRow, toCol);
    }
    return false;
  }

  canPawnAttack(fromRow, fromCol, toRow, toCol, color) {
    const direction = color === 'white' ? -1 : 1;
    if (toRow === fromRow + direction && Math.abs(toCol - fromCol) === 1) {
      return true;
    }
    return false;
  }

  canPawnMove(fromRow, fromCol, toRow, toCol, color) {
    const direction = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;
    
    // Forward move
    if (fromCol === toCol && !this.getPiece(toRow, toCol)) {
      if (toRow === fromRow + direction) return true;
      if (fromRow === startRow && toRow === fromRow + 2 * direction) {
        return !this.getPiece(fromRow + direction, fromCol);
      }
    }
    
    // Capture
    if (Math.abs(toCol - fromCol) === 1 && toRow === fromRow + direction) {
      const target = this.getPiece(toRow, toCol);
      if (target && target.color !== color) return true;
      
      // En passant
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
    
    if (rowDiff !== colDiff) return false;
    if (rowDiff === 0) return false;
    
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
    // Check if it's a king move
    const piece = this.getPiece(fromRow, fromCol);
    if (!piece || piece.type !== 'king') return false;
    
    // King must start at correct position
    const kingStartCol = 4;
    if (fromCol !== kingStartCol || toRow !== fromRow) return false;
    
    const rights = this.castlingRights[color];
    
    // Kingside castling
    if (toCol === 6 && rights.kingside) {
      const rook = this.getPiece(fromRow, 7);
      if (!rook || rook.type !== 'rook') return false;
      if (this.getPiece(fromRow, 5) || this.getPiece(fromRow, 6)) return false;
      if (this.isSquareAttacked(fromRow, 4, color === 'white' ? 'black' : 'white')) return false;
      if (this.isSquareAttacked(fromRow, 5, color === 'white' ? 'black' : 'white')) return false;
      if (this.isSquareAttacked(fromRow, 6, color === 'white' ? 'black' : 'white')) return false;
      return true;
    }
    
    // Queenside castling
    if (toCol === 2 && rights.queenside) {
      const rook = this.getPiece(fromRow, 0);
      if (!rook || rook.type !== 'rook') return false;
      if (this.getPiece(fromRow, 1) || this.getPiece(fromRow, 2) || this.getPiece(fromRow, 3)) return false;
      if (this.isSquareAttacked(fromRow, 4, color === 'white' ? 'black' : 'white')) return false;
      if (this.isSquareAttacked(fromRow, 3, color === 'white' ? 'black' : 'white')) return false;
      if (this.isSquareAttacked(fromRow, 2, color === 'white' ? 'black' : 'white')) return false;
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
    
    // Simulate move to check if it leaves king in check
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
    
    // Restore board
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
    
    // Handle castling
    if (piece.type === 'king' && Math.abs(toCol - fromCol) === 2) {
      moveData.castling = true;
      if (toCol === 6) {
        // Kingside
        const rook = this.getPiece(fromRow, 7);
        this.board[fromRow][5] = rook;
        this.board[fromRow][7] = null;
      } else {
        // Queenside
        const rook = this.getPiece(fromRow, 0);
        this.board[fromRow][3] = rook;
        this.board[fromRow][0] = null;
      }
      this.castlingRights[this.currentPlayer].kingside = false;
      this.castlingRights[this.currentPlayer].queenside = false;
    }
    
    // Handle en passant
    if (piece.type === 'pawn' && Math.abs(toCol - fromCol) === 1 && !target) {
      moveData.enPassant = true;
      const captureRow = fromRow;
      this.board[captureRow][toCol] = null;
      moveData.capture = 'pawn';
    }
    
    // Handle pawn two-square move
    this.enPassantTarget = null;
    if (piece.type === 'pawn' && Math.abs(toRow - fromRow) === 2) {
      this.enPassantTarget = [fromRow + (toRow - fromRow) / 2, fromCol];
    }
    
    // Handle pawn promotion
    if (piece.type === 'pawn' && (toRow === 0 || toRow === 7)) {
      moveData.promotion = true;
      // Default to queen promotion
      this.board[toRow][toCol] = { type: 'queen', color: piece.color };
    } else {
      this.board[toRow][toCol] = piece;
    }
    this.board[fromRow][fromCol] = null;
    
    // Update castling rights
    if (piece.type === 'king') {
      this.castlingRights[this.currentPlayer].kingside = false;
      this.castlingRights[this.currentPlayer].queenside = false;
    }
    if (piece.type === 'rook') {
      if (fromCol === 0) this.castlingRights[this.currentPlayer].queenside = false;
      if (fromCol === 7) this.castlingRights[this.currentPlayer].kingside = false;
    }
    
    // Update move counter
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
    
    // Check game state
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
      if (playerInCheck) {
        this.gameState = 'checkmate';
      } else {
        this.gameState = 'stalemate';
      }
    } else if (this.halfmoveClock >= 100) {
      this.gameState = 'draw';
    } else {
      this.gameState = 'active';
    }
  }

  saveGame(filename) {
    const gameData = {
      board: this.board,
      moveHistory: this.moveHistory,
      currentPlayer: this.currentPlayer,
      gameState: this.gameState,
      castlingRights: this.castlingRights,
      enPassantTarget: this.enPassantTarget,
      halfmoveClock: this.halfmoveClock,
      fullmoveNumber: this.fullmoveNumber
    };
    fs.writeFileSync(filename, JSON.stringify(gameData, null, 2));
    return true;
  }

  loadGame(filename) {
    const gameData = JSON.parse(fs.readFileSync(filename, 'utf8'));
    this.board = gameData.board;
    this.moveHistory = gameData.moveHistory;
    this.currentPlayer = gameData.currentPlayer;
    this.gameState = gameData.gameState;
    this.castlingRights = gameData.castlingRights;
    this.enPassantTarget = gameData.enPassantTarget;
    this.halfmoveClock = gameData.halfmoveClock;
    this.fullmoveNumber = gameData.fullmoveNumber;
    return true;
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

// Self-test
function runTests() {
  const tests = [];
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      tests.push({ name, status: 'PASS' });
      passed++;
    } catch (e) {
      tests.push({ name, status: 'FAIL', error: e.message });
      failed++;
    }
  }

  // Test 1: Basic pawn movement
  test('Pawn initial two-square move', () => {
    const engine = new ChessEngine();
    const result = engine.makeMove(6, 4, 4, 4);
    if (!result.success) throw new Error('Failed to move pawn');
    if (engine.getPiece(4, 4).type !== 'pawn') throw new Error('Pawn not moved');
  });

  // Test 2: Knight movement
  test('Knight L-shaped move', () => {
    const engine = new ChessEngine();
    const result = engine.makeMove(6, 4, 4, 4); // white pawn
    engine.currentPlayer = 'black';
    engine.makeMove(1, 4, 3, 4); // black pawn
    engine.currentPlayer = 'white';
    const result2 = engine.makeMove(7, 6, 5, 5); // white knight
    if (!result2.success) throw new Error('Failed to move knight');
  });

  // Test 3: Pawn capture
  test('Pawn diagonal capture', () => {
    const engine = new ChessEngine();
    engine.board[4][4] = { type: 'pawn', color: 'white' };
    engine.board[3][5] = { type: 'pawn', color: 'black' };
    engine.currentPlayer = 'white';
    const result = engine.makeMove(4, 4, 3, 5);
    if (!result.success) throw new Error('Failed to capture with pawn');
  });

  // Test 4: Pawn promotion
  test('Pawn promotion', () => {
    const engine = new ChessEngine();
    engine.board[1][0] = { type: 'pawn', color: 'white' };
    engine.currentPlayer = 'white';
    const result = engine.makeMove(1, 0, 0, 0);
    if (!result.success) throw new Error('Failed to promote pawn');
    if (engine.getPiece(0, 0).type !== 'queen') throw new Error('Pawn not promoted to queen');
  });

  // Test 5: Invalid move (same color capture)
  test('Prevent same color capture', () => {
    const engine = new ChessEngine();
    engine.currentPlayer = 'white';
    const result = engine.makeMove(6, 4, 5, 4);
    engine.currentPlayer = 'white';
    const result2 = engine.makeMove(5, 4, 4, 4);
    if (result2.success) throw new Error('Should not allow capture of own piece');
  });

  // Test 6: Check detection
  test('Check detection', () => {
    const engine = new ChessEngine();
    engine.board = Array(8).fill(null).map(() => Array(8).fill(null));
    engine.board[0][4] = { type: 'king', color: 'black' };
    engine.board[2][4] = { type: 'rook', color: 'white' };
    engine.board[7][4] = { type: 'king', color: 'white' };
    if (!engine.isInCheck('black')) throw new Error('Check not detected');
  });

  // Test 7: Checkmate detection
  test('Checkmate detection (fool\'s mate)', () => {
    const engine = new ChessEngine();
    engine.makeMove(6, 5, 4, 5); // white pawn f4
    engine.makeMove(1, 4, 3, 4); // black pawn e5
    engine.makeMove(6, 6, 5, 6); // white pawn g3
    engine.makeMove(3, 3, 7, 7); // black queen h4 (checkmate)
    if (engine.gameState !== 'checkmate') throw new Error('Checkmate not detected');
  });

  // Test 8: Stalemate detection
  test('Stalemate detection', () => {
    const engine = new ChessEngine();
    engine.board = Array(8).fill(null).map(() => Array(8).fill(null));
    engine.board[0][0] = { type: 'king', color: 'black' };
    engine.board[2][2] = { type: 'queen', color: 'white' };
    engine.board[7][4] = { type: 'king', color: 'white' };
    engine.currentPlayer = 'black';
    engine.updateGameState();
    if (engine.gameState !== 'stalemate') throw new Error('Stalemate not detected');
  });

  // Test 9: Castling kingside
  test('Kingside castling', () => {
    const engine = new ChessEngine();
    engine.board[7][5] = null;
    engine.board[7][6] = null;
    engine.currentPlayer = 'white';
    const result = engine.makeMove(7, 4, 7, 6);
    if (!result.success) throw new Error('Castling failed');
    if (!result.moveData.castling) throw new Error('Move not marked as castling');
    if (engine.getPiece(7, 5).type !== 'rook') throw new Error('Rook not moved in castling');
  });

  // Test 10: Castling queenside
  test('Queenside castling', () => {
    const engine = new ChessEngine();
    engine.board[7][1] = null;
    engine.board[7][2] = null;
    engine.board[7][3] = null;
    engine.currentPlayer = 'white';
    const result = engine.makeMove(7, 4, 7, 2);
    if (!result.success) throw new Error('Queenside castling failed');
    if (!result.moveData.castling) throw new Error('Move not marked as castling');
  });

  // Test 11: En passant
  test('En passant capture', () => {
    const engine = new ChessEngine();
    engine.board = Array(8).fill(null).map(() => Array(8).fill(null));
    engine.board[4][4] = { type: 'pawn', color: 'white' };
    engine.board[6][5] = { type: 'pawn', color: 'black' };
    engine.board[0][4] = { type: 'king', color: 'black' };
    engine.board[7][4] = { type: 'king', color: 'white' };
    
    engine.currentPlayer = 'black';
    const move1 = engine.makeMove(6, 5, 4, 5);
    
    engine.currentPlayer = 'white';
    const move2 = engine.makeMove(4, 4, 3, 5);
    if (!move2.success) throw new Error('En passant move failed');
    if (!move2.moveData.enPassant) throw new Error('Move not marked as en passant');
    if (engine.getPiece(4, 5) !== null) throw new Error('Captured pawn not removed');
  });

  // Test 12: Bishop diagonal movement
  test('Bishop diagonal movement', () => {
    const engine = new ChessEngine();
    engine.board = Array(8).fill(null).map(() => Array(8).fill(null));
    engine.board[7][2] = { type: 'bishop', color: 'white' };
    engine.board[0][4] = { type: 'king', color: 'black' };
    engine.board[7][4] = { type: 'king', color: 'white' };
    engine.currentPlayer = 'white';
    const result = engine.makeMove(7, 2, 3, 6);
    if (!result.success) throw new Error('Bishop move failed');
  });

  // Test 13: Rook straight movement
  test('Rook straight movement', () => {
    const engine = new ChessEngine();
    engine.board = Array(8).fill(null).map(() => Array(8).fill(null));
    engine.board[7][0] = { type: 'rook', color: 'white' };
    engine.board[0][4] = { type: 'king', color: 'black' };
    engine.board[7][4] = { type: 'king', color: 'white' };
    engine.currentPlayer = 'white';
    const result = engine.makeMove(7, 0, 7, 3);
    if (!result.success) throw new Error('Rook move failed');
  });

  // Test 14: Queen movement
  test('Queen movement (rook-like)', () => {
    const engine = new ChessEngine();
    engine.board = Array(8).fill(null).map(() => Array(8).fill(null));
    engine.board[7][3] = { type: 'queen', color: 'white' };
    engine.board[0][4] = { type: 'king', color: 'black' };
    engine.board[7][4] = { type: 'king', color: 'white' };
    engine.currentPlayer = 'white';
    const result = engine.makeMove(7, 3, 5, 3);
    if (!result.success) throw new Error('Queen move failed');
  });

  // Test 15: Move history tracking
  test('Move history tracking', () => {
    const engine = new ChessEngine();
    engine.makeMove(6, 4, 4, 4);
    engine.makeMove(1, 4, 3, 4);
    if (engine.moveHistory.length !== 2) throw new Error('Move history not tracked');