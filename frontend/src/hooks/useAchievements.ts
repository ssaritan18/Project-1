import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TasksContext';

export type Achievement = {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
  unlockedAt?: string;
  category: 'streak' | 'community' | 'tasks' | 'profile';
  condition: (data: any) => { unlocked: boolean; progress?: number; maxProgress?: number };
  reward: {
    points: number;
    badge: string;
    description: string;
  };
};

// ADHD-friendly achievement definitions
const ACHIEVEMENTS: Omit<Achievement, 'unlocked' | 'progress' | 'unlockedAt'>[] = [
  // Streak Achievements
  {
    id: 'first_day',
    name: 'First Step',
    icon: '🌱',
    description: 'Complete your first day of tasks',
    category: 'streak',
    condition: (data) => ({
      unlocked: data.currentStreak >= 1,
      progress: Math.min(data.currentStreak, 1),
      maxProgress: 1
    }),
    reward: {
      points: 50,
      badge: 'Starter',
      description: 'Every journey begins with a single step!'
    }
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    icon: '⚔️',
    description: 'Maintain a 7-day streak',
    category: 'streak',
    condition: (data) => ({
      unlocked: data.currentStreak >= 7,
      progress: Math.min(data.currentStreak, 7),
      maxProgress: 7
    }),
    reward: {
      points: 200,
      badge: 'Consistent',
      description: 'One week of consistency - you\'re building a habit!'
    }
  },
  {
    id: 'month_master',
    name: 'Monthly Master',
    icon: '👑',
    description: 'Achieve a 30-day streak',
    category: 'streak',
    condition: (data) => ({
      unlocked: data.currentStreak >= 30,
      progress: Math.min(data.currentStreak, 30),
      maxProgress: 30
    }),
    reward: {
      points: 1000,
      badge: 'Master',
      description: 'A month of dedication - you\'re unstoppable!'
    }
  },
  {
    id: 'streak_legend',
    name: 'Streak Legend',
    icon: '🏆',
    description: 'Reach a 100-day streak',
    category: 'streak',
    condition: (data) => ({
      unlocked: data.currentStreak >= 100,
      progress: Math.min(data.currentStreak, 100),
      maxProgress: 100
    }),
    reward: {
      points: 5000,
      badge: 'Legend',
      description: '100 days! You\'ve mastered the art of consistency!'
    }
  },

  // Task Achievements
  {
    id: 'task_starter',
    name: 'Task Starter',
    icon: '✅',
    description: 'Complete your first 10 tasks',
    category: 'tasks',
    condition: (data) => ({
      unlocked: data.totalTasksCompleted >= 10,
      progress: Math.min(data.totalTasksCompleted, 10),
      maxProgress: 10
    }),
    reward: {
      points: 100,
      badge: 'Achiever',
      description: 'You\'re getting things done!'
    }
  },
  {
    id: 'task_champion',
    name: 'Task Champion',
    icon: '🎯',
    description: 'Complete 100 total tasks',
    category: 'tasks',
    condition: (data) => ({
      unlocked: data.totalTasksCompleted >= 100,
      progress: Math.min(data.totalTasksCompleted, 100),
      maxProgress: 100
    }),
    reward: {
      points: 500,
      badge: 'Champion',
      description: '100 tasks completed - you\'re a productivity champion!'
    }
  },
  {
    id: 'perfect_day',
    name: 'Perfect Day',
    icon: '⭐',
    description: 'Complete all tasks in a single day',
    category: 'tasks',
    condition: (data) => ({
      unlocked: data.perfectDays >= 1,
      progress: Math.min(data.perfectDays, 1),
      maxProgress: 1
    }),
    reward: {
      points: 150,
      badge: 'Perfectionist',
      description: 'A perfect day - all tasks completed!'
    }
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    icon: '🐦',
    description: 'Complete a task before 9 AM',
    category: 'tasks',
    condition: (data) => ({
      unlocked: data.earlyBirdTasks >= 1,
      progress: Math.min(data.earlyBirdTasks, 1),
      maxProgress: 1
    }),
    reward: {
      points: 75,
      badge: 'Early Bird',
      description: 'Starting the day right - morning productivity!'
    }
  },

  // Community Achievements
  {
    id: 'first_post',
    name: 'Community Voice',
    icon: '📢',
    description: 'Share your first community post',
    category: 'community',
    condition: (data) => ({
      unlocked: data.communityPosts >= 1,
      progress: Math.min(data.communityPosts, 1),
      maxProgress: 1
    }),
    reward: {
      points: 100,
      badge: 'Contributor',
      description: 'Thank you for sharing with the community!'
    }
  },
  {
    id: 'community_helper',
    name: 'Community Helper',
    icon: '🤝',
    description: 'Make 10 friends in the community',
    category: 'community',
    condition: (data) => ({
      unlocked: data.friendsCount >= 10,
      progress: Math.min(data.friendsCount, 10),
      maxProgress: 10
    }),
    reward: {
      points: 300,
      badge: 'Helper',
      description: 'Building connections and helping others!'
    }
  },
  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    icon: '🦋',
    description: 'React to 25 community posts',
    category: 'community',
    condition: (data) => ({
      unlocked: data.reactionsGiven >= 25,
      progress: Math.min(data.reactionsGiven, 25),
      maxProgress: 25
    }),
    reward: {
      points: 200,
      badge: 'Supporter',
      description: 'Spreading positivity throughout the community!'
    }
  },

  // Profile Achievements
  {
    id: 'profile_complete',
    name: 'Profile Master',
    icon: '👤',
    description: 'Complete your entire profile',
    category: 'profile',
    condition: (data) => ({
      unlocked: data.profileCompletion >= 100,
      progress: data.profileCompletion,
      maxProgress: 100
    }),
    reward: {
      points: 150,
      badge: 'Complete',
      description: 'Your profile is looking great!'
    }
  },
  {
    id: 'first_photo',
    name: 'Picture Perfect',
    icon: '📸',
    description: 'Upload your first profile picture',
    category: 'profile',
    condition: (data) => ({
      unlocked: data.hasProfilePicture,
      progress: data.hasProfilePicture ? 1 : 0,
      maxProgress: 1
    }),
    reward: {
      points: 50,
      badge: 'Photogenic',
      description: 'Looking good! Profile picture uploaded.'
    }
  },
];

