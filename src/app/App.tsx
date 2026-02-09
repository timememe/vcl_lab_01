import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import HomePage from './HomePage';
import VclLabApp from './VclLabApp';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/vcl" element={<VclLabApp />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
