import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import VclLabApp from './VclLabApp';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<VclLabApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
