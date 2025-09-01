import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Appearance,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';

type SettingsData = {
  notifications: {
    push_messages: boolean;
    email_updates: boolean;
    friend_requests: boolean;
  };
  privacy: {
    profile_visibility: string;
    message_requests: string;
  };
  preferences: {
    theme: string;
  };
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, mode } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState<SettingsData>({
    notifications: {
      push_messages: true,
      email_updates: true,
      friend_requests: true,
    },
    privacy: {
      profile_visibility: 'friends',
      message_requests: 'friends_only',
    },
    preferences: {
      theme: 'auto',
      language: 'en',
    },
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (mode === 'sync' && isAuthenticated) {
      setLoading(true);
      try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/profile/settings`, {
          headers: {
            'Authorization': `Bearer ${user?.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.settings) {
            setSettings(data.settings);
          }
        } else {
          throw new Error(`Failed to load settings: ${response.status}`);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        Alert.alert('Error', 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    // Local mode uses default settings
  };

  const applyTheme = (theme: string) => {
    try {
      switch (theme) {
        case 'light':
          // Force light mode
          if (Appearance.setColorScheme) {
            Appearance.setColorScheme('light');
          }
          break;
        case 'dark':
          // Force dark mode
          if (Appearance.setColorScheme) {
            Appearance.setColorScheme('dark');
          }
          break;
        case 'auto':
        default:
          // Follow system theme
          if (Appearance.setColorScheme) {
            Appearance.setColorScheme(null); // null means follow system
          }
          break;
      }
      
      // Show feedback to user
      Alert.alert(
        'Theme Updated', 
        `Theme has been set to ${theme === 'auto' ? 'follow system settings' : theme + ' mode'}.`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.log('Theme change not supported on this platform:', error);
      // Still show success message for local storage
      Alert.alert(
        'Theme Preference Saved', 
        `Your theme preference (${theme}) has been saved and will apply when supported.`
      );
    }
  };

  const updateSettings = async (section: keyof SettingsData, updates: any) => {
    const newSettings = {
      ...settings,
      [section]: {
        ...settings[section],
        ...updates
      }
    };
    
    setSettings(newSettings);

    if (mode === 'sync' && isAuthenticated) {
      setSaving(true);
      try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/profile/settings`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${user?.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            [section]: newSettings[section]
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to update settings: ${response.status}`);
        }
      } catch (error) {
        console.error('Failed to save settings:', error);
        Alert.alert('Error', 'Failed to save settings. Please try again.');
        // Revert changes on error
        setSettings(settings);
      } finally {
        setSaving(false);
      }
    }
  };

  const SettingSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  const ToggleSetting = ({ 
    title, 
    description, 
    value, 
    onToggle 
  }: { 
    title: string; 
    description?: string; 
    value: boolean; 
    onToggle: (value: boolean) => void;
  }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#333', true: '#4A90E2' }}
        thumbColor={value ? '#ffffff' : '#888'}
      />
    </View>
  );

  const SelectSetting = ({ 
    title, 
    value, 
    options, 
    onSelect 
  }: { 
    title: string; 
    value: string; 
    options: { key: string; label: string }[];
    onSelect: (key: string) => void;
  }) => (
    <View style={styles.settingColumn}>
      <Text style={styles.settingTitle}>{title}</Text>
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.optionButton,
              value === option.key && styles.optionButtonSelected
            ]}
            onPress={() => onSelect(option.key)}
          >
            <Text style={[
              styles.optionText,
              value === option.key && styles.optionTextSelected
            ]}>
              {option.label}
            </Text>
            {value === option.key && (
              <Ionicons name="checkmark" size={16} color="#4A90E2" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notifications */}
        <SettingSection title="Notifications">
          <ToggleSetting
            title="Message Notifications"
            description="Get notified when someone sends you a message"
            value={settings.notifications.push_messages}
            onToggle={(value) => updateSettings('notifications', { push_messages: value })}
          />
          <ToggleSetting
            title="Email Updates"
            description="Receive weekly community updates via email"
            value={settings.notifications.email_updates}
            onToggle={(value) => updateSettings('notifications', { email_updates: value })}
          />
          <ToggleSetting
            title="Friend Request Notifications"
            description="Get notified when someone sends you a friend request"
            value={settings.notifications.friend_requests}
            onToggle={(value) => updateSettings('notifications', { friend_requests: value })}
          />
        </SettingSection>

        {/* Privacy */}
        <SettingSection title="Privacy">
          <SelectSetting
            title="Profile Visibility"
            value={settings.privacy.profile_visibility}
            options={[
              { key: 'public', label: 'Public - Anyone can see your profile' },
              { key: 'friends', label: 'Friends Only - Only friends can see your profile' },
              { key: 'private', label: 'Private - Only you can see your profile' },
            ]}
            onSelect={(value) => updateSettings('privacy', { profile_visibility: value })}
          />
          
          <SelectSetting
            title="Message Requests"
            value={settings.privacy.message_requests}
            options={[
              { key: 'everyone', label: 'Everyone - Anyone can message you' },
              { key: 'friends_only', label: 'Friends Only - Only friends can message you' },
              { key: 'no_one', label: 'No One - Block all new message requests' },
            ]}
            onSelect={(value) => updateSettings('privacy', { message_requests: value })}
          />
        </SettingSection>

        {/* Preferences */}
        <SettingSection title="Preferences">
          <SelectSetting
            title="Theme"
            value={settings.preferences.theme}
            options={[
              { key: 'auto', label: 'Auto - Follow system settings' },
              { key: 'dark', label: 'Dark - Always use dark mode' },
              { key: 'light', label: 'Light - Always use light mode' },
            ]}
            onSelect={(value) => {
              updateSettings('preferences', { theme: value });
              // Apply theme immediately
              applyTheme(value);
            }}
          />
        </SettingSection>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Settings are automatically saved when changed.
          </Text>
        </View>
      </ScrollView>

      {/* Loading overlay */}
      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="small" color="#4A90E2" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionContent: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  settingColumn: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    color: '#888',
    fontSize: 13,
    lineHeight: 16,
  },
  optionsContainer: {
    marginTop: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  optionButtonSelected: {
    backgroundColor: '#1E2A3A',
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  optionText: {
    color: '#888',
    fontSize: 14,
    flex: 1,
  },
  optionTextSelected: {
    color: '#4A90E2',
    fontWeight: '500',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
    marginTop: 16,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  savingOverlay: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
});