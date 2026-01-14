import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import AiPipeTestPage from './pages/AiPipeTestPage';
import FilcheckPlaceholder from './pages/FilcheckPlaceholder';
import IndexPlaceholder from './pages/IndexPlaceholder';
import VclLabApp from './pages/VclLabApp';
import ShaderTestPage from './pages/ShaderTestPage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<IndexPlaceholder />} />
        <Route path="/vcl" element={<VclLabApp />} />
        <Route path="/filcheck" element={<FilcheckPlaceholder />} />
        <Route path="/shader-test" element={<ShaderTestPage />} />
        <Route path="/aipipe-test" element={<AiPipeTestPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
