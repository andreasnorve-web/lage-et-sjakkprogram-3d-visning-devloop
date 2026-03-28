import Anthropic from "@anthropic-ai/sdk";
import { performance } from "perf_hooks";
import { v4 as uuidv4 } from "uuid";
import os from "os";

// Performance monitoring system
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      frameTimings: [],
      aiResponseTimes: [],
      memorySnapshots: [],
      cpuUsage: [],
    };
    this.startTime = Date.now();
    this.lastMemory = this.getMemoryUsage();
    this.sessionFrameCount = 0;
    this.sessionAICallCount = 0;
    this.maxFrameTime = 0;
    this.maxAITime = 0;
  }

  recordFrameTiming(duration) {
    this.metrics.frameTimings.push(duration);
    this.sessionFrameCount++;
    if (duration > this.maxFrameTime) {
      this.maxFrameTime = duration;
    }
    // Keep only last 600 frames (10 seconds at 60 FPS)
    if (this.metrics.frameTimings.length > 600) {
      this.metrics.frameTimings.shift();
    }
  }

  recordAIResponse(duration) {
    this.metrics.aiResponseTimes.push(duration);
    this.sessionAICallCount++;
    if (duration > this.maxAITime) {
      this.maxAITime = duration;
    }
  }

  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      timestamp: Date.now(),
      heapUsed: usage.heapUsed / 1024 / 1024,
      heapTotal: usage.heapTotal / 1024 / 1024,
      external: usage.external / 1024 / 1024,
      rss: usage.rss / 1024 / 1024,
    };
  }

  recordMemorySnapshot() {
    const memory = this.getMemoryUsage();
    this.metrics.memorySnapshots.push(memory);
    // Keep only last 100 snapshots
    if (this.metrics.memorySnapshots.length > 100) {
      this.metrics.memorySnapshots.shift();
    }
    return memory;
  }

  getAverageFPS() {
    if (this.metrics.frameTimings.length === 0) return 0;
    const avgFrameTime =
      this.metrics.frameTimings.reduce((a, b) => a + b, 0) /
      this.metrics.frameTimings.length;
    return avgFrameTime > 0 ? Math.round(1000 / avgFrameTime) : 0;
  }

  getAverageAIResponseTime() {
    if (this.metrics.aiResponseTimes.length === 0) return 0;
    return (
      this.metrics.aiResponseTimes.reduce((a, b) => a + b, 0) /
      this.metrics.aiResponseTimes.length
    );
  }

  getMemoryLeakIndicator() {
    if (this.metrics.memorySnapshots.length < 2) return null;
    const snapshots = this.metrics.memorySnapshots;
    const first = snapshots[0].heapUsed;
    const last = snapshots[snapshots.length - 1].heapUsed;
    const increase = last - first;
    const percentIncrease = (increase / first) * 100;
    return { increase, percentIncrease };
  }

  getReport() {
    const memory = this.recordMemorySnapshot();
    const avgFPS = this.getAverageFPS();
    const avgAITime = this.getAverageAIResponseTime();
    const memoryLeak = this.getMemoryLeakIndicator();

    return {
      sessionDuration: Date.now() - this.startTime,
      fps: {
        current: avgFPS,
        target: 60,
        consistent: avgFPS >= 50,
        maxFrameTime: this.maxFrameTime,
      },
      ai: {
        averageResponseTime: avgAITime,
        maxResponseTime: this.maxAITime,
        withinTarget: avgAITime < 5000,
        totalCalls: this.sessionAICallCount,
      },
      memory: {
        current: memory,
        stable:
          memoryLeak === null
            ? true
            : Math.abs(memoryLeak.percentIncrease) < 10,
        memoryLeakIndicator: memoryLeak,
        totalSnapshots: this.metrics.memorySnapshots.length,
      },
      frames: {
        total: this.sessionFrameCount,
      },
    };
  }
}

