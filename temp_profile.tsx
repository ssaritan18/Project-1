import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform, DevSettings, Switch } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from "../../src/context/AuthContext";
import { useTasks } from "../../src/context/TasksContext";
import { ProgressBar } from "../../src/components/ProgressBar";
import { useStreak } from "../../src/hooks/useStreak";
import { useFocusEffect } from "@react-navigation/native";
import { makeBackup, restoreBackup, resetAll } from "../../src/utils/backup";
import { router } from "expo-router";
import { useRuntimeConfig } from "../../src/context/RuntimeConfigContext";
import { api } from "../../src/lib/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

// New ADHD-friendly components
import { AchievementBadge } from "../../src/components/AchievementBadge";
import { StreakVisualization } from "../../src/components/StreakVisualization";
import { ProfileStatistics } from "../../src/components/ProfileStatistics";
import { ProfileCompletionGuide } from "../../src/components/ProfileCompletionGuide";
import NeurodivergencyContent from "../../src/components/NeurodivergencyContent";
import { useAchievements } from "../../src/hooks/useAchievements";
import { useSubscription, getSubscriptionStatusDisplay } from "../../src/context/SubscriptionContext";
import AssessmentFollowupContent from "../../src/components/AssessmentFollowupContent";
import { DevTools } from "../../src/components/DevTools";
import { MockRewardedAdButton } from "../../src/components/MockRewardedAdButton";
import ProfileEditModal from "../../src/components/ProfileEditModal";

const PRESETS = [
  { primary: "#A3C9FF", secondary: "#FFCFE1", accent: "#B8F1D9" },
  { primary: "#FFB3BA", secondary: "#BAE1FF", accent: "#BFFCC6" },
  { primary: "#F6C5FF", secondary: "#C9F7F5", accent: "#FFE3A3" },
];

