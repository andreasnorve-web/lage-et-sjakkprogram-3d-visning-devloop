# Chess Game - 3D Visualization & AI Opponent

A complete chess game implementation with 3D board visualization and an intelligent AI opponent using Claude AI.

## Features

- ✅ **Full Chess Engine**: Complete chess rules implementation including castling, en passant, and pawn promotion
- ✅ **AI Opponent**: Claude-powered AI with adjustable difficulty levels (Easy, Medium, Hard, Expert)
- ✅ **3D Visualization**: Three-dimensional chess board with camera controls
- ✅ **Move Validation**: Full move legality checking and check/checkmate detection
- ✅ **Game State Management**: Complete move history and game state tracking
- ✅ **REST API**: Full API for game control and state management

## Prerequisites

- Node.js 16+ 
- npm or yarn
- Anthropic API key (for AI opponent)

## Installation

1. **Clone and setup**:
```bash
git clone <repository>
cd chess-game
npm install
```

2. **Install dependencies**:
```bash
npm install express cors anthropic uuid
```

3. **Configure environment**:
```bash
# Create .env file
echo "ANTHROPIC_API_KEY=your_api_key_here" > .env
```

4. **Create public directory**:
```bash
mkdir -p public
```

## Running the Game

### Start the Server
```bash
npm start
# or
node app.js
```

The server will start on `http://localhost:3000`

### Access the Game
Open your browser and navigate to:
```
http://localhost:3000
```

## API Endpoints

### Get Board State
```bash
GET /api/board
```
Returns current board position and game state.

### Make a Move
```bash
POST /api/move
Content-Type: application/json

{
  "fromRow": 6,
  "fromCol": 4,
  "toRow": 4,
  "toCol": 4
}
```

### Reset Game
```bash
POST /api/reset
```
Starts a new game.

### Camera Controls
```bash
POST /api/camera/rotate
{ "deltaX": 10, "deltaY": 5 }

POST /api/camera/zoom
{ "delta": 0.5 }
```

### Get Render Data
```bash
GET /api/render
```
Returns 3D rendering data for visualization.

## Game Rules

### Piece Movement
- **Pawns**: Move forward 1-2 squares, capture diagonally
- **Rooks**: Move horizontally/vertically any distance
- **Knights**: Move in L-shape (2+1 squares)
- **Bishops**: Move diagonally any distance
- **Queens**: Combine rook and bishop movement
- **Kings**: Move 1 square in any direction

### Special Moves
- **Castling**: King and rook move simultaneously (kingside/queenside)
- **En Passant**: Pawn captures enemy pawn that just moved 2 squares
- **