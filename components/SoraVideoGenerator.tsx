import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { checkSoraVideoStatus, generateSoraVideo, type SoraGenerationResponse } from '../services/soraService';

interface SoraVideoGeneratorProps {
  onBack: () => void;
}

interface SoraHistoryEntry {
  id: string;
  prompt: string;
  size: string;
  createdAt: string;
  status: string | null;
  videoUrl: string | null;
  statusMessage: string | null;
}

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 12;
const DEFAULT_SIZE = '720x1280';
const MAX_HISTORY_ITEMS = 12;

const SoraVideoGenerator: React.FC<SoraVideoGeneratorProps> = ({ onBack }) => {
  const { t } = useLocalization();
  const translate = useCallback(
    (key: string, fallback: string) => {
      const result = t(key);
      return result === key ? fallback : result;
    },
    [t]
  );

  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<SoraGenerationResponse['metadata']>(null);
  const [rawResponse, setRawResponse] = useState<unknown>(null);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [history, setHistory] = useState<SoraHistoryEntry[]>([]);

  const pollTimeoutRef = useRef<number | null>(null);
  const pollAttemptsRef = useRef(0);

  const clearPoll = useCallback(() => {
    if (pollTimeoutRef.current !== null) {
      window.clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => () => clearPoll(), [clearPoll]);

  const upsertHistoryEntry = useCallback((entry: SoraHistoryEntry) => {
    setHistory(prev => {
      const existingIndex = prev.findIndex(item => item.id === entry.id);
      if (existingIndex !== -1) {
        const copy = [...prev];
        copy[existingIndex] = { ...copy[existingIndex], ...entry };
        return copy;
      }
      return [entry, ...prev].slice(0, MAX_HISTORY_ITEMS);
    });
  }, []);

  const updateHistoryEntry = useCallback(
    (id: string, updates: Partial<SoraHistoryEntry>) => {
      setHistory(prev => prev.map(item => (item.id === id ? { ...item, ...updates } : item)));
    },
    []
  );

  const scheduleStatusPoll = useCallback(
    (id: string) => {
      clearPoll();
      pollAttemptsRef.current = 0;

      const poll = async () => {
        try {
          pollAttemptsRef.current += 1;
          const response = await checkSoraVideoStatus(id);

          setMetadata(response.metadata ?? null);
          setRawResponse(response.raw ?? null);
          setStatusMessage(response.statusMessage ?? null);

          let resolvedVideoUrl = response.videoUrl ?? null;
          if (!resolvedVideoUrl && response.videoBase64) {
            resolvedVideoUrl = `data:video/mp4;base64,${response.videoBase64}`;
          }

          updateHistoryEntry(id, {
            status: response.metadata?.status ?? null,
            videoUrl: resolvedVideoUrl,
            statusMessage: response.statusMessage ?? null
          });

          if (resolvedVideoUrl) {
            setVideoUrl(resolvedVideoUrl);
            setRequestId(null);
            clearPoll();
            return;
          }

          if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
            const timeoutMessage = translate('sora_poll_timeout', 'Video is still processing. Try again shortly.');
            setStatusMessage(timeoutMessage);
            updateHistoryEntry(id, { statusMessage: timeoutMessage });
            clearPoll();
            return;
          }

          pollTimeoutRef.current = window.setTimeout(poll, POLL_INTERVAL_MS);
        } catch (pollError) {
          clearPoll();
          setRequestId(null);
          const message = pollError instanceof Error ? pollError.message : translate('sora_status_error', 'Failed to check video status.');
          setError(message);
          updateHistoryEntry(id, { statusMessage: message });
        }
      };

      pollTimeoutRef.current = window.setTimeout(poll, POLL_INTERVAL_MS);
    },
    [clearPoll, translate, updateHistoryEntry]
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    clearPoll();
    setRequestId(null);
    setImageFile(file);
    setVideoUrl(null);
    setMetadata(null);
    setRawResponse(null);
    setStatusMessage(null);

    if (!file) {
      setImagePreview(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.onerror = () => {
      setImagePreview(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    clearPoll();
    setRequestId(null);
    setIsSubmitting(true);
    setError(null);
    setStatusMessage(null);
    setVideoUrl(null);
    setMetadata(null);
    setRawResponse(null);

    try {
      const response = await generateSoraVideo({ prompt, imageFile, size });

      let resolvedVideoUrl = response.videoUrl ?? null;
      if (!resolvedVideoUrl && response.videoBase64) {
        resolvedVideoUrl = `data:video/mp4;base64,${response.videoBase64}`;
      }

      const entryId = response.requestId ?? response.metadata?.id ?? `req-${Date.now()}`;
      const historyEntry: SoraHistoryEntry = {
        id: entryId,
        prompt,
        size,
        createdAt: new Date().toISOString(),
        status: response.metadata?.status ?? null,
        videoUrl: resolvedVideoUrl,
        statusMessage: response.statusMessage ?? null
      };
      upsertHistoryEntry(historyEntry);

      setVideoUrl(resolvedVideoUrl);
      setMetadata(response.metadata ?? null);
      setRawResponse(response.raw ?? null);
      setStatusMessage(response.statusMessage ?? null);

      if (response.requestId && !resolvedVideoUrl) {
        setRequestId(response.requestId);
        scheduleStatusPoll(response.requestId);
      } else {
        setRequestId(null);
        clearPoll();
      }

      if (!resolvedVideoUrl && !response.statusMessage) {
        const message = translate('sora_no_video_returned', 'The API response did not include a video output.');
        setError(message);
        updateHistoryEntry(entryId, { statusMessage: message });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHistoryStatusCheck = useCallback(
    (id: string) => {
      setStatusMessage(null);
      setRequestId(id);
      scheduleStatusPoll(id);
    },
    [scheduleStatusPoll]
  );

  const resetForm = () => {
    clearPoll();
    setRequestId(null);
    setPrompt('');
    setImageFile(null);
    setImagePreview(null);
    setVideoUrl(null);
    setMetadata(null);
    setRawResponse(null);
    setSize(DEFAULT_SIZE);
    setStatusMessage(null);
    setError(null);
  };

  const renderHistory = () => {
    if (history.length === 0) {
      return (
        <p className="text-sm text-gray-500">
          {translate('sora_history_empty', 'No video requests yet.')}
        </p>
      );
    }

    const formatPrompt = (value: string) => {
      const trimmed = value.trim();
      if (trimmed.length <= 80) {
        return trimmed;
      }
      return `${trimmed.slice(0, 77)}…`;
    };

    const formatTimestamp = (iso: string) => {
      try {
        return new Date(iso).toLocaleTimeString();
      } catch {
        return iso;
      }
    };

    return (
      <ul className="space-y-3">
        {history.map(entry => (
          <li
            key={entry.id}
            className="border border-gray-200 rounded-lg p-3 bg-gray-50 flex flex-col gap-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-gray-500">
                {translate('sora_history_created', 'Created')}: {formatTimestamp(entry.createdAt)}
              </div>
              <div className="text-xs text-gray-500">
                ID: <span className="font-mono">{entry.id}</span>
              </div>
            </div>
            <div className="text-sm text-gray-700">
              {formatPrompt(entry.prompt)}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
              <span>
                {translate('sora_history_size', 'Size')}: {entry.size}
              </span>
              <span>
                {translate('sora_history_status', 'Status')}: {entry.status ?? translate('sora_status_unknown', 'Unknown')}
              </span>
            </div>
            {entry.statusMessage && (
              <div className="text-xs text-yellow-800 bg-yellow-100 border border-yellow-200 rounded px-2 py-1">
                {entry.statusMessage}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {entry.videoUrl ? (
                <div className="flex items-center gap-2">
                  <a
                    href={entry.videoUrl}
                    download={`sora-${entry.id}.mp4`}
                    className="text-xs text-red-600 hover:text-red-700 underline"
                  >
                    {translate('sora_history_download', 'Download video')}
                  </a>
                  <a
                    href={entry.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-600 hover:text-gray-800 underline"
                  >
                    {translate('sora_history_open', 'Open video')}
                  </a>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleHistoryStatusCheck(entry.id)}
                  className="text-xs text-gray-600 hover:text-gray-800 underline"
                >
                  {translate('sora_history_check', 'Check status')}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="w-full max-w-3xl bg-white border border-gray-200 rounded-2xl shadow-lg p-6 space-y-6">
      <button
        onClick={onBack}
        className="text-gray-500 hover:text-gray-800 transition flex items-center gap-2"
        type="button"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L9.586 11H3a1 1 0 110-2h6.586L7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        {translate('sora_back', 'Back to generator')}
      </button>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{translate('sora_title', 'Sora 2 Video Generator')}</h2>
        <p className="text-gray-600 text-sm">
          {translate('sora_subtitle', 'Provide a prompt and optional reference image to generate a video using Sora 2.')}
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="soraPrompt" className="block text-sm font-semibold text-gray-700 mb-1">
            {translate('sora_prompt_label', 'Video prompt')}
          </label>
          <textarea
            id="soraPrompt"
            name="soraPrompt"
            required
            rows={4}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={translate('sora_prompt_placeholder', 'Describe the video you want to create...')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 transition"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {translate('sora_size_label', 'Video size (for example 720x1280)')}
          </label>
          <input
            type="text"
            value={size}
            onChange={(event) => setSize(event.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 transition"
            placeholder={DEFAULT_SIZE}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {translate('sora_image_label', 'Reference image (optional)')}
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-600"
          />
          {imagePreview && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1">{imageFile?.name}</p>
              <img src={imagePreview} alt="Reference preview" className="max-h-48 rounded-lg border" />
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {statusMessage && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm px-4 py-3 rounded-lg">
            {statusMessage}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-60"
          >
            {isSubmitting
              ? translate('sora_generating', 'Generating video...')
              : translate('sora_generate_button', 'Generate video')}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {translate('sora_reset_button', 'Reset form')}
          </button>
        </div>
      </form>

      {videoUrl && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800">{translate('sora_result_title', 'Generated video')}</h3>
          <video controls className="w-full rounded-lg border" src={videoUrl} />
          <a
            href={videoUrl}
            download="sora-video.mp4"
            className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
          >
            {translate('sora_download', 'Download video')}
          </a>
        </div>
      )}

      {metadata && (
        <div className="mt-4 text-xs text-gray-500 space-y-1">
          <p>
            <span className="font-semibold">{translate('sora_metadata_id', 'Request ID')}:</span> {metadata?.id ?? 'N/A'}
          </p>
          <p>
            <span className="font-semibold">{translate('sora_metadata_status', 'Status')}:</span> {metadata?.status ?? 'N/A'}
          </p>
          <p>
            <span className="font-semibold">{translate('sora_metadata_created', 'Created')}:</span> {metadata?.created ?? 'N/A'}
          </p>
        </div>
      )}

      {rawResponse && (
        <details className="mt-4 text-xs text-gray-500">
          <summary className="cursor-pointer">{translate('sora_raw_summary', 'Show raw API response')}</summary>
          <pre className="mt-2 max-h-64 overflow-auto bg-gray-50 border border-gray-200 rounded-lg p-3">
            {JSON.stringify(rawResponse, null, 2)}
          </pre>
        </details>
      )}

      <section className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          {translate('sora_history_title', 'Recent requests')}
        </h3>
        {renderHistory()}
      </section>
    </div>
  );
};

export default SoraVideoGenerator;