export default function ProfileScreen() {
  console.log("🏠 ProfileScreen rendering with ADHD-friendly enhancements...");
  const { user, signOut, palette, setPalette, token } = useAuth();
  const { syncEnabled, setSyncEnabled, wsEnabled, setWsEnabled } = useRuntimeConfig();
  const { subscription } = useSubscription();
  const insets = useSafeAreaInsets();
  const { tasks } = useTasks();
  const { streak, refresh } = useStreak();
  const { achievements, getCompletionStats, getAchievementsByCategory } = useAchievements();
  
  // UI State
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'stats' | 'completion' | 'neurodivergency' | 'journey'>('overview');
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState(user);
  
  // Profile data state (synced with edit profile)
  const [profileData, setProfileData] = useState({
    profile_image: null as string | null,
    name: user?.name || 'You',
    bio: user?.bio || ''
  });
  
  const total = tasks.reduce((a, t) => a + t.goal, 0);
  const done = tasks.reduce((a, t) => a + t.progress, 0);
  const ratio = total ? done / total : 0;

  useFocusEffect(React.useCallback(() => { refresh(); }, [refresh]));
  
  // Load profile data from localStorage when screen focuses
  useFocusEffect(React.useCallback(() => {
    const loadProfileData = async () => {
      try {
        console.log('📂 Loading profile data from localStorage...');
        const savedProfile = localStorage.getItem('profile_data');
        if (savedProfile) {
          const parsedProfile = JSON.parse(savedProfile);
          console.log('✅ Profile data loaded:', {
            name: parsedProfile.name,
            hasProfileImage: parsedProfile.profile_image ? 'YES' : 'NO'
          });
          setProfileData({
            profile_image: parsedProfile.profile_image || null,
            name: parsedProfile.name || user?.name || 'You',
            bio: parsedProfile.bio || user?.bio || ''
          });
        } else {
          console.log('📂 No profile data in localStorage');
        }
      } catch (error) {
        console.error('❌ Failed to load profile data:', error);
      }
    };
    
    loadProfileData();
  }, [user]));
  
  const navigateToEdit = () => {
    console.log('🎯 navigateToEdit called - attempting to navigate to /profile/edit');
    
    try {
      // Use router.push for both web and native - Expo Router handles this properly
      router.push('/profile/edit');
      console.log('✅ router.push called successfully');
    } catch (error) {
      console.error('❌ router.push failed:', error);
      // Fallback for web environments
      if (typeof window !== 'undefined') {
        console.log('🌐 Fallback: using window.location.href');
        window.location.href = '/profile/edit';
      }
    }
  };

  const handleProfileUpdated = (updatedUser: any) => {
    setCurrentUserProfile(updatedUser);
    // Optionally update the auth context as well
    // setPalette(updatedUser.palette || palette);
  };

  const navigateToSettings = () => {
      router.push('/profile/settings');
  };


  const navigateToAdminPanel = () => {
      console.log("🔒 navigateToAdminPanel called - attempting to navigate to /admin/reports");
      try {
          router.push("/admin/reports");
          console.log("✅ Admin Panel navigation successful");
      } catch (error) {
          console.error("❌ Admin Panel navigation failed:", error);
          Alert.alert("Navigation Error", "Could not navigate to Admin Panel. Please try again.");
      }
  };

  const navigateToDeleteAccount = () => {
      console.log('🗑️ navigateToDeleteAccount called - attempting to navigate to /delete-account');
      try {
          router.push('/delete-account');
          console.log('✅ Delete Account navigation successful');
      } catch (error) {
          console.error('❌ Delete Account navigation failed:', error);
          Alert.alert("Navigation Error", "Could not navigate to Delete Account page. Please try again.");
      }
  };

  const navigateToPrivacyPolicy = () => {
      console.log('📋 navigateToPrivacyPolicy called - attempting to navigate to /privacy-policy');
      alert('Privacy Policy button clicked!'); // Debug alert
      try {
          router.push('/privacy-policy');
          console.log('✅ Privacy Policy navigation successful');
      } catch (error) {
          console.error('❌ Privacy Policy navigation failed:', error);
          Alert.alert("Navigation Error", "Could not navigate to Privacy Policy page. Please try again.");
      }
  };

  const onBackup = async () => { try { await makeBackup(); } catch { Alert.alert("Backup failed", "Could not create backup file."); } };
  const onRestore = async () => {
    try {
      const ok = await restoreBackup();
      if (ok) { Alert.alert("Restored", "Data restored. The app will reload now.", [ { text: "OK", onPress: () => { try { DevSettings.reload(); } catch {} } } ]); }
      else { Alert.alert("Cancelled", "No file selected."); }
    } catch { Alert.alert("Restore failed", "Invalid file or read error."); }
  };
  const onReset = async () => { Alert.alert("Reset all data?", "This will clear tasks, chats, friends, posts, and theme.", [ { text: "Cancel", style: "cancel" }, { text: "Reset", style: "destructive", onPress: async () => { await resetAll(); Alert.alert("Cleared", "Local data has been removed"); } } ]); };

  const onToggleSync = async (v: boolean) => {
    if (v) {
      await setSyncEnabled(true);
      if (!token) {
        Alert.alert("Online mode enabled", "Please log in (online) to sync.", [
          { text: "Later", style: "cancel" },
          { text: "Log In", onPress: () => router.push('/(auth)/login') }
        ]);
      }
    } else {
      await setSyncEnabled(false);
      Alert.alert("Local mode", "App is now running offline (local-only)");
    }
  };

  const seedDemo = async () => {
    if (!syncEnabled || !token) {
      Alert.alert("Enable Online mode", "Turn on Sync Mode and log in online to seed demo users.");
      return;
    }
    try {
      const res = await api.post("/dev/seed-demo");
      const users = res.data?.users || [];
      const lines = users.map((u: any) => `${u.name} — ${u.email} / ${u.password}`).join("\n");
      Alert.alert("Demo users seeded", lines || "Seed complete.");
    } catch (e: any) {
      Alert.alert("Seed failed", e?.response?.data?.detail || "Please try again.");
    }
  };

  // Achievement and stats data
  const completionStats = getCompletionStats();
  const recentAchievements = achievements.filter(a => a.unlocked).slice(-4);

  // Enhanced stats with backend integration
  const [backendStats, setBackendStats] = useState<any>(null);
  const [streakData, setStreakData] = useState<any>(null);
  const [pointsData, setPointsData] = useState<any>(null);

  // Fetch backend data
  useEffect(() => {
    const fetchBackendData = async () => {
      if (syncEnabled && token) {
        try {
          // Fetch user statistics
          const statsResponse = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/user/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (statsResponse.ok) {
            setBackendStats(await statsResponse.json());
          }

          // Fetch streak data
          const streakResponse = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/user/streak`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (streakResponse.ok) {
            setStreakData(await streakResponse.json());
          }

          // Fetch points data
          const pointsResponse = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/user/points`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (pointsResponse.ok) {
            setPointsData(await pointsResponse.json());
          }
        } catch (error) {
          console.error('Failed to fetch backend data:', error);
        }
      }
    };

    fetchBackendData();
  }, [syncEnabled, token]);

  // Use backend data or fallback to mock data
  const currentStreak = streakData?.current_streak || streak;
  const bestStreak = streakData?.best_streak || Math.max(streak, 8);
  const totalPoints = pointsData?.total_points || completionStats.totalPoints;
  const currentLevel = pointsData?.level || Math.floor(completionStats.totalPoints / 100) + 1;

  const weeklyStats = backendStats ? [
    { label: "Tasks", value: backendStats.weekly_stats.tasks, maxValue: backendStats.weekly_stats.tasks + 5, color: "#00C851", emoji: "✅", subtitle: "This week" },
    { label: "Streak", value: backendStats.weekly_stats.streak_days, maxValue: 7, color: "#FF6B35", emoji: "🔥", subtitle: "Current" },
    { label: "Friends", value: backendStats.weekly_stats.friends_made, maxValue: 5, color: "#6C5CE7", emoji: "👥", subtitle: "New friends" },
    { label: "Posts", value: backendStats.weekly_stats.posts, maxValue: 10, color: "#4A90E2", emoji: "📝", subtitle: "Shared" },
  ] : [
    { label: "Tasks", value: done, maxValue: total, color: "#00C851", emoji: "✅", subtitle: "This week" },
    { label: "Streak", value: currentStreak, maxValue: 7, color: "#FF6B35", emoji: "🔥", subtitle: "Current" },
    { label: "Friends", value: 5, maxValue: 10, color: "#6C5CE7", emoji: "👥", subtitle: "Active" },
    { label: "Posts", value: 3, maxValue: 5, color: "#4A90E2", emoji: "📝", subtitle: "Shared" },
  ];

  const monthlyStats = backendStats ? [
    { label: "Tasks", value: backendStats.monthly_stats.tasks, maxValue: backendStats.monthly_stats.tasks + 20, color: "#00C851", emoji: "✅", subtitle: "This month" },
    { label: "Best Streak", value: bestStreak, maxValue: 30, color: "#FF6B35", emoji: "🏆", subtitle: "Personal best" },
    { label: "Friends", value: backendStats.monthly_stats.friends_made, maxValue: 20, color: "#6C5CE7", emoji: "👥", subtitle: "Total" },
    { label: "Posts", value: backendStats.monthly_stats.posts, maxValue: 30, color: "#4A90E2", emoji: "📝", subtitle: "Monthly" },
  ] : [
    { label: "Tasks", value: done * 4, maxValue: total * 4, color: "#00C851", emoji: "✅", subtitle: "This month" },
    { label: "Best Streak", value: bestStreak, maxValue: 30, color: "#FF6B35", emoji: "🏆", subtitle: "Personal best" },
    { label: "Friends", value: 8, maxValue: 20, color: "#6C5CE7", emoji: "👥", subtitle: "Total" },
    { label: "Posts", value: 12, maxValue: 20, color: "#4A90E2", emoji: "📝", subtitle: "Monthly" },
  ];

  // Profile completion items
  const completionItems = [
    {
      id: 'profile_pic',
      title: 'Add Profile Picture',
      description: 'Upload a photo to personalize your profile',
      emoji: '📸',
      completed: !!user?.profile_image,
      reward: { points: 50, badge: '📸', description: 'Picture Perfect badge unlocked!' },
      action: navigateToEdit
    },
    {
      id: 'bio',
      title: 'Write Your Bio',
      description: 'Tell the community about your ADHD journey',
      emoji: '✍️',
      completed: !!user?.bio,
      reward: { points: 75, badge: '✍️', description: 'Storyteller badge unlocked!' },
      action: navigateToEdit
    },
    {
      id: 'first_task',
      title: 'Complete First Task',
      description: 'Mark your first task as complete',
      emoji: '✅',
      completed: done > 0,
      reward: { points: 100, badge: '🎯', description: 'Task Master badge unlocked!' },
    },
    {
      id: 'friend',
      title: 'Make a Friend',
      description: 'Connect with someone in the community',
      emoji: '🤝',
      completed: Math.random() > 0.5, // Mock completion
      reward: { points: 100, badge: '🤝', description: 'Social Butterfly badge unlocked!' },
    },
    {
      id: 'streak',
      title: 'Start Your Streak',
      description: 'Complete tasks for 3 days in a row',
      emoji: '🔥',
      completed: streak >= 3,
      reward: { points: 200, badge: '🔥', description: 'Streak Starter badge unlocked!' },
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'achievements':
        return (
          <View style={styles.modernTabContent}>
            <LinearGradient
              colors={['rgba(255, 60, 172, 0.1)', 'rgba(168, 85, 247, 0.1)', 'rgba(139, 92, 246, 0.1)']}
              style={styles.modernCard}
            >
              <Text style={styles.modernSectionTitle}>🏆 Achievement Gallery</Text>
              <View style={styles.achievementGrid}>
                {achievements.map((achievement, index) => (
                  <AchievementBadge
                    key={achievement.id}
                    achievement={achievement}
                    size="medium"
                    showUnlockAnimation={false}
                    onPress={() => Alert.alert(achievement.name, achievement.description)}
                  />
                ))}
              </View></TouchableOpacity>
              <Text style={styles.modernAchievementSummary}>
                🎯 {completionStats.unlocked}/{completionStats.total} unlocked • {totalPoints.toLocaleString()} points earned
              </Text>
            </LinearGradient>
          </View></TouchableOpacity>
        );
      case 'stats':
        return (
          <View style={styles.modernTabContent}>
            <LinearGradient
              colors={['rgba(74, 144, 226, 0.1)', 'rgba(108, 92, 231, 0.1)']}
              style={styles.modernCard}
            >
              <ProfileStatistics
                weeklyStats={weeklyStats}
                monthlyStats={monthlyStats}
                totalStats={{
                  tasksCompleted: done,
                  communityPosts: 3,
                  friendsCount: 5,
                  achievementsUnlocked: completionStats.unlocked
                }}
              />
              
              {/* Rewarded Ad for Extra Points */}
              <MockRewardedAdButton
                onRewardEarned={(amount, type) => {
                  console.log(`🎁 User earned ${amount} ${type} from ad!`);
                  // Here you could add points to user's account
                }}
                rewardDescription="Watch ad to earn 50 bonus points!"
                buttonText="🎁 Watch Ad for 50 Points"
                style={{ marginTop: 20 }}
              />
            </LinearGradient>
          </View></TouchableOpacity>
        );
      case 'completion':
        return (
          <View style={styles.modernTabContent}>
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.1)', 'rgba(168, 85, 247, 0.1)']}
              style={styles.modernCard}
            >
              <ProfileCompletionGuide
                completionItems={completionItems}
                onItemPress={(item) => {
                  if (item.action) {
                    item.action();
                  } else {
                    Alert.alert("Great idea!", `Let's work on: ${item.title}`);
                  }
                }}
                showAnimation={false}
              />
            </LinearGradient>
          </View></TouchableOpacity>
        );
      case 'neurodivergency':
        return (
          <View style={styles.modernTabContent}>
            <LinearGradient
              colors={['rgba(183, 75, 255, 0.1)', 'rgba(255, 60, 172, 0.1)']}
              style={styles.modernCard}
            >
              <NeurodivergencyContent
                showFullContent={true}
                onPress={() => Alert.alert('Neurodivergency Hub', 'Educational content coming soon!')}
              />
            </LinearGradient>
          </View></TouchableOpacity>
        );
      case 'journey':
        // Mock assessment result for now - in real app this would come from user data
        const mockAssessmentResult = {
          overall_score: 75,
          categories: {
            attention: 82,
            hyperactivity: 45,
            organization: 78,
            emotional: 65,
            social: 58,
          },
          recommendations: [
            "🎯 Try the Pomodoro technique for better focus",
            "📱 Use our Focus Mode features during work sessions",
            "📋 Use our task management system daily",
            "💚 Practice emotional regulation techniques",
            "🏆 Use our achievement system to build positive habits",
          ],
          adhd_type: 'combined' as const,
        };

        return (
          <View style={styles.modernTabContent}>
            <AssessmentFollowupContent
              assessmentResult={mockAssessmentResult}
              language="en"
            />
          </View></TouchableOpacity>
        );
      default:
        return (
          <View style={styles.modernTabContent}>
            {/* Enhanced Streak Visualization with Glow Card */}
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.15)', 'rgba(236, 72, 153, 0.15)']}
              style={styles.modernCard}
            >
              <StreakVisualization
                streak={currentStreak}
                bestStreak={bestStreak}
                onPress={() => Alert.alert("Streak Info", "Keep going! Every day counts towards building your habits.")}
                showAnimation={false}
              />
            </LinearGradient>

            {/* Recent Achievements with Glow Design */}
            <LinearGradient
              colors={['rgba(168, 85, 247, 0.1)', 'rgba(139, 92, 246, 0.1)']}
              style={[styles.modernCard, { marginTop: 16 }]}
            >
              <Text style={styles.modernSectionTitle}>🎉 Recent Achievements</Text>
              {recentAchievements.length > 0 ? (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.achievementScrollContainer}
                >
                  <View style={styles.achievementRow}>
                    {recentAchievements.map((achievement) => (
                      <AchievementBadge
                        key={achievement.id}
                        achievement={achievement}
                        size="medium"
                        showUnlockAnimation={false}
                      />
                    ))}
                  </View></TouchableOpacity>
                </ScrollView>
              ) : (
                <Text style={styles.modernEmptyText}>Complete tasks to unlock achievements! 🎯</Text>
              )}
            </LinearGradient>

            {/* Glow Quick Stats */}
            <LinearGradient
              colors={['rgba(249, 115, 22, 0.1)', 'rgba(236, 72, 153, 0.1)']}
              style={[styles.modernCard, { marginTop: 16 }]}
            >
              <Text style={styles.modernSectionTitle}>📊 Quick Stats</Text>
              <View style={styles.modernQuickStats}>
                <LinearGradient colors={['#8B5CF6', '#A855F7']} style={styles.modernStatCard}>
                  <Text style={styles.modernStatEmoji}>✅</Text>
                  <Text style={styles.modernStatValue}>{done}</Text>
                  <Text style={styles.modernStatLabel}>Tasks Done</Text>
                </LinearGradient>
                <LinearGradient colors={['#EC4899', '#F97316']} style={styles.modernStatCard}>
                  <Text style={styles.modernStatEmoji}>🏆</Text>
                  <Text style={styles.modernStatValue}>{completionStats.unlocked}</Text>
                  <Text style={styles.modernStatLabel}>Badges</Text>
                </LinearGradient>
                <LinearGradient colors={['#F97316', '#FBBF24']} style={styles.modernStatCard}>
                  <Text style={styles.modernStatEmoji}>⭐</Text>
                  <Text style={styles.modernStatValue}>{totalPoints}</Text>
                  <Text style={styles.modernStatLabel}>Points</Text>
                </LinearGradient>
              </View></TouchableOpacity>
            </LinearGradient>

            {/* Glow Quick Actions */}
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.1)', 'rgba(168, 85, 247, 0.1)']}
              style={[styles.modernCard, { marginTop: 16 }]}
            >
              <Text style={styles.modernSectionTitle}>⚡ Quick Actions</Text>
              <View style={styles.modernActionGrid}>
                <TouchableOpacity onPress={navigateToEdit}>
                  <LinearGradient colors={['#8B5CF6', '#A855F7']} style={styles.modernActionBtn}>
                    <Text style={styles.modernActionEmoji}>✏️</Text>
                    <Text style={styles.modernActionText}>Edit Profile</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => {alert("Privacy Policy CLICKED!"); try{router.push("/privacy-policy");}catch(e){console.error(e);}}}>
                  <LinearGradient colors={["#059669", "#047857"]} style={styles.modernActionBtn}>
                    <Text style={styles.modernActionEmoji}>📋</Text>
                    <Text style={styles.modernActionText}>Privacy Policy</Text>
                  </LinearGradient>
                </TouchableOpacity>