// Game engine with performance optimization
class OptimizedGameEngine {
  constructor() {
    this.monitor = new PerformanceMonitor();
    this.gameState = this.initializeGameState();
    this.client = new Anthropic();
    this.targetFrameTime = 1000 / 60; // 16.67ms for 60 FPS
    this.aiCache = new Map();
    this.pendingAICall = null;
    this.difficultyLevels = {
      easy: 2000,
      medium: 4000,
      hard: 3500,
    };
  }

  initializeGameState() {
    return {
      moves: [],
      score: 0,
      boardState: Array(9).fill(null),
      currentDifficulty: "medium",
      turnCount: 0,
      sessionId: uuidv4(),
    };
  }

  recordGameMove(position, player) {
    this.gameState.moves.push({
      position,
      player,
      timestamp: Date.now(),
    });
    this.gameState.boardState[position] = player;
    this.gameState.turnCount++;
  }

  async getAIMove(difficulty = "medium") {
    const frameStart = performance.now();

    const boardStr = this.gameState.boardState
      .map((cell, idx) => `${idx}:${cell || "empty"}`)
      .join(", ");

    const cacheKey = `${boardStr}_${difficulty}`;
    if (this.aiCache.has(cacheKey)) {
      const cachedResponse = this.aiCache.get(cacheKey);
      const frameDuration = performance.now() - frameStart;
      this.monitor.recordAIResponse(frameDuration);
      return cachedResponse;
    }

    const aiStart = performance.now();
    const timeout = this.difficultyLevels[difficulty] || 4000;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await this.client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: `Game board state: ${boardStr}. Your move count: ${this.gameState.turnCount}. Suggest the best position (0-8) for X player as a single number only. Difficulty: ${difficulty}`,
          },
        ],
      });

      clearTimeout(timeoutId);

      const moveStr = response.content[0].text.trim();
      const move = parseInt(moveStr);

      if (isNaN(move) || move < 0 || move > 8) {
        return Math.floor(Math.random() * 9);
      }

      const aiDuration = performance.now() - aiStart;
      this.monitor.recordAIResponse(aiDuration);

      // Cache the response
      this.aiCache.set(cacheKey, move);
      if (this.aiCache.size > 1000) {
        const firstKey = this.aiCache.keys().next().value;
        this.aiCache.delete(firstKey);
      }

      return move;
    } catch (error) {
      const aiDuration = performance.now() - aiStart;
      this.monitor.recordAIResponse(aiDuration);
      // Fallback to random move on error or timeout
      return Math.floor(Math.random() * 9);
    }
  }

  async simulateGameFrame(deltaTime) {
    const frameStart = performance.now();

    // Simulate frame processing
    await new Promise((resolve) => setImmediate(resolve));

    const frameDuration = performance.now() - frameStart;
    this.monitor.recordFrameTiming(frameDuration);

    // Record memory every 60 frames
    if (this.gameState.turnCount % 60 === 0) {
      this.monitor.recordMemorySnapshot();
    }

    return frameDuration;
  }

  async playFullGame(numMoves = 30, difficulty = "medium") {
    for (let i = 0; i < numMoves; i++) {
      // Simulate player move
      let position;
      do {
        position = Math.floor(Math.random() * 9);
      } while (this.gameState.boardState[position] !== null);

      this.recordGameMove(position, "O");
      await this.simulateGameFrame(0);

      // Get AI move
      const aiMove = await this.getAIMove(difficulty);
      if (this.gameState.boardState[aiMove] === null) {
        this.recordGameMove(aiMove, "X");
      }
      await this.simulateGameFrame(0);
    }
  }
}

// Platform compatibility tester
class PlatformCompatibilityTester {
  constructor() {
    this.results = {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cpuCount: os.cpus().length,
      totalMemory: os.totalmem() / 1024 / 1024,
      freeMemory: os.freemem() / 1024 / 1024,
    };
  }

  testMinimumSpec() {
    const minCPUs = 2;
    const minMemory = 256; // MB

    return {
      meetsMinimumCPU: this.results.cpuCount >= minCPUs,
      meetsMinimumMemory: this.results.freeMemory >= minMemory,
      cpuCount: this.results.cpuCount,
      freeMemory: this.results.freeMemory,
    };
  }

  getReport() {
    return {
      systemInfo: this.results,
      minimumSpecCheck: this.testMinimumSpec(),
    };
  }
}

