const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const axios = require("axios");
const mariaDB = require("./database");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const waitingPlayers = [];
const games = {};
const socketToGameMap = {};

const { recordGameResult, getMatchHistory } = require('./database');

const cors = require('cors');
app.use(cors());

app.get('/api/history', async (req, res) => {
    try {
        const history = await getMatchHistory();
        res.json(history);
    } catch (error) {
        console.error('Error fetching match history:', error);
        res.status(500).send('Error fetching match history');
    }
});

app.use(express.json()); // Middleware to parse JSON bodies

io.on("connection", (socket) => {
    socket.on("startGame", () => {
        waitingPlayers.push(socket);
        if (waitingPlayers.length === 2) {
            const [player1, player2] = waitingPlayers;
            const gameId = player1.id + player2.id;
            games[gameId] = new Game(player1, player2, gameId, io);
            socketToGameMap[player1.id] = gameId;
            socketToGameMap[player2.id] = gameId;
            player1.emit("gameStart", { gameId, playerNumber: 1 });
            player2.emit("gameStart", { gameId, playerNumber: 2 });
            waitingPlayers.length = 0;
        }
    });

    socket.on("submitWord", async (gameId, word) => {
        const game = games[gameId];
        if (game && !game.usedWords.has(word)) {
            const lastWord = game.previousWord;
            if (lastWord && word.charAt(0).toLowerCase() !== lastWord.charAt(lastWord.length - 1).toLowerCase()) {
                socket.emit("wordInvalid", "Word must start with the last letter of the previous word");
                return;
            }
    
            try {
                const options = {
                    method: 'GET',
                    url: `https://wordsapiv1.p.rapidapi.com/words/${word}`,
                    headers: {
                        'X-RapidAPI-Key': 'c7e49a9786mshe315a346bed1b98p112a86jsn3638b253b15f',
                        'X-RapidAPI-Host': 'wordsapiv1.p.rapidapi.com'
                    }
                };
    
                const response = await axios.request(options);
                if (response.status === 200) {
                    game.usedWords.add(word);
                    game.previousWord = word;
                    game.clearTurnTimer(game.currentTurn);
                    game.switchPlayer();
                    io.to(gameId).emit("wordValidated", word);
                } else {
                    socket.emit("wordInvalid", "Word not found in dictionary");
                }
            } catch (error) {
                socket.emit("wordInvalid", "Invalid word");
            }
        } else {
            socket.emit("wordInvalid", "Word already used");
        }
    });

    socket.on('requestHistory', async () => {
        try {
            const history = await getMatchHistory();
            socket.emit('historyData', history);
        } catch (error) {
            console.error('Error fetching match history:', error);
            socket.emit('historyError', 'Error fetching match history');
        }
    });
    
    socket.on("disconnect", () => {
        const gameId = socketToGameMap[socket.id];
        if (gameId && games[gameId]) {
            games[gameId].clearTimers();
        }
        delete socketToGameMap[socket.id];
    });
});

class Game {
    constructor(player1, player2, gameId) {
        this.players = [player1, player2];
        this.gameId = gameId;
        this.currentTurn = 0;
        this.usedWords = new Set();
        this.timers = [60, 60];
        this.turnTimers = [10, 10];
        this.timeoutIds = [null, null];
        this.turnTimeoutIds = [null, null];
        player1.join(gameId);
        player2.join(gameId);
        this.startTimerForCurrentPlayer();
        this.startTurnTimer();
        this.previousWord = ""; 
        this.isProcessingSubmission = false;
    }
    

    clearTimers() {
        this.timeoutIds.forEach(timeoutId => {
            if (timeoutId) {
                clearInterval(timeoutId);
            }
        });
        this.turnTimeoutIds.forEach(turnTimeoutId => {
            if (turnTimeoutId) {
                clearInterval(turnTimeoutId);
            }
        });
    }


