import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { useRuntimeConfig } from '../../src/context/RuntimeConfigContext';
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
  const { user, isAuthenticated } = useAuth();
  const { mode } = useRuntimeConfig();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    bio: '',
    location: '',
    website: '',
    birth_date: '',
  });

  // IMMEDIATE LOAD ON MOUNT
  React.useLayoutEffect(() => {
    console.log('🚨 LAYOUT EFFECT - IMMEDIATE LOAD!');
    const immediateLoad = async () => {
      console.log('📂 IMMEDIATE localStorage check...');
      try {
        const savedProfile = localStorage.getItem('user_profile');
        console.log('📂 Immediate localStorage data:', savedProfile);
        
        if (savedProfile) {
          const parsedProfile = JSON.parse(savedProfile);
          console.log('📂 Immediate parsed profile:', parsedProfile);
          setProfileData({
            name: parsedProfile.name || '',
            bio: parsedProfile.bio || '',
            location: parsedProfile.location || '',
            website: parsedProfile.website || '',
            birth_date: parsedProfile.birth_date || '',
          });
          console.log('✅ IMMEDIATE LOAD SUCCESS!');
        }
      } catch (error) {
        console.error('❌ Immediate load error:', error);
      }
    };
    immediateLoad();
  }, []);

  useEffect(() => {
    console.log('🔄 useEffect triggered for loadProfileData');
    console.log('🔍 Current state:', { mode, isAuthenticated, userExists: !!user, hasToken: !!user?.token });
    
    // FORCE LOAD - Her component mount'ta çalıştır
    console.log('🚀 FORCING loadProfileData...');
    loadProfileData();
  }, []); // Empty dependency - sadece component mount'ta çalış

  const loadProfileData = async () => {
    console.log('🔄 loadProfileData called:', { mode, isAuthenticated, hasToken: !!user?.token });
    
    // HER DURUMDA localStorage'dan yükle önce
    console.log('📱 FORCED OFFLINE MODE: Always loading from localStorage first...');
    await loadFromLocalStorage();
    
    // Eğer sync mode ve token varsa, backend'den de dene (optional)
    if (mode === 'sync' && isAuthenticated && user?.token) {
      console.log('🌐 SYNC MODE: Also trying backend...');
      try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/profile/settings`, {
          headers: {
            'Authorization': `Bearer ${user.token}`,
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
          console.log('✅ Profile loaded from backend and overwrote localStorage!');
        }
      } catch (error) {
        console.log('❌ Backend failed, keeping localStorage data:', error);
      }
    }
  };

  // Separate function for localStorage loading
  const loadFromLocalStorage = async () => {
  // Separate function for localStorage loading
  const loadFromLocalStorage = async () => {
    console.log('📂 LOADING FROM localStorage...');
    try {
      const savedProfile = localStorage.getItem('user_profile');
      console.log('📂 localStorage data:', savedProfile);
      
      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile);
        console.log('📂 Parsed profile from localStorage:', parsedProfile);
        setProfileData({
          name: parsedProfile.name || user?.name || 'Your Name',
          bio: parsedProfile.bio || 'Tell us about yourself...',
          location: parsedProfile.location || '',
          website: parsedProfile.website || '',
          birth_date: parsedProfile.birth_date || '',
        });
        console.log('✅ Profile data loaded from localStorage!');
      } else {
        console.log('❌ No saved profile found in localStorage');
        // Kayıtlı data yok, default değerler
        setProfileData({
          name: user?.name || 'Your Name',
          bio: 'Tell us about yourself...',
          location: '',
          website: '',
          birth_date: '',
        });
      }
    } catch (error) {
      console.error('❌ localStorage read error:', error);
      setProfileData({
        name: user?.name || 'Your Name',
        bio: 'Tell us about yourself...',
        location: '',
        website: '',
        birth_date: '',
      });
    }
    setLoading(false);
  };
  };

  const handleSave = async () => {
    console.log('🚀 SAVE BUTTON CLICKED!'); // İlk log
    setSaving(true);
    try {
      console.log('🔄 Starting profile save process...');
      console.log('📊 Current mode:', mode);
      console.log('🔐 Is authenticated:', isAuthenticated);
      console.log('👤 User object:', user);
      console.log('📝 Profile data to save:', profileData);
      
      // FORCE LOCAL MODE SAVE FOR TESTING
      console.log('💾 FORCING LOCAL MODE SAVE FOR TESTING...');
      Alert.alert('Success', 'Profile updated (testing)!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
      
      /* ORIGINAL LOGIC - COMMENTED FOR TESTING
      if (mode === 'sync' && isAuthenticated && user?.token) {
        console.log('🌐 Sync mode - saving to backend...');
        console.log('🔐 Using token:', user.token ? 'Token exists' : 'NO TOKEN');
        
        const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/profile`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(profileData)
        });

        console.log('📡 Backend response status:', response.status);
        const responseData = await response.json();
        console.log('📡 Backend response data:', responseData);

        if (response.ok) {
          console.log('✅ Profile saved successfully to backend!');
          Alert.alert('Success', 'Profile updated successfully!', [
            { text: 'OK', onPress: () => router.back() }
          ]);
        } else {
          throw new Error(`Failed to update profile: ${response.status} - ${JSON.stringify(responseData)}`);
        }
      } else {
        console.log('💾 Local mode - saving locally...');
        // For now, still show success in local mode but also log what we're saving
        console.log('📝 Saving profile data locally:', profileData);
        Alert.alert('Success', 'Profile updated (local mode)!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
      */
    } catch (error) {
      console.error('❌ Failed to save profile:', error);
      Alert.alert('Error', `Failed to save profile: ${error.message}`);
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
          {/* Back Button - HTML */}
          <button
            onClick={() => {
              console.log('🔙 Going back...');
              router.back();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '8px'
            }}
          >
            ← Back
          </button>
          
          <Text style={styles.title}>Edit Profile</Text>
          
          {/* Save Button - HTML */}
          <button 
            onClick={async () => {
              console.log('🚀 SAVE BUTTON CLICKED!');
              
              try {
                // Form data'yı al
                const nameInput = document.querySelector('input[placeholder*="name"]');
                const bioInput = document.querySelector('textarea[placeholder*="bio"]');
                const locationInput = document.querySelector('input[placeholder*="location"]');
                const websiteInput = document.querySelector('input[placeholder*="website"]');
                
                const profileData = {
                  name: nameInput?.value || '',
                  bio: bioInput?.value || '',
                  location: locationInput?.value || '',
                  website: websiteInput?.value || '',
                  birth_date: ''
                };
                
                console.log('💾 Saving profile data:', profileData);
                
                // OFFLINE MODE - Direkt localStorage'a kaydet
                console.log('💾 OFFLINE MODE: Saving to localStorage...');
                localStorage.setItem('user_profile', JSON.stringify(profileData));
                console.log('✅ Saved to localStorage:', profileData);
                
                alert('✅ Profile Saved Successfully (Offline Mode)!');
                
                // Geri dön
                router.back();
                
              } catch (error) {
                console.error('❌ Save error:', error);
                alert('❌ Save failed: ' + error.message);
              }
            }}
            style={{
              backgroundColor: '#4A90E2',
              color: 'white',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '16px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            SAVE
          </button>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Profile Picture */}
          <ProfilePictureUpload
            currentImageUrl={profileData.profile_image}
            onUploadComplete={(imageUrl) => setProfileData(prev => ({ ...prev, profile_image: imageUrl }))}
          />

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