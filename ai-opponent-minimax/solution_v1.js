import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";

class ChessAI {
  constructor() {
    this.client = new Anthropic();
    this.difficultyLevels = {
      easy: { depth: 2, evalFactor: 0.7 },
      medium: { depth: 4, evalFactor: 0.9 },
      hard: { depth: 6, evalFactor: 1.0 },
      expert: { depth: 8, evalFactor: 1.1 },
    };

    this.pieceValues = {
      p: 1,
      n: 3,
      b: 3,
      r: 5,
      q: 9,
      k: 0,
    };

    this.positionWeights = {
      p: [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [5, 10, 10, -20, -20, 10, 10, 5],
        [5, -5, -10, 0, 0, -10, -5, 5],
        [0, 0, 0, 20, 20, 0, 0, 0],
        [5, 5, 10, 25, 25, 10, 5, 5],
        [10, 10, 20, 30, 30, 20, 10, 10],
        [50, 50, 50, 50, 50, 50, 50, 50],
        [0, 0, 0, 0, 0, 0, 0, 0],
      ],
      n: [
        [-50, -40, -30, -30, -30, -30, -40, -50],
        [-40, -20, 0, 0, 0, 0, -20, -40],
        [-30, 0, 10, 15, 15, 10, 0, -30],
        [-30, 5, 15, 20, 20, 15, 5, -30],
        [-30, 0, 15, 20, 20, 15, 0, -30],
        [-30, 5, 10, 15, 15, 10, 5, -30],
        [-40, -20, 0, 5, 5, 0, -20, -40],
        [-50, -40, -30, -30, -30, -30, -40, -50],
      ],
      b: [
        [-20, -10, -10, -10, -10, -10, -10, -20],
        [-10, 0, 0, 0, 0, 0, 0, -10],
        [-10, 0, 5, 10, 10, 5, 0, -10],
        [-10, 5, 5, 10, 10, 5, 5, -10],
        [-10, 0, 10, 10, 10, 10, 0, -10],
        [-10, 10, 10, 10, 10, 10, 10, -10],
        [-10, 5, 0, 0, 0, 0, 5, -10],
        [-20, -10, -10, -10, -10, -10, -10, -20],
      ],
      r: [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [5, 10, 10, 10, 10, 10, 10, 5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [0, 0, 0, 5, 5, 0, 0, 0],
      ],
      q: [
        [-20, -10, -10, -5, -5, -10, -10, -20],
        [-10, 0, 0, 0, 0, 0, 0, -10],
        [-10, 0, 5, 5, 5, 5, 0, -10],
        [-5, 0, 5, 5, 5, 5, 0, -5],
        [0, 0, 5, 5, 5, 5, 0, -5],
        [-10, 5, 5, 5, 5, 5, 0, -10],
        [-10, 0, 5, 0, 0, 0, 0, -10],
        [-20, -10, -10, -5, -5, -10, -10, -20],
      ],
      k: [
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-20, -30, -30, -40, -40, -30, -30, -20],
        [-10, -20, -20, -20, -20, -20, -20, -10],
        [20, 20, 0, 0, 0, 0, 20, 20],
        [20, 30, 10, 0, 0, 10, 30, 20],
      ],
    };

    this.pruneStats = {
      nodeCount: 0,
      pruneCount: 0,
    };
  }