// Test suite
async function runTests() {
  console.log("=== Game Performance Testing Suite ===\n");

  let testsPassed = 0;
  let testsFailed = 0;
  const testResults = [];

  // Test 1: FPS Consistency Test
  console.log("Test 1: FPS Consistency Test...");
  try {
    const engine = new OptimizedGameEngine();
    const frameCount = 100;

    for (let i = 0; i < frameCount; i++) {
      await engine.simulateGameFrame(16.67);
    }

    const report = engine.monitor.getReport();
    const fpsTest = report.fps.current >= 50 && report.fps.consistent;

    testResults.push({
      test: "FPS Consistency",
      passed: fpsTest,
      details: {
        averageFPS: report.fps.current,
        maxFrameTime: report.fps.maxFrameTime,
        requirement: "60 FPS target",
      },
    });

    if (fpsTest) {
      console.log(`✓ FPS Test: ${report.fps.current} FPS (target: 60)`);
      testsPassed++;
    } else {
      console.log(`✗ FPS Test Failed: ${report.fps.current} FPS`);
      testsFailed++;
    }
  } catch (error) {
    console.log(`✗ FPS Test Error: ${error.message}`);
    testResults.push({
      test: "FPS Consistency",
      passed: false,
      error: error.message,
    });
    testsFailed++;
  }

  // Test 2: AI Response Time Test
  console.log("\nTest 2: AI Response Time Test (all difficulties)...");
  try {
    const difficulties = ["easy", "medium", "hard"];
    let allWithinTarget = true;

    for (const difficulty of difficulties) {
      const engine = new OptimizedGameEngine();
      engine.gameState.currentDifficulty = difficulty;

      const startTime = performance.now();
      await engine.getAIMove(difficulty);
      const duration = performance.now() - startTime;

      const withinTarget = duration < 5000;
      allWithinTarget = allWithinTarget && withinTarget;

      console.log(`  ${difficulty}: ${duration.toFixed(0)}ms ${withinTarget ? "✓" : "✗"}`);
    }

    testResults.push({
      test: "AI Response Time",
      passed: allWithinTarget,
      details: {
        requirement: "<5000ms for all difficulties",
      },
    });

    if (allWithinTarget) {
      testsPassed++;
    } else {
      testsFailed++;
    }
  } catch (error) {
    console.log(`✗ AI Response Test Error: ${error.message}`);
    testResults.push({
      test: "AI Response Time",
      passed: false,
      error: error.message,
    });
    testsFailed++;
  }

  // Test 3: Memory Stability Test
  console.log("\nTest 3: Memory Stability Test...");
  try {
    const engine = new OptimizedGameEngine();

    // Simulate a longer session with regular memory checks
    for (let i = 0; i < 50; i++) {
      await engine.simulateGameFrame(16.67);
    }

    const report = engine.monitor.getReport();
    const memoryStable = report.memory.stable;

    testResults.push({
      test: "Memory Stability",
      passed: memoryStable,
      details: {
        current: `${report.memory.current.heapUsed.toFixed(2)}MB`,
        stable: memoryStable,
      },
    });

    if (memoryStable) {
      console.log(
        `✓ Memory Stable: ${report.memory.current.heapUsed.toFixed(2)}MB`
      );
      testsPassed++;
    } else {
      console.log(`✗ Memory Unstable`);
      testsFailed++;
    }
  } catch (error) {
    console.log(`✗ Memory Test Error: ${error.message}`);
    testResults.push({
      test: "Memory Stability",
      passed: false,
      error: error.message,
    });
    testsFailed++;
  }

  // Test 4: Load Test (Many Moves)
  console.log("\nTest 4: Load Test (50 game moves)...");
  try {
    const engine = new OptimizedGameEngine();
    const startTime = performance.now();

    await engine.playFullGame(50, "easy");

    const duration = performance.now() - startTime;
    const report = engine.monitor.getReport();

    const loadTestPassed =
      report.fps.current >= 50 && report.ai.withinTarget && report.memory.stable;

    testResults.push({
      test: "Load Test",
      passed: loadTestPassed,
      details: {
        duration: `${duration.toFixed(0)}ms`,
        fps: report.fps.current,
        avgAITime: `${report.ai.averageResponseTime.toFixed(0)}ms`,
        moves: report.frames.total,
      },
    });

    if (loadTestPassed) {
      console.log(
        `✓ Load Test Passed: ${report.frames.total} moves in ${duration.toFixed(0)}ms`
      );
      testsPassed++;
    } else {
      console.log(`✗ Load Test Failed`);
      testsFailed++;
    }
  } catch (error) {
    console.log(`✗ Load Test Error: ${error.message}`);
    testResults.push({
      test: "Load Test",
      passed: false,
      error: error.message,
    });
    testsFailed++;
  }

  // Test 5: Platform Compatibility
  console.log("\nTest 5: Platform Compatibility Test...");
  try {
    const tester = new PlatformCompatibilityTester();
    const compatReport = tester.getReport();
    const minimumSpecCheck = compatReport.minimumSpecCheck;

    const compatTestPassed =
      minimumSpecCheck.meetsMinimumCPU && minimumSpecCheck.meetsMinimumMemory;

    testResults.push({
      test: "Platform Compatibility",
      passed: compatTestPassed,
      details: {
        platform: compatReport.systemInfo.platform,
        arch: compatReport.systemInfo.arch,
        cpuCount: minimumSpecCheck.cpuCount,
        freeMemory: `${minimumSpecCheck.freeMemory.toFixed(0)}MB`,
        meetsMinimumSpecs: compatTestPassed,
      },
    });

    if (compatTestPassed) {
      console.log(`✓ Platform Compatible: ${compatReport.systemInfo.platform}`);
      testsPassed++;
    } else {
      console.log(`✗ Platform Below Minimum Specs`);
      testsFailed++;
    }
  } catch (error) {
    console.log(`✗ Platform Test Error: ${error.message}`);
    testResults.push({
      test: "Platform Compatibility",
      passed: false,
      error: error.message,
    });
    testsFailed++;
  }

  // Test 6: Long Session Stability
  console.log("\nTest 6: Long Session Stability Test...");
  try {
    const engine = new OptimizedGameEngine();

    // Simulate 200 frames (about 3.3 seconds at 60 FPS)
    for (let i = 0; i < 200; i++) {
      await engine.simulateGameFrame(16.67);
      if (i % 40 === 0) {
        await engine.getAIMove("medium");
      }
    }

    const report = engine.monitor.getReport();
    const stabilityPassed =
      report.fps.current >= 50 &&
      report.memory.stable &&
      report.ai.withinTarget &&
      report.sessionDuration > 1000;

    testResults.push({
      test: "Long Session Stability",
      passed: stabilityPassed,
      details: {
        duration: `${report.sessionDuration}ms`,
        fps: report.fps.current,
        aiCalls: report.ai.totalCalls,
        memoryStable: report.memory.stable,
      },
    });

    if (stabilityPassed) {
      console.log(
        `✓ Session Stable: ${report.sessionDuration}ms, FPS: ${report.fps.current}`
      );
      testsPassed++;
    } else {
      console.log(`✗ Session Stability Failed`);
      testsFailed++;
    }
  } catch (error) {
    console.log(`✗ Session Test Error: ${error.message}`);
    testResults.push({
      test: "Long Session Stability",
      passed: false,
      error: error.message,
    });
    testsFailed++;
  }

  // Final Summary
  console.log("\n=== Test Summary ===");
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log(`Total: ${testsPassed + testsFailed}`);

  const allPassed = testsFailed === 0;
  console.log(`\n${allPassed ? "PASS" : "FAIL"}`);

  if (!allPassed) {
    console.log("\nFailed Tests:");
    testResults
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.test}: ${r.error || "Performance threshold not met"}`);
      });
  }

  return {
    passed: allPassed,
    summary: {
      testsPassed,
      testsFailed,
      total: testsPassed + testsFailed,
    },
    details: testResults,
  };
}

// Run the test suite
const result = await runTests();
process.exit(result.passed ? 0 : 1);