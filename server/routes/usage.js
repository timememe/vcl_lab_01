import { Router } from 'express';
import {
  userQueries,
  activityQueries,
  usageLimitQueries,
  globalCreditsQueries,
  getTodayDate,
  transaction
} from '../database/db.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/api/usage', authMiddleware, (req, res) => {
  try {
    const today = getTodayDate();

    let globalCredits = globalCreditsQueries.get.get(today);
    if (!globalCredits) {
      globalCreditsQueries.upsert.run(today, 100, 0);
      globalCredits = globalCreditsQueries.get.get(today);
    }

    const categoryLimits = usageLimitQueries.getAllForDate.all(today);

    const categories = {};
    categoryLimits.forEach(limit => {
      categories[limit.category_id] = {
        dailyLimit: limit.daily_limit,
        used: limit.used
      };
    });

    res.json({
      date: today,
      categories,
      credits: {
        dailyLimit: globalCredits.daily_limit,
        used: globalCredits.used
      }
    });
  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/api/usage/limits', authMiddleware, adminMiddleware, (req, res) => {
  const { categories = {}, credits } = req.body || {};

  try {
    const today = getTodayDate();

    transaction(() => {
      Object.entries(categories).forEach(([categoryId, value]) => {
        const dailyLimit = Number(value?.dailyLimit);
        if (!Number.isFinite(dailyLimit) || dailyLimit < 0) {
          return;
        }

        const existing = usageLimitQueries.get.get(today, categoryId);
        const currentUsed = existing?.used || 0;

        usageLimitQueries.upsert.run(
          today,
          categoryId,
          dailyLimit,
          Math.min(currentUsed, dailyLimit || currentUsed)
        );
      });

      if (credits && typeof credits.dailyLimit !== 'undefined') {
        const limit = Number(credits.dailyLimit);
        if (Number.isFinite(limit) && limit >= 0) {
          globalCreditsQueries.setLimit.run(today, limit);
        }
      }
    })();

    const updated = usageLimitQueries.getAllForDate.all(today);
    const globalCredits = globalCreditsQueries.get.get(today);

    const categoriesResult = {};
    updated.forEach(limit => {
      categoriesResult[limit.category_id] = {
        dailyLimit: limit.daily_limit,
        used: limit.used
      };
    });

    res.json({
      date: today,
      categories: categoriesResult,
      credits: {
        dailyLimit: globalCredits.daily_limit,
        used: globalCredits.used
      }
    });
  } catch (error) {
    console.error('Update limits error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/api/usage/increment', authMiddleware, (req, res) => {
  const { categoryId, creditsUsed = 1, aiModel, metadata } = req.body || {};

  if (!categoryId) {
    return res.status(400).json({ message: 'categoryId is required.' });
  }

  const increment = Number(creditsUsed);
  if (!Number.isFinite(increment)) {
    return res.status(400).json({ message: 'creditsUsed must be a number.' });
  }

  try {
    const today = getTodayDate();
    const userId = req.user.id;

    const result = transaction(() => {
      // Check per-user daily credit limit
      const user = userQueries.findById.get(userId);
      if (user && user.daily_credit_limit > 0) {
        const userUsage = activityQueries.getUserDailyCreditsUsed.get(userId, today);
        const currentUserCredits = userUsage?.total_credits || 0;
        const tentativeUserCredits = currentUserCredits + increment;

        if (tentativeUserCredits > user.daily_credit_limit) {
          throw new Error('User daily credit limit exceeded');
        }
      }

      // Check and increment category limit
      const categoryLimit = usageLimitQueries.get.get(today, categoryId);

      if (categoryLimit && categoryLimit.daily_limit > 0) {
        const tentativeUsed = categoryLimit.used + increment;
        if (tentativeUsed > categoryLimit.daily_limit) {
          throw new Error('Category limit exceeded');
        }
      }

      // Check and increment global credits
      let globalCredits = globalCreditsQueries.get.get(today);
      if (!globalCredits) {
        globalCreditsQueries.upsert.run(today, 100, 0);
        globalCredits = globalCreditsQueries.get.get(today);
      }

      if (globalCredits.daily_limit > 0) {
        const tentativeCreditsUsed = globalCredits.used + increment;
        if (tentativeCreditsUsed > globalCredits.daily_limit) {
          throw new Error('Daily credits limit exceeded');
        }
      }

      // Increment counters
      usageLimitQueries.increment.run(today, categoryId, increment);
      globalCreditsQueries.increment.run(today, increment);

      // Log activity
      activityQueries.create.run(
        userId,
        categoryId,
        'generate',
        aiModel || 'unknown',
        increment,
        metadata ? JSON.stringify(metadata) : null
      );

      const updatedGlobal = globalCreditsQueries.get.get(today);
      return { global: updatedGlobal };
    })();

    const allCategories = usageLimitQueries.getAllForDate.all(today);
    const categoriesResult = {};
    allCategories.forEach(limit => {
      categoriesResult[limit.category_id] = {
        dailyLimit: limit.daily_limit,
        used: limit.used
      };
    });

    res.json({
      date: today,
      categories: categoriesResult,
      credits: {
        dailyLimit: result.global.daily_limit,
        used: result.global.used
      }
    });
  } catch (error) {
    if (error.message.includes('limit exceeded')) {
      return res.status(429).json({ message: error.message });
    }
    console.error('Increment usage error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/api/usage/reset', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const today = getTodayDate();

    transaction(() => {
      globalCreditsQueries.upsert.run(today, 100, 0);
      const categories = usageLimitQueries.getAllForDate.all(today);
      categories.forEach(cat => {
        usageLimitQueries.upsert.run(today, cat.category_id, cat.daily_limit, 0);
      });
    })();

    const globalCredits = globalCreditsQueries.get.get(today);
    const categoryLimits = usageLimitQueries.getAllForDate.all(today);

    const categoriesResult = {};
    categoryLimits.forEach(limit => {
      categoriesResult[limit.category_id] = {
        dailyLimit: limit.daily_limit,
        used: 0
      };
    });

    res.json({
      date: today,
      categories: categoriesResult,
      credits: {
        dailyLimit: globalCredits.daily_limit,
        used: 0
      }
    });
  } catch (error) {
    console.error('Reset usage error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Activity logs
router.get('/api/activity/logs', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = activityQueries.findAll.all(limit);

    res.json(logs.map(log => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null
    })));
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/api/activity/user/:userId', authMiddleware, (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const limit = parseInt(req.query.limit) || 50;
    const logs = activityQueries.findByUser.all(userId, limit);

    res.json(logs.map(log => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null
    })));
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Admin usage stats
router.get('/api/admin/usage/stats', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const date = req.query.date || getTodayDate();

    const userStats = activityQueries.getUserStatsByDate.all(date);
    const categoryStats = activityQueries.getCategoryStatsByDate.all(date);
    const globalCredits = globalCreditsQueries.get.get(date) || { daily_limit: 100, used: 0 };
    const categoryLimits = usageLimitQueries.getAllForDate.all(date);

    const limitsMap = {};
    categoryLimits.forEach(limit => {
      limitsMap[limit.category_id] = {
        dailyLimit: limit.daily_limit,
        used: limit.used
      };
    });

    const formattedUserStats = userStats.map(stat => ({
      userId: stat.user_id,
      username: stat.username,
      role: stat.role,
      totalRequests: stat.total_requests || 0,
      totalCredits: stat.total_credits || 0,
      lastActivity: stat.last_activity
    }));

    const formattedCategoryStats = categoryStats.map(stat => ({
      categoryId: stat.category_id,
      totalRequests: stat.total_requests,
      totalCredits: stat.total_credits,
      uniqueUsers: stat.unique_users,
      limit: limitsMap[stat.category_id] || { dailyLimit: 0, used: 0 }
    }));

    res.json({
      date,
      userStats: formattedUserStats,
      categoryStats: formattedCategoryStats,
      globalLimits: {
        dailyLimit: globalCredits.daily_limit,
        used: globalCredits.used,
        remaining: Math.max(0, globalCredits.daily_limit - globalCredits.used)
      }
    });
  } catch (error) {
    console.error('Get usage stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
