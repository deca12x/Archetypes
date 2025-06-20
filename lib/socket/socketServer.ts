import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import { Sprites } from "../game/constants/assets";

// Player and room type definitions
export interface Player {
  id: string;
  x: number;
  y: number;
  direction: string;
  username: string;
  sprite: string;
  currentScene: string;
}

export interface GameRoom {
  roomId: string;
  players: Record<string, Player>;
  availableSprites: string[];
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

// Get all available character sprites
function getAllSprites(): string[] {
  // Return all sprite values from the Sprites enum
  return Object.values(Sprites);
}

// Initialize Socket.io server
export function initSocketServer(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // Track active connections
  const activeConnections = new Set<string>();

  io.on("connection", (socket) => {
    console.log(`New socket connection: ${socket.id}`);
    activeConnections.add(socket.id);
    console.log(`Total active connections: ${activeConnections.size}`);

    // Check if a room exists and has available slots
    socket.on("checkRoom", ({ roomId }: { roomId: string }, callback) => {
      // Check if room exists
      const room = gameRooms[roomId];
      if (!room) {
        socket.emit("roomError", { message: "Room not found" });
        callback({ success: false });
        return;
      }

      // Check if the room has any available sprites left
      if (room.availableSprites.length === 0) {
        socket.emit("roomError", {
          message: "Game is full. No more characters available.",
        });
        callback({ success: false });
        return;
      }

      // Room exists and has space
      callback({ success: true });
    });

    // Create a new game room
    socket.on("createRoom", ({ username }: { username: string }) => {
      let roomId = generateRoomCode();

      // Ensure unique room ID
      while (gameRooms[roomId]) {
        roomId = generateRoomCode();
      }

      // Get all available sprites
      const allSprites = getAllSprites();

      // Randomly select a sprite for the room creator
      const randomIndex = Math.floor(Math.random() * allSprites.length);
      const selectedSprite = allSprites[randomIndex];

      // Remove the selected sprite from available sprites
      const remainingSprites = allSprites.filter(
        (sprite) => sprite !== selectedSprite
      );

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
            sprite: selectedSprite,
            currentScene: "lobby",
          },
        },
        availableSprites: remainingSprites,
      };

      // Join socket to the room
      socket.join(roomId);

      // Send room info back to client
      socket.emit("roomCreated", {
        roomId,
        playerId: socket.id,
        sprite: selectedSprite,
      });
      console.log(
        `Room created: ${roomId} by player ${socket.id} with sprite ${selectedSprite}`
      );
    });

