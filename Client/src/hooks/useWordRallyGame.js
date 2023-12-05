import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { socket } from '../socket';

const useWordRallyGame = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState({
    playerTurn: 1,
    previousWord: "",
    currentWord: "",
    gameOver: false,
    winner: null,
    errorMessage: "",
    playerTimer: [60, 60],
    turnTimer: [10, 10],
    playerNumber: location.state?.playerNumber,
    gameId: location.state?.gameId,
  });

  useEffect(() => {
    if (!gameState.gameId || !gameState.playerNumber) {
      navigate("/");
      return;
    }

    const playerSwitchListener = (currentPlayer) => {
      setGameState(prevState => ({
        ...prevState,
        playerTurn: currentPlayer,
        turnTimer: [10, 10],
      }));
    };

    const wordValidatedListener = (word) => {
      setGameState(prevState => ({
        ...prevState,
        previousWord: word,
        currentWord: "",
        playerTurn: prevState.playerTurn === 1 ? 2 : 1,
      }));
    };

    const wordInvalidListener = (message) => {
      setGameState(prevState => ({
        ...prevState,
        errorMessage: message,
      }));
    };

    const timerUpdateListener = (timers) => {
      setGameState(prevState => ({
        ...prevState,
        playerTimer: timers,
      }));
    };

    const turnTimerUpdateListener = (turnTimers) => {
      setGameState(prevState => ({
        ...prevState,
        turnTimer: turnTimers,
      }));
    };

    const turnEndedListener = (playerNumber) => {
      setGameState(prevState => ({
        ...prevState,
        playerTurn: playerNumber ? 1 : 2,
        errorMessage: '',
        currentWord: '',
      }));
    };

    const timeOutListener = (winnerNumber) => {
      setGameState(prevState => ({
        ...prevState,
        gameOver: true,
        winner: winnerNumber,
      }));
    };

    const gameOverListener = (winningPlayerIndex) => {
      setGameState(prevState => ({
        ...prevState,
        gameOver: true,
        winner: winningPlayerIndex + 1,
      }));
    };

    socket.on("playerSwitch", playerSwitchListener);
    socket.on("wordValidated", wordValidatedListener);
    socket.on("wordInvalid", wordInvalidListener);
    socket.on("timerUpdate", timerUpdateListener);
    socket.on("turnTimerUpdate", turnTimerUpdateListener);
    socket.on("turnEnded", turnEndedListener);
    socket.on("timeOut", timeOutListener);
    socket.on("gameOver", gameOverListener);

    return () => {
      socket.off("playerSwitch", playerSwitchListener);
      socket.off("wordValidated", wordValidatedListener);
      socket.off("wordInvalid", wordInvalidListener);
      socket.off("timerUpdate", timerUpdateListener);
      socket.off("turnTimerUpdate", turnTimerUpdateListener);
      socket.off("turnEnded", turnEndedListener);
      socket.off("timeOut", timeOutListener);
      socket.off("gameOver", gameOverListener);
    };
  }, [navigate, gameState.gameId, gameState.playerNumber]);

  const handleWordSubmit = (word) => {
    if (gameState.playerTurn === gameState.playerNumber) {
      socket.emit("submitWord", gameState.gameId, word);
    } else {
      setGameState(prevState => ({
        ...prevState,
        errorMessage: "It's not your turn",
      }));
    }
  };

  return { gameState, setGameState, handleWordSubmit };
};

export default useWordRallyGame;
