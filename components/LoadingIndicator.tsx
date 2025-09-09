import React, { useState, useEffect } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';

const messageKeys = [
  "loading_message_1",
  "loading_message_2",
  "loading_message_3",
  "loading_message_4",
  "loading_message_5"
];

const LoadingIndicator: React.FC = () => {
    const [messageIndex, setMessageIndex] = useState(0);
    const { t } = useLocalization();

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex(prevIndex => (prevIndex + 1) % messageKeys.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

  return (
    <div className="flex flex-col items-center justify-center bg-white p-10 rounded-2xl shadow-lg border border-gray-200" style={{ minHeight: '300px', minWidth: '350px'}}>
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      <p className="text-gray-700 font-semibold mt-6 text-lg text-center">
        {t(messageKeys[messageIndex])}
      </p>
      <p className="text-gray-500 mt-2 text-sm">
        {t('loading_submessage')}
      </p>
    </div>
  );
};

export default LoadingIndicator;