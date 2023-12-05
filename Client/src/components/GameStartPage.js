import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';

const GameStartPage = () => {
  const navigate = useNavigate();
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    const gameStartListener = data => {
      navigate("/wordrally", { state: { gameId: data.gameId, playerNumber: data.playerNumber } });
    };

    socket.on("gameStart", gameStartListener);
    return () => socket.off("gameStart", gameStartListener);
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
          {waiting ? <p>Waiting for another player...</p> : <p>Think of a word that starts with the last letter of your opponent's word. Win by picking unique words and answering as fast as you can!</p>}
          <button id="Button" onClick={handleStartGame} disabled={waiting}>Start Game</button>
        </div>
      </div>
    </div>
  );
};

export default GameStartPage;
