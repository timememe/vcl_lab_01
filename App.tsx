import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import FilcheckPlaceholder from './pages/FilcheckPlaceholder';
import IndexPlaceholder from './pages/IndexPlaceholder';
import VclLabApp from './pages/VclLabApp';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<IndexPlaceholder />} />
        <Route path="/vcl-lab" element={<VclLabApp />} />
        <Route path="/filcheck" element={<FilcheckPlaceholder />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