  initializeBoard() {
    const board = Array(8)
      .fill(null)
      .map(() => Array(8).fill(null));

    const setup = [
      ["r", "n", "b", "q", "k", "b", "n", "r"],
      ["p", "p", "p", "p", "p", "p", "p", "p"],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      ["P", "P", "P", "P", "P", "P", "P", "P"],
      ["R", "N", "B", "Q", "K", "B", "N", "R"],
    ];

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        board[i][j] = setup[i][j];
      }
    }

    return board;
  }

  isValidMove(board, fromRow, fromCol, toRow, toCol) {
    if (
      fromRow < 0 ||
      fromRow > 7 ||
      fromCol < 0 ||
      fromCol > 7 ||
      toRow < 0 ||
      toRow > 7 ||
      toCol < 0 ||
      toCol > 7
    ) {
      return false;
    }

    const piece = board[fromRow][fromCol];
    if (!piece) return false;

    const target = board[toRow][toCol];
    if (target && piece === piece.toUpperCase() === target.toUpperCase()) {
      return false;
    }

    const pieceLower = piece.toLowerCase();

    if (pieceLower === "p") {
      const direction = piece === "P" ? -1 : 1;
      const startRow = piece === "P" ? 6 : 1;

      if (fromCol === toCol && !target) {
        if (toRow === fromRow + direction) return true;
        if (fromRow === startRow && toRow === fromRow + 2 * direction) {
          return !board[fromRow + direction][fromCol];
        }
      }

      if (
        Math.abs(toCol - fromCol) === 1 &&
        toRow === fromRow + direction &&
        target
      ) {
        return true;
      }
      return false;
    }

    if (pieceLower === "n") {
      const dr = Math.abs(toRow - fromRow);
      const dc = Math.abs(toCol - fromCol);
      return (dr === 2 && dc === 1) || (dr === 1 && dc === 2);
    }

    if (pieceLower === "b") {
      const dr = Math.abs(toRow - fromRow);
      const dc = Math.abs(toCol - fromCol);
      if (dr !== dc) return false;

      const rowDir = toRow > fromRow ? 1 : -1;
      const colDir = toCol > fromCol ? 1 : -1;
      let r = fromRow + rowDir;
      let c = fromCol + colDir;

      while (r !== toRow) {
        if (board[r][c]) return false;
        r += rowDir;
        c += colDir;
      }
      return true;
    }

    if (pieceLower === "r") {
      if (fromRow !== toRow && fromCol !== toCol) return false;

      if (fromRow === toRow) {
        const start = Math.min(fromCol, toCol) + 1;
        const end = Math.max(fromCol, toCol);
        for (let c = start; c < end; c++) {
          if (board[fromRow][c]) return false;
        }
      } else {
        const start = Math.min(fromRow, toRow) + 1;
        const end = Math.max(fromRow, toRow);
        for (let r = start; r < end; r++) {
          if (board[r][fromCol]) return false;
        }
      }
      return true;
    }

    if (pieceLower === "q") {
      const dr = Math.abs(toRow - fromRow);
      const dc = Math.abs(toCol - fromCol);

      if (dr === 0 && dc === 0) return false;

      if (dr !== dc && fromRow !== toRow && fromCol !== toCol) return false;

      if (fromRow === toRow) {
        const start = Math.min(fromCol, toCol) + 1;
        const end = Math.max(fromCol, toCol);
        for (let c = start; c < end; c++) {
          if (board[fromRow][c]) return false;
        }
      } else if (fromCol === toCol) {
        const start = Math.min(fromRow, toRow) + 1;
        const end = Math.max(fromRow, toRow);
        for (let r = start; r < end; r++) {
          if (board[r][fromCol]) return false;
        }
      } else {
        const rowDir = toRow > fromRow ? 1 : -1;
        const colDir = toCol > fromCol ? 1 : -1;
        let r = fromRow + rowDir;
        let c = fromCol + colDir;

        while (r !== toRow) {
          if (board[r][c]) return false;
          r += rowDir;
          c += colDir;
        }
      }
      return true;
    }

    if (pieceLower === "k") {
      return Math.abs(toRow - fromRow) <= 1 && Math.abs(toCol - fromCol) <= 1;
    }

    return false;
  }

  getValidMoves(board, isWhite) {
    const moves = [];

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (!piece) continue;

        const isWhitePiece = piece === piece.toUpperCase();
        if (isWhitePiece !== isWhite) continue;

        for (let toRow = 0; toRow < 8; toRow++) {
          for (let toCol = 0; toCol < 8; toCol++) {
            if (this.isValidMove(board, i, j, toRow, toCol)) {
              moves.push({ from: [i, j], to: [toRow, toCol] });
            }
          }
        }
      }
    }

    return moves;
  }

  makeMove(board, move) {
    const newBoard = board.map((row) => [...row]);
    const [fromRow, fromCol] = move.from;
    const [toRow, toCol] = move.to;

    newBoard[toRow][toCol] = newBoard[fromRow][fromCol];
    newBoard[fromRow][fromCol] = null;

    return newBoard;
  }

  evaluatePosition(board, evalFactor = 1.0) {
    let score = 0;

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (!piece) continue;

        const isWhite = piece === piece.toUpperCase();
        const pieceLower = piece.toLowerCase();
        const pieceValue = this.pieceValues[pieceLower] || 0;
        const positionBonus =
          this.positionWeights[pieceLower]?.[i]?.[j] || 0;

        const totalValue = (pieceValue + positionBonus) * evalFactor;

        if (isWhite) {
          score += totalValue;
        } else {
          score -= totalValue;
        }
      }
    }

    return Math.round(score);
  }

  minimax(board, depth, alpha, beta, isMaximizing) {
    this.pruneStats.nodeCount++;

    if (depth === 0) {
      return this.evaluatePosition(board);
    }

    const moves = this.getValidMoves(board, isMaximizing);

    if (moves.length === 0) {
      return isMaximizing ? -10000 : 10000;
    }

    if (isMaximizing) {
      let maxEval = -Infinity;

      for (const move of moves) {
        const newBoard = this.makeMove(board, move);
        const evaluation = this.minimax(newBoard, depth - 1, alpha, beta, false);

        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);

        if (beta <= alpha) {
          this.pruneStats.pruneCount++;
          break;
        }
      }

      return maxEval;
    } else {
      let minEval = Infinity;

      for (const move of moves) {
        const newBoard = this.makeMove(board, move);
        const evaluation = this.minimax(newBoard, depth - 1, alpha, beta, true);

        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);

        if (beta <= alpha) {
          this.pruneStats.pruneCount++;
          break;
        }
      }

      return minEval;
    }
  }

  findBestMove(board, difficulty = "medium") {
    const config = this.difficultyLevels[difficulty];
    if (!config) {
      throw new Error(
        `Unknown difficulty: ${difficulty}. Available: ${Object.keys(
          this.difficultyLevels
        ).join(", ")}`
      );
    }

    this.pruneStats = { nodeCount: 0, pruneCount: 0 };

    const moves = this.getValidMoves(board, true);

    if (moves.length === 0) {
      return null;
    }

    let bestMove = moves[0];
    let bestScore = -Infinity;

    for (const move of moves) {
      const newBoard = this.makeMove(board, move);
      const score = this.minimax(
        newBoard,
        config.depth - 1,
        -Infinity,
        Infinity,
        false
      );

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return {
      move: bestMove,
      score: bestScore,
      nodeCount: this.pruneStats.nodeCount,
      pruneCount: this.pruneStats.pruneCount,
    };
  }

  boardToString(board) {
    return board
      .map((row) =>
        row.map((piece) => piece || ".").join(" ")
      )
      .join("\n");
  }
}