export function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlockedToday, setUnlockedToday] = useState<Achievement[]>([]);
  const { user } = useAuth();
  const { tasks } = useTasks();

  // Calculate user statistics for achievement conditions
  const calculateUserStats = () => {
    // Mock data - in real app, this would come from various sources
    const today = new Date().toDateString();
    const currentStreak = 5; // This would come from streak hook
    const totalTasksCompleted = tasks.reduce((sum, task) => sum + task.progress, 0);
    const totalTasks = tasks.reduce((sum, task) => sum + task.goal, 0);
    const todaysTasks = tasks.filter(task => task.progress > 0).length;
    const perfectDays = totalTasks > 0 && totalTasksCompleted === totalTasks ? 1 : 0;
    
    return {
      currentStreak,
      totalTasksCompleted,
      perfectDays,
      earlyBirdTasks: Math.floor(Math.random() * 3), // Mock early bird tasks
      communityPosts: Math.floor(Math.random() * 5), // Mock community posts
      friendsCount: Math.floor(Math.random() * 8), // Mock friends count
      reactionsGiven: Math.floor(Math.random() * 15), // Mock reactions
      profileCompletion: user?.name ? 80 : 60, // Mock profile completion
      hasProfilePicture: !!user?.profilePicture || Math.random() > 0.5, // Mock profile picture
    };
  };

  // Check and update achievements
  const checkAchievements = () => {
    const userStats = calculateUserStats();
    const newlyUnlocked: Achievement[] = [];
    
    const updatedAchievements = ACHIEVEMENTS.map(achievementDef => {
      const condition = achievementDef.condition(userStats);
      const existingAchievement = achievements.find(a => a.id === achievementDef.id);
      
      const achievement: Achievement = {
        ...achievementDef,
        unlocked: condition.unlocked,
        progress: condition.progress,
        unlockedAt: existingAchievement?.unlockedAt || 
          (condition.unlocked && !existingAchievement?.unlocked ? new Date().toISOString() : undefined)
      };
      
      // Check if this is newly unlocked
      if (condition.unlocked && (!existingAchievement || !existingAchievement.unlocked)) {
        newlyUnlocked.push(achievement);
      }
      
      return achievement;
    });
    
    setAchievements(updatedAchievements);
    
    // Update today's unlocked achievements
    if (newlyUnlocked.length > 0) {
      setUnlockedToday(prev => [...prev, ...newlyUnlocked]);
    }
  };

  useEffect(() => {
    checkAchievements();
  }, [tasks, user]);

  // Get achievements by category
  const getAchievementsByCategory = (category: Achievement['category']) => {
    return achievements.filter(a => a.category === category);
  };

  // Get completion stats
  const getCompletionStats = () => {
    const total = achievements.length;
    const unlocked = achievements.filter(a => a.unlocked).length;
    const totalPoints = achievements
      .filter(a => a.unlocked)
      .reduce((sum, a) => sum + a.reward.points, 0);
    
    return {
      total,
      unlocked,
      percentage: total > 0 ? Math.round((unlocked / total) * 100) : 0,
      totalPoints,
      remainingPoints: achievements
        .filter(a => !a.unlocked)
        .reduce((sum, a) => sum + a.reward.points, 0)
    };
  };

  // Clear today's unlocked (for testing/reset)
  const clearTodaysUnlocked = () => {
    setUnlockedToday([]);
  };

  return {
    achievements,
    unlockedToday,
    getAchievementsByCategory,
    getCompletionStats,
    clearTodaysUnlocked,
    checkAchievements,
  };
}