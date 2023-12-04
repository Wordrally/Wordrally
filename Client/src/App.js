import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import "./App.css";

const socket = io("http://localhost:3001", { transports: ["websocket"] });

const App = () => {
  return (
    <BrowserRouter>
      <div className="container">
        <header>
          <nav className="navbar">
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/about">About</Link></li>
            </ul>
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<GameStartPage />} />
            <Route path="/about" element={<About />} />
            <Route path="/shiritori" element={<Shiritori socket={socket} />} />
          </Routes>
        </main>
        <footer>
          <p>This game is made by: Faisal Balamash and Saad Al-zahrani</p>
        </footer>
      </div>
    </BrowserRouter>
  );
};

const About = () => (
  <div>
    <h1>About</h1>
    <p>A game that is adopted by the japanese game "shiritori" with our twists :3</p>
  </div>
);

const GameStartPage = () => {
  const navigate = useNavigate();
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    const gameStartListener = (data) => {
      navigate("/shiritori", { state: { gameId: data.gameId, playerNumber: data.playerNumber } });
    };

    socket.on("gameStart", gameStartListener);

    return () => {
      socket.off("gameStart", gameStartListener);
    };
  }, [navigate]);

  const handleStartGame = () => {
    socket.emit("startGame");
    setWaiting(true);
  };

  return (
    <div className="game-start-page">
      <div className="game-start-modal">
        <div className="game-start-popup">
          <h1>WordRally</h1>
          {waiting ? (
            <p>Waiting for another player...</p>
          ) : (
            <p>
              Think of a word that starts with the last letter of your opponent's word. Win by picking unique words and answering as fast as you can!
            </p>
          )}
          <button id="Button" onClick={handleStartGame} disabled={waiting}>
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
};

const Shiritori = ({ socket }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [playerState, setPlayerState] = useState({
    playerTurn: 1,
    previousWord: "",
    currentWord: "",
    gameOver: false,
    winner: null,
    errorMessage: "",
    playerTimer: [100, 100],
    turnTimer: [10, 10],
  });

  useEffect(() => {
    const gameId = location.state?.gameId;
    const playerNumber = location.state?.playerNumber;

    if (!gameId || !playerNumber) {
      navigate("/");
      return;
    }

    const playerSwitchListener = (currentPlayer) => {
      setPlayerState(prevState => ({
          ...prevState,
          playerTurn: currentPlayer,
          turnTimer: [10, 10], 
      }));
  };

    const wordValidatedListener = (word) => {
      setPlayerState((prevState) => ({
        ...prevState,
        previousWord: word,
        currentWord: "",
        playerTurn: prevState.playerTurn === 1 ? 2 : 1,
      }));
    };

    const wordInvalidListener = (message) => {
      setPlayerState((prevState) => ({
        ...prevState,
        errorMessage: message,
      }));
    };

    const timerUpdateListener = (timers) => {
      console.log("Received timer update:", timers);
      setPlayerState((prevState) => ({
        ...prevState,
        playerTimer: timers,
      }));
    };
    
    const turnTimerUpdateListener = (turnTimers) => {
      console.log("Received turn timer update:", turnTimers);
      setPlayerState((prevState) => ({
        ...prevState,
        turnTimer: turnTimers,
      }));
    };

    const turnEndedListener = (playerNumber) => {
      setPlayerState(prevState => {
          const newState = {
              ...prevState,
              playerTurn: playerNumber === 1 ? 2 : 1,
              errorMessage: '',
              currentWord: '',
          };
          console.log("New state after turn end:", newState);
          return newState;
      });
  };

    const timeOutListener = (winnerNumber) => {
      setPlayerState((prevState) => ({
        ...prevState,
        gameOver: true,
        winner: winnerNumber,
      }));
    };

    socket.on("playerSwitch", playerSwitchListener);
    socket.on("turnEnded", turnEndedListener);
    socket.on("wordValidated", wordValidatedListener);
    socket.on("wordInvalid", wordInvalidListener);
    socket.on("timerUpdate", timerUpdateListener);
    socket.on("turnTimerUpdate", turnTimerUpdateListener);
    socket.on("turnEnded", turnEndedListener);
    socket.on("timeOut", timeOutListener);

    return () => {
      socket.off("wordValidated", wordValidatedListener);
      socket.off("wordInvalid", wordInvalidListener);
      socket.off("timerUpdate", timerUpdateListener);
      socket.off("turnTimerUpdate", turnTimerUpdateListener);
      socket.off("turnEnded", turnEndedListener);
      socket.off("timeOut", timeOutListener);
      socket.off("playerSwitch", playerSwitchListener);

    };
  }, [location, navigate, socket]);

  const handleWordSubmit = () => {
    if (playerState.playerTurn === location.state?.playerNumber) {
      socket.emit("submitWord", location.state?.gameId, playerState.currentWord);
    } else {
      setPlayerState((prevState) => ({
        ...prevState,
        errorMessage: "It's not your turn",
      }));
    }
  };

  if (playerState.gameOver) {
    return <div>Game Over. Player {playerState.winner} wins!</div>;
  }

  

  return (
    <div>
      <h1>WordRally</h1>
      <div>{playerState.playerTurn !== location.state?.playerNumber ? "Opponent's turn" : "Your turn"}</div>
      <div>
        <label id="label" htmlFor={`wordInputPlayer${location.state?.playerNumber}`}>Enter the word</label>
        <input
          id={`wordInputPlayer${location.state?.playerNumber}`}
          type="text"
          value={playerState.currentWord}
          onChange={(e) => setPlayerState((prevState) => ({ ...prevState, currentWord: e.target.value }))}
          placeholder={playerState.playerTurn === location.state?.playerNumber && playerState.previousWord.length > 0 
            ? playerState.previousWord.charAt(playerState.previousWord.length - 1).toUpperCase() 
            : ""}
          autoFocus
          disabled={playerState.playerTurn !== location.state?.playerNumber}
        />
        <button id="Button" onClick={handleWordSubmit} disabled={playerState.playerTurn !== location.state?.playerNumber}>
          Submit
        </button>
        {playerState.errorMessage && <div className="error-message">{playerState.errorMessage}</div>}
      </div>
      <div>Your Time: {playerState.playerTimer[location.state?.playerNumber - 1]} seconds</div>
<div>Your Turn Time: {playerState.turnTimer[location.state?.playerNumber - 1]} seconds</div>
    </div>
  );
};

export default App;