    // Handle createOrJoinRoom event (client sends this)
    socket.on("createOrJoinRoom", ({ username }: { username: string }) => {
      console.log(
        `createOrJoinRoom called by ${socket.id} with username: ${username}`
      );

      // For now, always create a new room
      let roomId = generateRoomCode();

      // Ensure unique room ID
      while (gameRooms[roomId]) {
        roomId = generateRoomCode();
      }

      // Get all available sprites
      const allSprites = getAllSprites();

      // Randomly select a sprite for the room creator
      const randomIndex = Math.floor(Math.random() * allSprites.length);
      const selectedSprite = allSprites[randomIndex];

      // Remove the selected sprite from available sprites
      const remainingSprites = allSprites.filter(
        (sprite) => sprite !== selectedSprite
      );

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
            sprite: selectedSprite,
            currentScene: "lobby",
          },
        },
        availableSprites: remainingSprites,
      };

      // Join socket to the room
      socket.join(roomId);

      // Send room info back to client
      socket.emit("roomCreated", {
        roomId,
        playerId: socket.id,
        sprite: selectedSprite,
      });
      console.log(
        `Room created via createOrJoinRoom: ${roomId} by player ${socket.id} with sprite ${selectedSprite}`
      );
    });

    // Join an existing game room
    socket.on(
      "joinRoom",
      ({ roomId, username }: { roomId: string; username: string }) => {
        // Check if room exists
        const room = gameRooms[roomId];
        if (!room) {
          socket.emit("roomError", { message: "Room not found" });
          return;
        }

        // Check if the room has any available sprites left
        if (room.availableSprites.length === 0) {
          socket.emit("roomError", {
            message: "Game is full. No more characters available.",
          });
          return;
        }

        // Get a sprite for the new player
        const selectedSprite = room.availableSprites.pop() as string;

        // Add player to room
        room.players[socket.id] = {
          id: socket.id,
          x: 5, // Default starting position
          y: 5, // Default starting position
          direction: "down",
          username,
          sprite: selectedSprite,
          currentScene: "lobby",
        };

        // Join socket to the room
        socket.join(roomId);

        // Send room info back to client
        socket.emit("roomJoined", {
          roomId,
          playerId: socket.id,
          players: room.players,
          sprite: selectedSprite,
        });

        // Notify other players about the new player
        socket.to(roomId).emit("playerJoined", {
          playerId: socket.id,
          player: room.players[socket.id],
        });

        console.log(
          `Player ${socket.id} joined room ${roomId} with sprite ${selectedSprite}`
        );
      }
    );

    // Handle player position synchronization
    socket.on(
      "playerPosition",
      ({
        playerId,
        position,
        facingDirection,
      }: {
        playerId: string;
        position: { x: number; y: number };
        facingDirection: string;
      }) => {
        // Find the room this player is in
        let playerRoom: GameRoom | null = null;
        for (const roomId in gameRooms) {
          const room = gameRooms[roomId];
          if (room.players[playerId]) {
            playerRoom = room;
            break;
          }
        }

        if (!playerRoom) return;

        const senderPlayer = playerRoom.players[playerId];
        if (!senderPlayer) return;

        // Find all players in the same scene
        const playersInSameScene = Object.keys(playerRoom.players).filter(
          (otherPlayerId) => {
            if (otherPlayerId === playerId) return false;
            const otherPlayer = playerRoom!.players[otherPlayerId];
            return otherPlayer.currentScene === senderPlayer.currentScene;
          }
        );

        if (playersInSameScene.length > 0) {
          // Send position update to all players in the same scene
          socket.to(playerRoom.roomId).emit("playerPosition", {
            playerId,
            position,
            facingDirection,
          });

          console.log(
            `Position update from ${playerId} in scene ${senderPlayer.currentScene} sent to ${playersInSameScene.length} players in same scene`
          );
        }
      }
    );

    // Handle scene transitions
    socket.on(
      "sceneTransition",
      ({
        roomId,
        sceneName,
        playerId,
      }: {
        roomId: string;
        sceneName: string;
        playerId: string;
      }) => {
        const room = gameRooms[roomId];
        if (!room || !room.players[playerId]) return;

        // Update player's current scene
        const player = room.players[playerId];
        const previousScene = player.currentScene;
        player.currentScene = sceneName;

        // Notify other players in the room about the scene change
        socket.to(roomId).emit("playerSceneChanged", {
          playerId,
          previousScene,
          newScene: sceneName,
          player: {
            id: player.id,
            username: player.username,
            sprite: player.sprite,
            currentScene: player.currentScene,
          },
        });

        // Also emit the original sceneTransition event for backward compatibility
        socket.to(roomId).emit("sceneTransition", {
          roomId,
          sceneName,
          playerId,
        });

        console.log(
          `Player ${playerId} moved from ${previousScene} to ${sceneName} in room ${roomId}`
        );
      }
    );

    // Handle player entering a scene - send them info about other players in that scene
    socket.on(
      "playerEnteredScene",
      ({
        roomId,
        sceneName,
        playerId,
      }: {
        roomId: string;
        sceneName: string;
        playerId: string;
      }) => {
        const room = gameRooms[roomId];
        if (!room || !room.players[playerId]) return;

        // Find all other players in the same scene
        const playersInScene = Object.values(room.players).filter(
          (player) =>
            player.id !== playerId && player.currentScene === sceneName
        );

        // Send the list of players in this scene to the entering player
        socket.emit("playersInScene", {
          sceneName,
          players: playersInScene,
        });

        // Notify other players in the scene that a new player has entered
        socket.to(roomId).emit("playerEnteredScene", {
          sceneName,
          player: room.players[playerId],
        });

        console.log(
          `Player ${playerId} entered scene ${sceneName}, found ${playersInScene.length} other players`
        );
      }
    );

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      console.log(`Socket ${socket.id} disconnected. Reason: ${reason}`);
      activeConnections.delete(socket.id);
      console.log(`Total active connections: ${activeConnections.size}`);

      // Find and remove player from any room they were in
      Object.keys(gameRooms).forEach((roomId) => {
        const room = gameRooms[roomId];
        if (room.players[socket.id]) {
          // Get the sprite of the disconnected player
          const sprite = room.players[socket.id].sprite;

          // Return the sprite to the available sprites pool
          room.availableSprites.push(sprite);

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

    // Handle connection errors
    socket.on("error", (error) => {
      console.error(`Socket ${socket.id} error:`, error);
    });

    // Handle chat messages
    socket.on(
      "chatMessage",
      ({
        roomId,
        groupId,
        message,
        username,
        playerId,
      }: {
        roomId: string;
        groupId: string;
        message: string;
        username?: string;
        playerId?: string;
      }) => {
        const room = gameRooms[roomId];
        if (!room || !room.players[socket.id]) return;

        const player = room.players[socket.id];
        const senderPlayerId = playerId || socket.id;
        const senderUsername = username || player.username;

        console.log(
          `Chat message received from ${senderUsername} (${senderPlayerId}) in group ${groupId}`
        );

        // Extract all player IDs from the group ID
        const groupPlayerIds = groupId.split("-");

        // Broadcast the message to all players in the group (except the sender)
        groupPlayerIds.forEach((targetPlayerId) => {
          // Skip sending to self
          if (targetPlayerId === senderPlayerId) return;

          // Find the socket ID for this player
          const targetSocketId = targetPlayerId; // In this case, playerId is the socket ID

          // Send the message directly to this player's socket
          if (io.sockets.sockets.has(targetSocketId)) {
            io.to(targetSocketId).emit("chatMessage", {
              playerId: senderPlayerId,
              username: senderUsername,
              message,
              groupId,
              sprite: player.sprite,
            });

            console.log(`Message sent to group member: ${targetPlayerId}`);
          }
        });

        // Send confirmation back to sender
        socket.emit("chatMessageSent", {
          success: true,
          messageId: Date.now().toString(),
          groupId,
        });
      }
    );
  });

  console.log("Socket server initialized");
  return io;
}
