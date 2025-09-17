import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.API_PORT || 4000;

app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, 'data');
const usageFilePath = path.join(dataDir, 'usage.json');
const usersFilePath = path.join(dataDir, 'users.json');

const DEFAULT_USAGE = () => ({
  date: new Date().toISOString().slice(0, 10),
  categories: {},
  credits: {
    dailyLimit: 100,
    used: 0
  }
});

const DEFAULT_USERS = {
  users: [
    { username: 'admin', password: 'admin123', role: 'admin' },
    { username: 'user', password: 'user123', role: 'user' }
  ]
};

function ensureDataFile(filePath, defaultValue) {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    const initialValue = typeof defaultValue === 'function' ? defaultValue() : defaultValue;
    fs.writeFileSync(filePath, JSON.stringify(initialValue, null, 2), 'utf-8');
  }
}

ensureDataFile(usageFilePath, DEFAULT_USAGE);
ensureDataFile(usersFilePath, DEFAULT_USERS);

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function normaliseUsageRecord(data) {
  const today = new Date().toISOString().slice(0, 10);
  if (!data.date || data.date !== today) {
    const categories = Object.fromEntries(
      Object.entries(data.categories || {}).map(([key, value]) => [key, { ...value, used: 0 }])
    );
    const credits = {
      dailyLimit: data.credits?.dailyLimit ?? 100,
      used: 0
    };
    return {
      date: today,
      categories,
      credits
    };
  }

  return {
    date: data.date,
    categories: data.categories || {},
    credits: data.credits || { dailyLimit: 100, used: 0 }
  };
}

function getUsageData() {
  const stored = readJson(usageFilePath);
  const normalised = normaliseUsageRecord(stored);
  if (JSON.stringify(normalised) !== JSON.stringify(stored)) {
    writeJson(usageFilePath, normalised);
  }
  return normalised;
}

function saveUsageData(updater) {
  const current = getUsageData();
  const updated = updater({ ...current, categories: { ...current.categories } });
  writeJson(usageFilePath, updated);
  return updated;
}

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  const users = readJson(usersFilePath).users || [];
  const user = users.find((u) => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  res.json({ username: user.username, role: user.role });
});

app.get('/api/usage', (_req, res) => {
  const usage = getUsageData();
  res.json(usage);
});

app.post('/api/usage/limits', (req, res) => {
  const { categories = {}, credits } = req.body || {};

  const updated = saveUsageData((current) => {
    const nextCategories = { ...current.categories };

    Object.entries(categories).forEach(([categoryId, value]) => {
      const dailyLimit = Number(value?.dailyLimit);
      if (!Number.isFinite(dailyLimit) || dailyLimit < 0) {
        return;
      }
      const existing = nextCategories[categoryId] || { used: 0 };
      nextCategories[categoryId] = {
        dailyLimit,
        used: Math.min(existing.used ?? 0, dailyLimit || existing.used || 0)
      };
    });

    const nextCredits = { ...current.credits };
    if (credits && typeof credits.dailyLimit !== 'undefined') {
      const limit = Number(credits.dailyLimit);
      if (Number.isFinite(limit) && limit >= 0) {
        nextCredits.dailyLimit = limit;
        nextCredits.used = Math.min(nextCredits.used, limit || nextCredits.used || 0);
      }
    }

    return {
      ...current,
      categories: nextCategories,
      credits: nextCredits
    };
  });

  res.json(updated);
});

app.post('/api/usage/increment', (req, res) => {
  const { categoryId, creditsUsed = 1 } = req.body || {};

  if (!categoryId) {
    return res.status(400).json({ message: 'categoryId is required.' });
  }

  const increment = Number(creditsUsed);
  if (!Number.isFinite(increment)) {
    return res.status(400).json({ message: 'creditsUsed must be a number.' });
  }

  try {
    const updated = saveUsageData((current) => {
      const nextCategories = { ...current.categories };
      const categoryEntry = nextCategories[categoryId] || { dailyLimit: 0, used: 0 };

      const tentativeCategoryUsed = (categoryEntry.used || 0) + increment;
      if (increment >= 0 && categoryEntry.dailyLimit && tentativeCategoryUsed > categoryEntry.dailyLimit) {
        throw new Error('Category limit exceeded');
      }
      const finalCategoryUsed = Math.max(0, tentativeCategoryUsed);

      nextCategories[categoryId] = {
        dailyLimit: categoryEntry.dailyLimit || 0,
        used: finalCategoryUsed
      };

      const nextCredits = { ...current.credits };
      const tentativeCreditsUsed = (nextCredits.used || 0) + increment;
      if (increment >= 0 && nextCredits.dailyLimit && tentativeCreditsUsed > nextCredits.dailyLimit) {
        throw new Error('Daily credits limit exceeded');
      }
      const finalCreditsUsed = Math.max(0, tentativeCreditsUsed);

      nextCredits.used = finalCreditsUsed;

      return {
        ...current,
        categories: nextCategories,
        credits: nextCredits
      };
    });

    res.json(updated);
  } catch (error) {
    res.status(429).json({ message: error instanceof Error ? error.message : 'Usage limit exceeded.' });
  }
});

app.post('/api/usage/reset', (_req, res) => {
  const reset = DEFAULT_USAGE();
  writeJson(usageFilePath, reset);
  res.json(reset);
});

app.listen(PORT, () => {
  console.log('Usage API server listening on port ' + PORT);
});
