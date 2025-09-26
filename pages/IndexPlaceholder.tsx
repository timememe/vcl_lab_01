import React from 'react';
import { Link } from 'react-router-dom';

const IndexPlaceholder: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-800 p-6">
      <div className="max-w-xl text-center space-y-6">
        <h1 className="text-4xl font-bold">Welcome</h1>
        <p className="text-lg text-gray-600">
          This is a placeholder landing page. Choose one of the available demos to continue.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/vcl-lab"
            className="px-5 py-3 rounded-lg bg-red-600 text-white font-semibold shadow-sm hover:bg-red-700 transition"
          >
            Go to VCL Lab
          </Link>
          <Link
            to="/filcheck"
            className="px-5 py-3 rounded-lg border border-gray-200 font-semibold text-gray-700 hover:bg-gray-100 transition"
          >
            Visit Filcheck Stub
          </Link>
        </div>
      </div>
    </div>
  );
};

export default IndexPlaceholder;
