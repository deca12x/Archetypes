import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";

// Player and room type definitions
export interface Player {
  id: string;
  x: number;
  y: number;
  direction: string;
  username: string;
  sprite: string;
}

export interface GameRoom {
  roomId: string;
  players: Record<string, Player>;
}

// Global state for game rooms
export const gameRooms: Record<string, GameRoom> = {};

// Generate a random room code
export function generateRoomCode(): string {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Initialize Socket.io server
export function initSocketServer(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Create a new game room
    socket.on(
      "createRoom",
      ({ username, sprite }: { username: string; sprite: string }) => {
        let roomId = generateRoomCode();

        // Ensure unique room ID
        while (gameRooms[roomId]) {
          roomId = generateRoomCode();
        }

        // Create new room
        gameRooms[roomId] = {
          roomId,
          players: {
            [socket.id]: {
              id: socket.id,
              x: 5, // Default starting position
              y: 5, // Default starting position
              direction: "down",
              username,
              sprite,
            },
          },
        };

        // Join socket to the room
        socket.join(roomId);

        // Send room info back to client
        socket.emit("roomCreated", { roomId, playerId: socket.id });
        console.log(`Room created: ${roomId} by player ${socket.id}`);
      }
    );

    // Join an existing game room
    socket.on(
      "joinRoom",
      ({
        roomId,
        username,
        sprite,
      }: {
        roomId: string;
        username: string;
        sprite: string;
      }) => {
        // Check if room exists
        const room = gameRooms[roomId];
        if (!room) {
          socket.emit("roomError", { message: "Room not found" });
          return;
        }

        // Add player to room
        room.players[socket.id] = {
          id: socket.id,
          x: 5, // Default starting position
          y: 5, // Default starting position
          direction: "down",
          username,
          sprite,
        };

        // Join socket to the room
        socket.join(roomId);

        // Send room info back to client
        socket.emit("roomJoined", {
          roomId,
          playerId: socket.id,
          players: room.players,
        });

        // Notify other players about the new player
        socket.to(roomId).emit("playerJoined", {
          playerId: socket.id,
          player: room.players[socket.id],
        });

        console.log(`Player ${socket.id} joined room ${roomId}`);
      }
    );

    // Handle player movement
    socket.on(
      "playerMovement",
      ({
        roomId,
        movement,
      }: {
        roomId: string;
        movement: { x: number; y: number; direction: string };
      }) => {
        const room = gameRooms[roomId];
        if (!room || !room.players[socket.id]) return;

        // Update player position
        const player = room.players[socket.id];
        player.x = movement.x;
        player.y = movement.y;
        player.direction = movement.direction;

        // Broadcast movement to other players in the room
        socket.to(roomId).emit("playerMoved", {
          playerId: socket.id,
          movement,
        });
      }
    );

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);

      // Find and remove player from any room they were in
      Object.keys(gameRooms).forEach((roomId) => {
        const room = gameRooms[roomId];
        if (room.players[socket.id]) {
          // Notify other players about the disconnection
          socket.to(roomId).emit("playerLeft", { playerId: socket.id });

          // Remove player from room
          delete room.players[socket.id];

          // If room is empty, delete it
          if (Object.keys(room.players).length === 0) {
            delete gameRooms[roomId];
            console.log(`Room ${roomId} deleted (empty)`);
          }
        }
      });
    });
  });

  console.log("Socket server initialized");
  return io;
}
