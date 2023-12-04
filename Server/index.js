const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const axios = require("axios");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const waitingPlayers = [];
const games = {};
const socketToGameMap = {};

io.on("connection", (socket) => {
    socket.on("startGame", () => {
        waitingPlayers.push(socket);
        if (waitingPlayers.length === 2) {
            const [player1, player2] = waitingPlayers;
            const gameId = player1.id + player2.id;
            games[gameId] = new Game(player1, player2, gameId);
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
        this.timers = [100, 100];
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

    clearTimer(playerIndex) {
        const timeoutId = this.timeoutIds[playerIndex];
        if (timeoutId) {
            clearInterval(timeoutId);
            this.timeoutIds[playerIndex] = null;
            console.log(`Cleared timer for player ${playerIndex + 1}`);
        }
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
                this.clearTimer(currentPlayer);
                console.log(`Player ${currentPlayer + 1} Timer expired`);
                io.to(this.gameId).emit("timeOut", currentPlayer === 0 ? 1 : 2);
                this.switchPlayer();
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

const PORT = 3001;
server.listen(PORT, 'localhost', () => {
    console.log(`Server is running on port ${PORT}`);
});
