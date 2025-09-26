import React from 'react';
import { Link } from 'react-router-dom';

const FilcheckPlaceholder: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6">
      <div className="max-w-lg text-center space-y-5">
        <h1 className="text-4xl font-extrabold tracking-tight">Filcheck</h1>
        <p className="text-base text-slate-300">
          The Filcheck experience is coming soon. We are working on powerful tooling for media validation and will share details shortly.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white text-slate-900 font-semibold hover:bg-slate-200 transition"
        >
          Back to landing page
        </Link>
      </div>
    </div>
  );
};

export default FilcheckPlaceholder;