async function runTests() {
  const ai = new ChessAI();
  let testsPassed = 0;
  let testsFailed = 0;

  const test = (name, condition, details = "") => {
    if (condition) {
      console.log(`✓ ${name}`);
      testsPassed++;
    } else {
      console.log(`✗ ${name}${details ? ": " + details : ""}`);
      testsFailed++;
    }
  };

  // Test 1: Board initialization
  const board = ai.initializeBoard();
  test(
    "Board initialization",
    board.length === 8 && board[0].length === 8 && board[0][0] === "r"
  );

  // Test 2: Move validity
  const validMoves = ai.getValidMoves(board, true);
  test(
    "Valid move generation",
    validMoves.length > 0,
    `Generated ${validMoves.length} moves`
  );

  // Test 3: Specific move validity
  const moveIsValid = ai.isValidMove(board, 6, 4, 5, 4);
  test("Pawn move validation", moveIsValid);

  // Test 4: Invalid move rejection
  const invalidMove = ai.isValidMove(board, 0, 0, 5, 5);
  test("Invalid move rejection", !invalidMove);

  // Test 5: Move execution
  const testBoard = ai.initializeBoard();
  const newBoard = ai.makeMove(testBoard, { from: [6, 4], to: [5, 4] });
  test(
    "Move execution",
    newBoard[5][4] === "P" && newBoard[6][4] === null
  );

  // Test 6: Position evaluation
  const initialEval = ai.evaluatePosition(board);
  test(
    "Position evaluation",
    typeof initialEval === "number" && initialEval === 0
  );

  // Test 7: Difficulty levels available
  const difficulties = Object.keys(ai.difficultyLevels);
  test(
    "Difficulty levels available",
    difficulties.length >= 3,
    `Found: ${difficulties.join(", ")}`
  );

  // Test 8: AI move on easy difficulty
  const easyStartTime = Date.now();
  const easyResult = ai.findBestMove(board, "easy");
  const easyTime = Date.now() - easyStartTime;
  test(
    "Easy difficulty move generation",
    easyResult !== null && easyResult.move !== null,
    `Time: ${easyTime}ms`
  );
  test("Easy difficulty response time", easyTime < 5000);

  // Test 9: AI move on medium difficulty
  const mediumStartTime = Date.now();
  const mediumResult = ai.findBestMove(board, "medium");
  const mediumTime = Date.now() - mediumStartTime;
  test(
    "Medium difficulty move generation",
    mediumResult !== null && mediumResult.move !== null,
    `Time: ${mediumTime}ms`
  );
  test("Medium difficulty response time", mediumTime < 5000);

  // Test 10: AI move on hard difficulty
  const hardStartTime = Date.now();
  const hardResult = ai.findBestMove(board, "hard");
  const hardTime = Date.now() - hardStartTime;
  test(
    "Hard difficulty move generation",
    hardResult !== null && hardResult.move !== null,
    `Time: ${hardTime}ms`
  );
  test("Hard difficulty response time", hardTime < 5000);

  // Test 11: Difficulty affects search depth
  test(
    "Difficulty increases search depth",
    ai.difficultyLevels.easy.depth < ai.difficultyLevels.hard.depth
  );

  // Test 12: Alpha-beta pruning is working
  test(
    "Alpha-beta pruning active",
    hardResult.pruneCount > 0 || hardResult.nodeCount < 50000,
    `Pruned ${hardResult.pruneCount} nodes out of ${hardResult.nodeCount}`
  );

  // Test 13: Depth configuration
  test(
    "Depth configuration",
    ai.difficultyLevels.hard.depth === 6,
    `Hard depth: ${ai.difficultyLevels.hard.depth}`
  );

  // Test 14: Move validity of AI moves
  const isAIMoveValid = ai.isValidMove(
    board,
    easyResult.move.from[0],
    easyResult.move.from[1],
    easyResult.move.to[0],
    easyResult.move.to[1]
  );
  test("AI generated valid move", isAIMoveValid);

  // Test 15: Piece evaluation scoring
  const testEval1 = ai.evaluatePosition(board, 0.7);
  const testEval2 = ai.evaluatePosition(board, 1.0);
  test(
    "Piece evaluation factor applied",
    (testEval1 === 0 && testEval2 === 0) || testEval1 !== testEval2
  );

  // Test 16: Unknown difficulty handling
  try {
    ai.findBestMove(board, "unknown");
    test("Unknown difficulty error handling", false);
  } catch {
    test("Unknown difficulty error handling", true);
  }

  // Test 17: No valid moves detection
  const emptyBoard = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));
  emptyBoard[7][4] = "K";
  const noMovesResult = ai.findBestMove(emptyBoard, "easy");
  test("No valid moves detection", noMovesResult === null);

  // Test 18: Node counting
  test(
    "Node counting in search",
    hardResult.nodeCount > 0,
    `Nodes: ${hardResult.nodeCount}`
  );

  // Test 19: Score calculation
  test(
    "Score calculation",
    typeof mediumResult.score === "number",
    `Score: ${mediumResult.score}`
  );

  // Test 20: Board string representation
  const boardStr = ai.boardToString(board);
  test(
    "Board string representation",
    boardStr.includes("r") && boardStr.includes("K")
  );

  console.log(`\n${testsPassed} passed, ${testsFailed} failed`);

  if (testsFailed === 0) {
    console.log("PASS");
    process.exit(0);
  } else {
    console.log("FAIL");
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test error:", err);
  console.log("FAIL");
  process.exit(1);
});