import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'; 
import GameStartPage from './components/GameStartPage';
import About from './components/About';
import WordRally from './components/WordRally';
import HistoryPage from './components/HistoryPage';
import './App.css';

const App = () => (
  <BrowserRouter>
    <div className="container">
      <header>
        <nav className="navbar">
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/history">History</Link></li>
          </ul>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<GameStartPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/wordrally" element={<WordRally />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </main>
      <footer>
        <p>This game is made by: Faisal Balamash and Saad Al-zahrani</p>
      </footer>
    </div>
  </BrowserRouter>
);

export default App;
