import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";

// Game state management
class GameState {
  constructor() {
    this.board = Array(9).fill(null); // Tic-tac-toe board
    this.currentPlayer = "human"; // "human" or "ai"
    this.gameOver = false;
    this.winner = null;
    this.moveHistory = [];
    this.turnCount = 0;
  }

  makeMove(position, player) {
    if (this.board[position] !== null) {
      throw new Error("Position already occupied");
    }
    if (this.gameOver) {
      throw new Error("Game is already over");
    }
    if (this.currentPlayer !== player) {
      throw new Error(`Not ${player}'s turn`);
    }

    this.board[position] = player === "human" ? "X" : "O";
    this.moveHistory.push({ position, player, turn: this.turnCount });
    this.turnCount++;

    // Check win/draw
    this.updateGameState();

    // Switch player
    this.currentPlayer = this.currentPlayer === "human" ? "ai" : "human";

    return {
      position,
      player,
      gameOver: this.gameOver,
      winner: this.winner,
      board: [...this.board],
    };
  }

  updateGameState() {
    const winner = this.checkWinner();
    if (winner) {
      this.gameOver = true;
      this.winner = winner;
      return;
    }

    if (this.board.every((cell) => cell !== null)) {
      this.gameOver = true;
      this.winner = "draw";
      return;
    }
  }

  checkWinner() {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    for (const [a, b, c] of lines) {
      if (
        this.board[a] &&
        this.board[a] === this.board[b] &&
        this.board[a] === this.board[c]
      ) {
        return this.board[a] === "X" ? "human" : "ai";
      }
    }
    return null;
  }

  getValidMoves() {
    return this.board
      .map((cell, index) => (cell === null ? index : null))
      .filter((index) => index !== null);
  }

  reset() {
    this.board = Array(9).fill(null);
    this.currentPlayer = "human";
    this.gameOver = false;
    this.winner = null;
    this.moveHistory = [];
    this.turnCount = 0;
  }

  getBoardString() {
    let str = "\n";
    for (let i = 0; i < 3; i++) {
      str += " " + (this.board[i * 3] || i * 3) + " | ";
      str += (this.board[i * 3 + 1] || i * 3 + 1) + " | ";
      str += (this.board[i * 3 + 2] || i * 3 + 2) + "\n";
      if (i < 2) str += "-----------\n";
    }
    return str;
  }
}

// AI player using Claude
class AIPlayer {
  constructor() {
    this.client = new Anthropic();
    this.model = "claude-3-5-sonnet-20241022";
  }

  async getMove(gameState) {
    const validMoves = gameState.getValidMoves();
    if (validMoves.length === 0) {
      throw new Error("No valid moves available");
    }

    const boardDescription = this.describeBoardState(gameState);
    const prompt = `You are playing Tic-Tac-Toe as O (the AI). The human is playing as X.

Current board state:
${boardDescription}

Valid positions you can play: ${validMoves.join(", ")}

Previous moves:
${gameState.moveHistory.map((m) => `Turn ${m.turn}: ${m.player} played at position ${m.position}`).join("\n")}

Think strategically:
1. If you can win in one move, take it
2. If the human can win in one move, block it
3. Take the center if available
4. Take corners
5. Take edges

Respond with ONLY a single number (0-8) representing your move position.`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 10,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const moveText = response.content[0].text.trim();
    let move = parseInt(moveText);

    // Validate AI response
    if (isNaN(move) || !validMoves.includes(move)) {
      // If AI gives invalid response, pick random valid move
      move = validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    return move;
  }

  describeBoardState(gameState) {
    let description = "";
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const index = i * 3 + j;
        const cell = gameState.board[index];
        description += cell || index;
        if (j < 2) description += " | ";
      }
      if (i < 2) description += "\n---------\n";
    }
    return description;
  }
}

// Game loop manager
class GameLoop {
  constructor() {
    this.state = new GameState();
    this.ai = new AIPlayer();
    this.gameLog = [];
  }

  logAction(action) {
    this.gameLog.push({
      timestamp: new Date().toISOString(),
      action,
    });
  }

  async playTurn(humanMove) {
    if (this.state.gameOver) {
      throw new Error("Game is already over");
    }

    // Human move
    if (this.state.currentPlayer !== "human") {
      throw new Error("Not human's turn");
    }

    this.logAction(
      `Human makes move at position ${humanMove}, turn ${this.state.turnCount}`
    );
    const moveResult = this.state.makeMove(humanMove, "human");

    if (moveResult.gameOver) {
      this.logAction(
        `Game over: ${moveResult.winner === "human" ? "Human wins" : "Draw"}`
      );
      return {
        humanMove,
        aiMove: null,
        gameOver: true,
        winner: moveResult.winner,
        board: moveResult.board,
      };
    }

    // AI move
    if (this.state.currentPlayer !== "ai") {
      throw new Error("AI turn expected but not AI's turn");
    }

    const aiMove = await this.ai.getMove(this.state);
    this.logAction(
      `AI makes move at position ${aiMove}, turn ${this.state.turnCount}`
    );
    const aiMoveResult = this.state.makeMove(aiMove, "ai");

    if (aiMoveResult.gameOver) {
      this.logAction(
        `Game over: ${aiMoveResult.winner === "ai" ? "AI wins" : "Draw"}`
      );
    }

    return {
      humanMove,
      aiMove,
      gameOver: aiMoveResult.gameOver,
      winner: aiMoveResult.winner,
      board: aiMoveResult.board,
    };
  }

  reset() {
    this.state.reset();
    this.gameLog = [];
    this.logAction("Game reset");
  }

  getGameState() {
    return {
      board: [...this.state.board],
      currentPlayer: this.state.currentPlayer,
      gameOver: this.state.gameOver,
      winner: this.state.winner,
      turnCount: this.state.turnCount,
      validMoves: this.state.getValidMoves(),
    };
  }
}

