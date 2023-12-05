import React, { useState, useEffect } from 'react';
import { socket } from '../socket';

const HistoryPage = () => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    socket.emit('requestHistory');
    socket.on('historyData', data => setHistory(data));
    socket.on('historyError', error => console.error(error));
    return () => {
      socket.off('historyData');
      socket.off('historyError');
    };
  }, []);

  return (
    <div>
      <h1>Match History</h1>
      <ul>
        {history.map((match, index) => (
          <li key={index}>Match ID: {match.id}, Winner: {match.winner}, Loser: {match.loser}, Date: {match.formatted_date}</li>
        ))}
      </ul>
    </div>
  );
};

export default HistoryPage;
