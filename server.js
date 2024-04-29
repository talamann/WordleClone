const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);
const cors = require("cors");
app.use(cors());
app.post('/sendWord',async(req,res)=>{
  
})
app.get('/getWord',async(req,res)=>{

})
const io = new Server(server, {
  cors: {
    origin: "http://localhost:8081",
    methods: ["GET", "POST"]
  },
});

const lobbies = {};
const playerReadyMap = new Map();
const playerWordsMap = new Map();

// Function to send lobby information to clients
function sendLobbyInfo() {
  const lobbyData = Object.keys(lobbies).map(lobbyName => ({
    name: lobbyName,
    usersCount: lobbies[lobbyName].users.length
  }));
  console.log(lobbyData);
  io.emit('lobbyInfo', lobbyData);
}

// Function to check if a lobby has reached its capacity (2 people)
const checkLobbyCapacity = (lobbyName) => {
  console.log(lobbyName)
  if (lobbies[lobbyName]) {
    console.log(lobbies[lobbyName].users.length)
    return lobbies[lobbyName].users.length === 2;
  }
  return false; // Lobby doesn't exist or is empty
};

// Event listener for when a client checks the lobby capacity
io.on("connection", (socket) => {
  const username = socket.handshake.query.username;
  console.log("user with id " + username + " connected");
  console.log(lobbies);

  // Send lobby info when a new client connects
  const lobbyData = Object.keys(lobbies).map(lobbyName => ({
    name: lobbyName,
    usersCount: lobbies[lobbyName].users.length
  }));
  console.log(lobbyData);
  socket.emit('lobbyInfo', lobbyData);
  //info doesnt go on connection
  socket.on('playerReady', (lobbyName) => {
    if (!playerReadyMap.has(lobbyName)) {
      playerReadyMap.set(lobbyName, [socket.id]);
    } else {
      const players = playerReadyMap.get(lobbyName);
      players.push(socket.id);
      console.log(players);
      playerReadyMap.set(lobbyName, players);
    }

    // Check if both players are ready
    const players = playerReadyMap.get(lobbyName);
    if (players.length === 2) {
      // Notify both players to start the game
      players.forEach(player => {
        io.to(player).emit('gameStart');
      });
    }
  });
//username gelmiyo
  socket.on('createLobby', (lobbyName,username) => {
    if (!lobbies[lobbyName]) {
      lobbies[lobbyName] = {
        users:[]
      };
      console.log(`Lobby '${lobbyName}' created by user`+username);
      // After creating lobby, send updated lobby info to all clients
      sendLobbyInfo();
      // Send signal to all users currently connected
      io.emit('lobbyCreated', lobbyName);
    } else {
      socket.emit('lobbyExists', 'A lobby with the same name already exists');
    }
  });

  socket.on('joinLobby', (lobbyName, joinUsername) => {
    if (lobbies[lobbyName]) {
        const usersCount = lobbies[lobbyName].users.length;
        // Check if the user is already in the lobby
        const userAlreadyInLobby = lobbies[lobbyName].users.includes(joinUsername);

        if (usersCount < 2 ) {
            socket.emit('joined', true);
            lobbies[lobbyName].users.push(joinUsername);
            socket.join(lobbyName);
            socket.to(lobbies[lobbyName]).emit('userJoined', `User ${joinUsername} joined lobby '${lobbyName}'`);
            // After user joins lobby, send updated lobby info to all clients
            sendLobbyInfo();
        } else {
            // If the user is already in the lobby, send a message indicating that
            if (userAlreadyInLobby) {
                socket.emit('alreadyInLobby', 'You are already in this lobby');
            } else {
                // Otherwise, send a message indicating that the lobby is full
                socket.emit('lobbyFull', 'LOBBY IS FULL');
            }
        }
    } else {
        socket.emit('lobbyNotFound', 'The requested lobby does not exist');
    }
  });

  // Handle leaving a lobby
  socket.on('leaveLobby', (lobbyName, username) => {
    if (lobbies[lobbyName]) {
      // Remove the user from the lobby
      const index = lobbies[lobbyName].users.indexOf(username);
      if (index !== -1) {
        lobbies[lobbyName].users.splice(index, 1);
      }

      // If the lobby is empty, delete it
      if (lobbies[lobbyName].users.length === 0) {
        delete lobbies[lobbyName];
      }

      // Send updated lobby information to all clients
      sendLobbyInfo();
    }
  });

  // Function to send lobby capacity status back to a specific client
  const sendLobbyCapacityStatus = (socket, capacityReached) => {
    console.log(capacityReached);
    socket.emit('lobbyCapacityStatus', capacityReached);
  };

  // Event listener for when a client checks the lobby capacity
  socket.on('checkLobbyCapacity', (lobbyName) => {
    // Check if the lobby has reached its capacity
    const capacityReached = checkLobbyCapacity(lobbyName);
    console.log(capacityReached +123);
    // Send the lobby capacity status back to the client
    sendLobbyCapacityStatus(socket, capacityReached);
  });

  // Function to handle when a player chooses a word
  const handleWordChosen = (word, lobbyName) => {
    if (!playerWordsMap.has(lobbyName)) {
      // If no player has chosen a word yet, initialize the array with the current player's word
      playerWordsMap.set(lobbyName, [{ socketId: socket.id, word }]);
    } else {
      // If there are already words chosen, add the current player's word to the array
      const playerWords = playerWordsMap.get(lobbyName);
      playerWords.push({ socketId: socket.id, word });
      console.log(word);
      playerWordsMap.set(lobbyName, playerWords);
    }

    // Check if both players have chosen words
    const playerWords = playerWordsMap.get(lobbyName);
    if (playerWords.length === 2) {
      const [player1, player2] = playerWords; // Destructure playerWords array

      // Emit the opponent's word to each player individually
      io.to(player1.socketId).emit('startGame', player2.word);
      io.to(player2.socketId).emit('startGame', player1.word);
    }
  };

  // Event listener for when a player chooses a word
  socket.on('wordChosen', (word,lobbyname) => {
    handleWordChosen(word, lobbyname); // Assuming you have a function getLobbyName to get the lobby name based on the socket ID
  });
});

server.listen(3001, () => {
  console.log("server open");
});