    endGame(playerIndexWithTimerZero) {
        // Stop all timers
        this.clearTimers();

        // Determine the winner and loser
        const winningPlayerIndex = playerIndexWithTimerZero === 0 ? 1 : 0;
        const winnerName = `Player ${winningPlayerIndex + 1}`;
        const loserName = winningPlayerIndex === 0 ? "Player 2" : "Player 1";

        // Record the game result in the database
        recordGameResult(winnerName, loserName).then(() => {
            console.log('Game result recorded successfully');
            // Notify both players that the game is over
            io.to(this.gameId).emit("gameOver", winningPlayerIndex);
        }).catch(error => {
            console.error('Error recording game result:', error);
            // Handle any errors, maybe notify players of an issue
        });

        // Additional clean-up if needed
        delete games[this.gameId];
    }
    
    startTimerForCurrentPlayer() {
        const currentPlayer = this.currentTurn;
        this.clearTimer(currentPlayer);
        console.log(`Starting game timer for player ${currentPlayer + 1}`);
    
        this.timeoutIds[currentPlayer] = setInterval(() => {
            if (this.timers[currentPlayer] > 0) {
                this.timers[currentPlayer]--;
                console.log(`Player ${currentPlayer + 1} Timer: ${this.timers[currentPlayer]}`);
                io.to(this.gameId).emit("timerUpdate", this.timers);
            } else {
              /*  this.clearTimer(currentPlayer);
                console.log(`Player ${currentPlayer + 1} Timer expired`);
                io.to(this.gameId).emit("timeOut", currentPlayer === 0 ? 1 : 2);
                this.switchPlayer(); */
                this.endGame(currentPlayer); // Call a function to end the game
            }
        }, 990);
    }
    

    startTurnTimer() {
        const currentPlayer = this.currentTurn;
        this.turnTimers = [10, 10];
        console.log(`Starting turn timer for player ${this.currentTurn + 1}`);
        this.turnTimeoutIds[currentPlayer] = setInterval(() => {
            if (this.turnTimers[currentPlayer] <= 0) {
                this.clearTurnTimer(currentPlayer);
                io.to(this.gameId).emit("turnEnded", currentPlayer);
                this.switchPlayer(); // Ensure this is called when timer reaches zero
            } else {
                this.turnTimers[currentPlayer]--;
                io.to(this.gameId).emit("turnTimerUpdate", this.turnTimers);
            }
        }, 990);
    }

    clearTurnTimer(playerIndex) {
        const turnTimeoutId = this.turnTimeoutIds[playerIndex];
        console.log(`Cleared turn timer for player ${playerIndex + 1}`);
        if (turnTimeoutId) {
            clearInterval(turnTimeoutId);
            this.turnTimeoutIds[playerIndex] = null;
        }

        
    }

    clearTimer(playerIndex) {
        if (this.timeoutIds[playerIndex]) {
            clearInterval(this.timeoutIds[playerIndex]);
            this.timeoutIds[playerIndex] = null;
            console.log(`Cleared game timer for player ${playerIndex + 1}`);
        }
    }

    switchPlayer() {
        this.clearTimer(this.currentTurn); // Clear the game timer of the current player
        this.clearTurnTimer(this.currentTurn); // Clear the turn timer of the current player
        this.currentTurn = 1 - this.currentTurn;
        console.log(`Switched to player ${this.currentTurn + 1}`);
        this.startTimerForCurrentPlayer();
        this.startTurnTimer();
    }
    
}

app.post('/record-game', async (req, res) => {
    try {
        const { winner, loser } = req.body;
        await recordGameResult(winner, loser);
        res.status(200).send('Game result recorded successfully');
    } catch (error) {
        console.error('Error recording game result:', error);
        res.status(500).send('Error recording game result');
    }
});

const PORT = 3001;
server.listen(PORT, 'localhost', () => {
    console.log(`Server is running on port ${PORT}`);
});