// Test suite
async function runTests() {
  const results = [];

  // Test 1: Turn alternation
  {
    const game = new GameLoop();
    try {
      const result = await game.playTurn(0);
      if (
        result.humanMove === 0 &&
        result.aiMove !== null &&
        !game.state.board.includes(null) === game.state.gameOver
      ) {
        results.push({ test: "Turn alternation", passed: true });
      } else {
        results.push({ test: "Turn alternation", passed: false, details: result });
      }
    } catch (e) {
      results.push({
        test: "Turn alternation",
        passed: false,
        error: e.message,
      });
    }
  }

  // Test 2: Game state consistency
  {
    const game = new GameLoop();
    try {
      const initialState = game.getGameState();
      await game.playTurn(0);
      const afterState = game.getGameState();

      if (
        initialState.turnCount === 0 &&
        afterState.turnCount === 2 &&
        afterState.currentPlayer === "human" &&
        afterState.board[0] === "X"
      ) {
        results.push({ test: "Game state consistency", passed: true });
      } else {
        results.push({
          test: "Game state consistency",
          passed: false,
          initialState,
          afterState,
        });
      }
    } catch (e) {
      results.push({
        test: "Game state consistency",
        passed: false,
        error: e.message,
      });
    }
  }

  // Test 3: Multiple turn sequence
  {
    const game = new GameLoop();
    try {
      const moves = [0, 2, 3]; // Human moves
      for (const move of moves) {
        if (game.state.gameOver) break;
        await game.playTurn(move);
      }

      if (
        game.state.moveHistory.length >= 4 &&
        game.state.turnCount >= 3 &&
        game.state.board[0] === "X" &&
        game.state.board[2] === "X"
      ) {
        results.push({ test: "Multiple turns sequence", passed: true });
      } else {
        results.push({
          test: "Multiple turns sequence",
          passed: false,
          moveHistory: game.state.moveHistory,
          turnCount: game.state.turnCount,
        });
      }
    } catch (e) {
      results.push({
        test: "Multiple turns sequence",
        passed: false,
        error: e.message,
      });
    }
  }

  // Test 4: Invalid move detection
  {
    const game = new GameLoop();
    try {
      await game.playTurn(0);
      try {
        await game.playTurn(0); // Try to play same position
        results.push({
          test: "Invalid move detection",
          passed: false,
          details: "Should have thrown error for occupied position",
        });
      } catch (e) {
        if (e.message.includes("Position already occupied")) {
          results.push({ test: "Invalid move detection", passed: true });
        } else {
          results.push({
            test: "Invalid move detection",
            passed: false,
            error: e.message,
          });
        }
      }
    } catch (e) {
      results.push({
        test: "Invalid move detection",
        passed: false,
        error: e.message,
      });
    }
  }

  // Test 5: Game reset
  {
    const game = new GameLoop();
    try {
      await game.playTurn(0);
      game.reset();
      const state = game.getGameState();

      if (
        state.board.every((c) => c === null) &&
        state.currentPlayer === "human" &&
        !state.gameOver &&
        state.turnCount === 0
      ) {
        results.push({ test: "Game reset", passed: true });
      } else {
        results.push({
          test: "Game reset",
          passed: false,
          state,
        });
      }
    } catch (e) {
      results.push({
        test: "Game reset",
        passed: false,
        error: e.message,
      });
    }
  }

  // Test 6: Current player tracking
  {
    const game = new GameLoop();
    try {
      const state1 = game.getGameState();
      if (state1.currentPlayer !== "human") {
        throw new Error("Game should start with human turn");
      }

      await game.playTurn(0);
      const state2 = game.getGameState();

      if (state2.currentPlayer === "human" && state2.turnCount === 2) {
        results.push({ test: "Current player tracking", passed: true });
      } else {
        results.push({
          test: "Current player tracking",
          passed: false,
          state: state2,
        });
      }
    } catch (e) {
      results.push({
        test: "Current player tracking",
        passed: false,
        error: e.message,
      });
    }
  }

  // Test 7: No race conditions in sequential moves
  {
    const game = new GameLoop();
    try {
      const result1 = await game.playTurn(0);
      if (!result1.gameOver) {
        const result2 = await game.playTurn(1);
        if (!result2.gameOver) {
          const result3 = await game.playTurn(2);

          if (
            result1.humanMove === 0 &&
            result2.humanMove === 1 &&
            result3.humanMove === 2 &&
            game.state.moveHistory.length >= 5
          ) {
            results.push({
              test: "No race conditions in sequential moves",
              passed: true,
            });
          } else {
            results.push({
              test: "No race conditions in sequential moves",
              passed: false,
              details: "Move sequence broken",
            });
          }
        } else {
          results.push({
            test: "No race conditions in sequential moves",
            passed: true,
          });
        }
      } else {
        results.push({
          test: "No race conditions in sequential moves",
          passed: true,
        });
      }
    } catch (e) {
      results.push({
        test: "No race conditions in sequential moves",
        passed: false,
        error: e.message,
      });
    }
  }

  // Print results
  console.log("\n=== GAME LOOP INTEGRATION TESTS ===\n");
  let passCount = 0;
  for (const result of results) {
    const status = result.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`${status}: ${result.test}`);
    if (!result.passed) {
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
      if (result.details) {
        console.log(`  Details: ${JSON.stringify(result.details).substring(0, 100)}`);
      }
    }
    if (result.passed) passCount++;
  }

  console.log(
    `\n${passCount}/${results.length} tests passed\n`,
    passCount === results.length ? "PASS" : "FAIL"
  );

  return passCount === results.length;
}

// Run tests
runTests().catch(console.error);