import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { ProfilePictureUpload } from '../../src/components/ProfilePictureUpload';

type ProfileData = {
  name?: string;
  bio?: string;
  location?: string;
  website?: string;
  birth_date?: string;
  profile_image?: string;
};

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, mode } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    bio: '',
    location: '',
    website: '',
    birth_date: '',
  });

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
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
          const profile = data.profile;
          setProfileData({
            name: profile.name || '',
            bio: profile.bio || '',
            location: profile.location || '',
            website: profile.website || '',
            birth_date: profile.birth_date || '',
            profile_image: profile.profile_image || '',
          });
        } else {
          throw new Error(`Failed to load profile: ${response.status}`);
        }
      } catch (error) {
        console.error('Failed to load profile data:', error);
        Alert.alert('Error', 'Failed to load profile data');
      } finally {
        setLoading(false);
      }
    } else {
      // Local mode - use mock data
      setProfileData({
        name: user?.name || 'Your Name',
        bio: 'Tell us about yourself...',
        location: '',
        website: '',
        birth_date: '',
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (mode === 'sync' && isAuthenticated) {
        const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/profile`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${user?.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(profileData)
        });

        if (response.ok) {
          Alert.alert('Success', 'Profile updated successfully!', [
            { text: 'OK', onPress: () => router.back() }
          ]);
        } else {
          throw new Error(`Failed to update profile: ${response.status}`);
        }
      } else {
        // Local mode
        Alert.alert('Success', 'Profile updated (local mode)!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Profile</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Name */}
          <View style={styles.section}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your display name"
              placeholderTextColor="#666"
              value={profileData.name}
              onChangeText={(value) => updateField('name', value)}
              maxLength={50}
            />
          </View>

          {/* Bio */}
          <View style={styles.section}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder="Tell us about yourself, your interests, or your ADHD journey..."
              placeholderTextColor="#666"
              value={profileData.bio}
              onChangeText={(value) => updateField('bio', value)}
              multiline
              maxLength={300}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>
              {profileData.bio?.length || 0}/300
            </Text>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              placeholder="City, Country"
              placeholderTextColor="#666"
              value={profileData.location}
              onChangeText={(value) => updateField('location', value)}
              maxLength={50}
            />
          </View>

          {/* Website */}
          <View style={styles.section}>
            <Text style={styles.label}>Website</Text>
            <TextInput
              style={styles.input}
              placeholder="https://your-website.com"
              placeholderTextColor="#666"
              value={profileData.website}
              onChangeText={(value) => updateField('website', value)}
              keyboardType="url"
              autoCapitalize="none"
              maxLength={100}
            />
          </View>

          {/* Birth Date */}
          <View style={styles.section}>
            <Text style={styles.label}>Birth Date (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#666"
              value={profileData.birth_date}
              onChangeText={(value) => updateField('birth_date', value)}
              maxLength={10}
            />
            <Text style={styles.helpText}>
              Your age won't be shown publicly. Used for personalized content.
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Your profile information helps connect you with like-minded community members.
            </Text>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
  saveButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#666',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    color: 'white',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  bioInput: {
    minHeight: 100,
  },
  characterCount: {
    color: '#666',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  helpText: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
    marginTop: 16,
  },
  footer: {
    padding: 16,
    marginTop: 16,
  },
  footerText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 18,
  },
});