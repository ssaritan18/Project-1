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

// New ADHD-friendly components
import { AchievementBadge } from "../../src/components/AchievementBadge";
import { StreakVisualization } from "../../src/components/StreakVisualization";
import { ProfileStatistics } from "../../src/components/ProfileStatistics";
import { ProfileCompletionGuide } from "../../src/components/ProfileCompletionGuide";
import NeurodivergencyContent from "../../src/components/NeurodivergencyContent";
import { useAchievements } from "../../src/hooks/useAchievements";
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
  const insets = useSafeAreaInsets();
  const { tasks } = useTasks();
  const { streak, refresh } = useStreak();
  const { achievements, getCompletionStats, getAchievementsByCategory } = useAchievements();
  
  // UI State
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'stats' | 'completion' | 'neurodivergency'>('overview');
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
              colors={['rgba(255, 60, 172, 0.1)', 'rgba(183, 75, 255, 0.1)', 'rgba(0, 207, 255, 0.1)']}
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
              </View>
              <Text style={styles.modernAchievementSummary}>
                🎯 {completionStats.unlocked}/{completionStats.total} unlocked • {totalPoints.toLocaleString()} points earned
              </Text>
            </LinearGradient>
          </View>
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
            </LinearGradient>
          </View>
        );
      case 'completion':
        return (
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
        );
      case 'neurodivergency':
        return (
          <NeurodivergencyContent
            showFullContent={true}
            onPress={() => Alert.alert('Neurodivergency Hub', 'Educational content coming soon!')}
          />
        );
      default:
        return (
          <View style={styles.modernTabContent}>
            {/* Enhanced Streak Visualization with Modern Card */}
            <LinearGradient
              colors={['rgba(255, 107, 53, 0.15)', 'rgba(255, 60, 172, 0.15)']}
              style={styles.modernCard}
            >
              <StreakVisualization
                streak={currentStreak}
                bestStreak={bestStreak}
                onPress={() => Alert.alert("Streak Info", "Keep going! Every day counts towards building your habits.")}
                showAnimation={false}
              />
            </LinearGradient>

            {/* Recent Achievements with Modern Design */}
            <LinearGradient
              colors={['rgba(183, 75, 255, 0.1)', 'rgba(0, 207, 255, 0.1)']}
              style={[styles.modernCard, { marginTop: 16 }]}
            >
              <Text style={styles.modernSectionTitle}>🎉 Recent Achievements</Text>
              {recentAchievements.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.achievementRow}>
                    {recentAchievements.map((achievement) => (
                      <AchievementBadge
                        key={achievement.id}
                        achievement={achievement}
                        size="small"
                        showUnlockAnimation={false}
                      />
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <Text style={styles.modernEmptyText}>Complete tasks to unlock achievements! 🎯</Text>
              )}
            </LinearGradient>

            {/* Modern Quick Stats */}
            <LinearGradient
              colors={['rgba(255, 179, 71, 0.1)', 'rgba(255, 60, 172, 0.1)']}
              style={[styles.modernCard, { marginTop: 16 }]}
            >
              <Text style={styles.modernSectionTitle}>📊 Quick Stats</Text>
              <View style={styles.modernQuickStats}>
                <LinearGradient colors={['#00C851', '#00A844']} style={styles.modernStatCard}>
                  <Text style={styles.modernStatEmoji}>✅</Text>
                  <Text style={styles.modernStatValue}>{done}</Text>
                  <Text style={styles.modernStatLabel}>Tasks Done</Text>
                </LinearGradient>
                <LinearGradient colors={['#FF6B35', '#FF8C42']} style={styles.modernStatCard}>
                  <Text style={styles.modernStatEmoji}>🏆</Text>
                  <Text style={styles.modernStatValue}>{completionStats.unlocked}</Text>
                  <Text style={styles.modernStatLabel}>Badges</Text>
                </LinearGradient>
                <LinearGradient colors={['#FFB347', '#FFC77D']} style={styles.modernStatCard}>
                  <Text style={styles.modernStatEmoji}>⭐</Text>
                  <Text style={styles.modernStatValue}>{totalPoints}</Text>
                  <Text style={styles.modernStatLabel}>Points</Text>
                </LinearGradient>
              </View>
            </LinearGradient>

            {/* Modern Quick Actions */}
            <LinearGradient
              colors={['rgba(108, 92, 231, 0.1)', 'rgba(74, 144, 226, 0.1)']}
              style={[styles.modernCard, { marginTop: 16 }]}
            >
              <Text style={styles.modernSectionTitle}>⚡ Quick Actions</Text>
              <View style={styles.modernActionGrid}>
                <TouchableOpacity onPress={navigateToEdit}>
                  <LinearGradient colors={['#4A90E2', '#5BA0F2']} style={styles.modernActionBtn}>
                    <Text style={styles.modernActionEmoji}>✏️</Text>
                    <Text style={styles.modernActionText}>Edit Profile</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={navigateToSettings}>
                  <LinearGradient colors={['#6C5CE7', '#7C6CF7']} style={styles.modernActionBtn}>
                    <Text style={styles.modernActionEmoji}>⚙️</Text>
                    <Text style={styles.modernActionText}>Settings</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Modern Advanced Controls */}
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
              style={[styles.modernCard, { marginTop: 16 }]}
            >
              <Text style={styles.modernSectionTitle}>🔧 Advanced</Text>
              <View style={styles.modernSyncRow}>
                <Text style={styles.modernSyncLabel}>Sync: {syncEnabled ? 'Online' : 'Local'}</Text>
                <Switch value={syncEnabled} onValueChange={onToggleSync} />
              </View>
              <View style={styles.modernSyncRow}>
                <Text style={styles.modernSyncLabel}>WebSocket: {wsEnabled ? 'On' : 'Off'}</Text>
                <Switch value={wsEnabled} onValueChange={setWsEnabled} />
              </View>
            </LinearGradient>
          </View>
        );    }
  };

  return (
    <View style={[styles.container, { paddingTop: 0 }]}>
      {/* Modern Gradient Header - Behance Inspired */}
      <LinearGradient
        colors={['#FF3CAC', '#B74BFF', '#00CFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientHeader, { paddingTop: insets.top + 20 }]}
      >
        {/* Profile Header with Modern Card Design */}
        <View style={styles.modernProfileCard}>
          <View style={styles.profileHeader}>
            {/* Avatar with Gradient Border */}
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={['#FFB347', '#FF3CAC', '#00CFFF']}
                style={styles.avatarGradientBorder}
              >
                <View style={styles.avatar}>
                  {profileData.profile_image ? (
                    <img 
                      src={profileData.profile_image} 
                      alt="Profile" 
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <Text style={styles.avatarText}>
                      {(profileData.name || "You").charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
              </LinearGradient>
            </View>
            
            {/* User Info with Modern Typography */}
            <View style={styles.headerInfo}>
              <Text style={styles.modernTitle}>{profileData.name || "You"}</Text>
              <Text style={styles.modernSubtitle}>ADHD Champion • Level {currentLevel}</Text>
              <Text style={styles.modernID}>ID: #{Math.random().toString(36).substr(2, 8).toUpperCase()}</Text>
            </View>
          </View>

          {/* Stats Row - Behance Style */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalPoints}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{completionStats.unlocked}</Text>
              <Text style={styles.statLabel}>Badges</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{currentStreak}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Modern Tab Navigation - Behance Style */}
      <View style={styles.modernTabNav}>
        {[
          { key: 'overview', label: '🏠', title: 'Overview' },
          { key: 'achievements', label: '🏆', title: 'Badges' },
          { key: 'stats', label: '📊', title: 'Stats' },
          { key: 'completion', label: '🎯', title: 'Tasks' },
          { key: 'neurodivergency', label: '🧠', title: 'Learn' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.modernTab, activeTab === tab.key && styles.modernActiveTab]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Text style={styles.tabEmoji}>{tab.label}</Text>
            <Text style={[styles.modernTabLabel, activeTab === tab.key && styles.modernActiveTabLabel]}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content with Modern Cards */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 120) }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.modernContentContainer}>
          {renderTabContent()}
        </View>
        
        {/* Modern Sign Out Button */}
        <TouchableOpacity 
          onPress={async () => {
            console.log("🚨 SIGN OUT BUTTON CLICKED!");
            
            // Use web-compatible confirmation
            const confirmed = Platform.OS === 'web' 
              ? window.confirm("Are you sure you want to sign out?")
              : await new Promise((resolve) => {
                  Alert.alert("Sign Out", "Are you sure you want to sign out?", [
                    { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
                    { text: "Sign Out", style: "destructive", onPress: () => resolve(true) }
                  ]);
                });
            
            if (confirmed) {
              try {
                console.log("🚪 Starting sign out process...");
                
                // Call signOut and wait for it to complete
                await signOut();
                console.log("✅ SignOut completed, redirecting...");
                
                // Small delay to ensure state is updated
                setTimeout(() => {
                  router.replace("/(auth)/welcome");
                }, 100);
                
              } catch (error) {
                console.error("❌ Error during sign out:", error);
                if (Platform.OS === 'web') {
                  window.alert("Failed to sign out. Please try again.");
                } else {
                  Alert.alert("Error", "Failed to sign out. Please try again.");
                }
              }
            }
          }}
          style={styles.modernSignOutBtn}
        >
          <LinearGradient
            colors={['#FF4444', '#FF6B6B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.signOutGradient}
          >
            <Text style={styles.modernSignOutText}>🚪 Sign Out</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0c0c0c" },
  title: { color: "#fff", fontSize: 22, fontWeight: "700" },
  subtitle: { color: "#bdbdbd", fontSize: 14, marginTop: 2 },
  meta: { color: "#bdbdbd", marginTop: 6 },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 10 },
  paletteRow: { flexDirection: "row", justifyContent: "space-between" },
  paletteItem: { backgroundColor: "#111", padding: 10, borderRadius: 12, flexDirection: "row", gap: 8 },
  swatch: { width: 20, height: 20, borderRadius: 6 },
  btn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnTextDark: { color: '#0c0c0c', fontWeight: '800' },
  btnTextLight: { color: '#fff', fontWeight: '800' },
  signOutBtn: { marginTop: 24, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  signOutText: { color: '#0c0c0c', fontWeight: '700' },
  syncRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  
  // New styles for enhanced UI
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerInfo: {
    flex: 1,
  },
  tabNav: {
    flexDirection: 'row',
    backgroundColor: '#111',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#333',
  },
  tabEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  tabLabel: {
    color: '#bdbdbd',
    fontSize: 12,
    fontWeight: '600',
  },
  activeTabLabel: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tabContent: {
    paddingTop: 16,
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  achievementSummary: {
    color: '#bdbdbd',
    textAlign: 'center',
    fontSize: 14,
  },
  recentAchievements: {
    marginBottom: 24,
  },
  achievementRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
  },
  emptyText: {
    color: '#bdbdbd',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#bdbdbd',
    fontSize: 12,
  },
  quickActions: {
    marginBottom: 24,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionEmoji: {
    fontSize: 20,
    marginBottom: 8,
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
  },
  advancedSection: {
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  
  // Modern Gradient Header Styles
  gradientHeader: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  modernProfileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarGradientBorder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  modernSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  modernID: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 10,
  },
  
  // Modern Tab Navigation Styles
  modernTabNav: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 16,
    padding: 6,
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modernTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderRadius: 12,
    transition: 'all 0.3s ease',
  },
  modernActiveTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modernTabLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  modernActiveTabLabel: {
    color: '#fff',
    fontWeight: '700',
  },
  
  // Modern Content Container
  modernContentContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  // Modern Sign Out Button Styles
  modernSignOutBtn: {
    marginTop: 32,
    marginHorizontal: 20,
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#FF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  signOutGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  modernSignOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  
  // Missing stat styles
  statLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  
  // Modern Achievement Tab Styles
  modernTabContent: {
    paddingTop: 16,
  },
  modernCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modernSectionTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  modernAchievementSummary: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Modern Empty Text Style
  modernEmptyText: {
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    fontStyle: "italic",
    paddingVertical: 20,
    fontSize: 16,
  },
  
  // Modern Quick Stats Styles
  modernQuickStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modernStatCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    minHeight: 80,
    justifyContent: "center",
  },
  modernStatEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  modernStatValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modernStatLabel: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  
  // Modern Action Grid Styles
  modernActionGrid: {
    flexDirection: "row",
    gap: 12,
  },
  modernActionBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    minHeight: 80,
    justifyContent: "center",
  },
  modernActionEmoji: {
    fontSize: 20,
    marginBottom: 8,
  },
  modernActionText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  
  // Modern Sync Row Styles
  modernSyncRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  modernSyncLabel: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 16,
    fontWeight: "600",
  },
});
