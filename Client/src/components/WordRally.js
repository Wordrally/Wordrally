import React from 'react';
import useWordRallyGame from '../hooks/useWordRallyGame';
import '../App.css';


const WordRally = () => {
  const { gameState, setGameState, handleWordSubmit } = useWordRallyGame();

  if (gameState.gameOver) {
    return <div>Game Over. Player {gameState.winner} wins!</div>;
  }

  return (
    <div>
      <h1>WordRally</h1>
      <div>{gameState.playerTurn !== gameState.playerNumber ? "Opponent's turn" : "Your turn"}</div>
      <div>
        <label htmlFor={`wordInputPlayer${gameState.playerNumber}`}>Enter the word</label>
        <input
          id={`wordInputPlayer${gameState.playerNumber}`}
          type="text"
          value={gameState.currentWord}
          onChange={(e) => setGameState({ ...gameState, currentWord: e.target.value })}
          placeholder={gameState.playerTurn == gameState.playerNumber  &&  gameState.previousWord.length > 0 ? gameState.previousWord.slice(-1).toUpperCase() : ""}
          disabled={gameState.playerTurn !== gameState.playerNumber}
        />
        <button id="Button" onClick={() => handleWordSubmit(gameState.currentWord)} disabled={gameState.playerTurn !== gameState.playerNumber}>Submit</button>
        {gameState.errorMessage && <div className="error-message">{gameState.errorMessage}</div>}
      </div>
      <div>Your Time: {gameState.playerTimer[gameState.playerNumber - 1]} seconds</div>
      <div>Your Turn Time: {gameState.turnTimer[gameState.playerNumber - 1]} seconds</div>
    </div>
  );
};

export default WordRally;
