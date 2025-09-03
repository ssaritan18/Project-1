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
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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
    profile_image: null,
  });

  // IMMEDIATE LOAD ON MOUNT
  React.useLayoutEffect(() => {
    console.log('🚨 LAYOUT EFFECT - IMMEDIATE LOAD!');
    const immediateLoad = async () => {
      console.log('📂 IMMEDIATE localStorage check...');
      try {
        const savedProfile = localStorage.getItem('profile_data');
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
    console.log('📂 LOADING FROM localStorage...');
    try {
      const savedProfile = localStorage.getItem('profile_data');
      console.log('📂 localStorage data:', savedProfile);
      
      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile);
        console.log('📂 Parsed profile from localStorage:', {
          name: parsedProfile.name,
          bio: parsedProfile.bio,
          location: parsedProfile.location,
          website: parsedProfile.website,
          birth_date: parsedProfile.birth_date,
          profile_image: parsedProfile.profile_image ? 'IMAGE_DATA_LOADED' : 'NO_IMAGE_DATA'
        });
        
        const loadedData = {
          name: parsedProfile.name || user?.name || 'Your Name',
          bio: parsedProfile.bio || 'Tell us about yourself...',
          location: parsedProfile.location || '',
          website: parsedProfile.website || '',
          birth_date: parsedProfile.birth_date || '',
          profile_image: parsedProfile.profile_image || null,
        };
        
        console.log('🔄 Setting profile data to:', {
          ...loadedData,
          profile_image: loadedData.profile_image ? 'IMAGE_WILL_BE_SET' : 'NO_IMAGE_TO_SET'
        });
        
        setProfileData(loadedData);
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
          profile_image: null,
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

  const handleSave = async () => {
    try {
      console.log('🚀 SAVE BUTTON CLICKED!');
      console.log('💾 DIRECT localStorage save starting...');
      
      // Create save data
      const dataToSave = {
        name: profileData.name || 'Your Name',
        bio: profileData.bio || 'Tell us about yourself...',
        location: profileData.location || '',
        website: profileData.website || '',
        birth_date: profileData.birth_date || '',
        profile_image: profileData.profile_image || null,
      };
      
      console.log('📊 Data to save:', {
        name: dataToSave.name,
        profile_image: dataToSave.profile_image ? 'IMAGE_DATA_READY' : 'NO_IMAGE'
      });
      
      // Save to localStorage
      const jsonString = JSON.stringify(dataToSave);
      localStorage.setItem('profile_data', jsonString);
      console.log('✅ localStorage.setItem completed!');
      
      // Verify save
      const verification = localStorage.getItem('profile_data');
      console.log('🔍 Immediate verification:', verification ? 'DATA_FOUND' : 'NO_DATA');
      
      // Success message
      console.log('🎉 About to show success alert...');
      Alert.alert('Success', 'Profile saved successfully!', [
        { text: 'OK', onPress: () => {
          console.log('📱 Alert OK pressed, navigating back...');
          router.back();
        }}
      ]);
      
    } catch (error) {
      console.error('❌ SAVE ERROR:', error);
      Alert.alert('Error', 'Save failed: ' + String(error));
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
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f172a']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.wrapper, { paddingTop: insets.top }]}>
          {/* Glow Header */}
          <LinearGradient
            colors={['#8B5CF6', '#EC4899', '#F97316']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.glowHeader}
          >
            <TouchableOpacity 
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <Text style={styles.headerTitle}>✨ Edit Profile</Text>
            
            <TouchableOpacity
              onPress={handleSave}
              style={styles.saveButton}
            >
              <LinearGradient
                colors={['#10B981', '#34D399']}
                style={styles.saveButtonGradient}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Profile Picture Section */}
            <View style={styles.profileSection}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.1)', 'rgba(236, 72, 153, 0.1)']}
                style={styles.profileCard}
              >
                <Text style={styles.sectionTitle}>📸 Profile Picture</Text>
                <ProfilePictureUpload
                  currentImageUrl={profileData.profile_image}
                  onUploadComplete={(imageUrl) => {
                    console.log('🖼️ PROFILE EDIT: onUploadComplete received imageUrl:', imageUrl?.substring(0, 50) + '...');
                    setProfileData(prev => ({ ...prev, profile_image: imageUrl }));
                  }}
                />
              </LinearGradient>
            </View>

            {/* Personal Info Section */}
            <View style={styles.section}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.1)', 'rgba(168, 85, 247, 0.1)']}
                style={styles.sectionCard}
              >
                <Text style={styles.sectionTitle}>👤 Personal Information</Text>
                
                {/* Name */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Display Name</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.glowInput}
                      placeholder="Enter your display name"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      value={profileData.name}
                      onChangeText={(value) => updateField('name', value)}
                      maxLength={50}
                    />
                  </View>
                </View>

                {/* Bio */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Bio</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[styles.glowInput, styles.bioInput]}
                      placeholder="Tell us about yourself, your interests, or your ADHD journey..."
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      value={profileData.bio}
                      onChangeText={(value) => updateField('bio', value)}
                      multiline
                      maxLength={300}
                      textAlignVertical="top"
                    />
                  </View>
                  <Text style={styles.characterCount}>
                    {profileData.bio?.length || 0}/300
                  </Text>
                </View>
              </LinearGradient>
            </View>

            {/* Contact Info Section */}
            <View style={styles.section}>
              <LinearGradient
                colors={['rgba(236, 72, 153, 0.1)', 'rgba(249, 115, 22, 0.1)']}
                style={styles.sectionCard}
              >
                <Text style={styles.sectionTitle}>🌍 Contact & Location</Text>
                
                {/* Location */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Location</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="location-outline" size={20} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.glowInput, styles.inputWithIcon]}
                      placeholder="City, Country"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      value={profileData.location}
                      onChangeText={(value) => updateField('location', value)}
                      maxLength={50}
                    />
                  </View>
                </View>

                {/* Website */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Website</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="link-outline" size={20} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.glowInput, styles.inputWithIcon]}
                      placeholder="https://your-website.com"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      value={profileData.website}
                      onChangeText={(value) => updateField('website', value)}
                      keyboardType="url"
                      autoCapitalize="none"
                      maxLength={100}
                    />
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Privacy Section */}
            <View style={styles.section}>
              <LinearGradient
                colors={['rgba(16, 185, 129, 0.1)', 'rgba(52, 211, 153, 0.1)']}
                style={styles.sectionCard}
              >
                <Text style={styles.sectionTitle}>🔒 Privacy Settings</Text>
                
                {/* Birth Date */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Birth Date (Optional)</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="calendar-outline" size={20} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.glowInput, styles.inputWithIcon]}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      value={profileData.birth_date}
                      onChangeText={(value) => updateField('birth_date', value)}
                      maxLength={10}
                    />
                  </View>
                  <Text style={styles.helpText}>
                    🔐 Your age won't be shown publicly. Used for personalized content.
                  </Text>
                </View>
              </LinearGradient>
            </View>

            {/* Footer */}
            <View style={styles.footerSection}>
              <LinearGradient
                colors={['rgba(99, 102, 241, 0.1)', 'rgba(139, 92, 246, 0.1)']}
                style={styles.footerCard}
              >
                <Ionicons name="people-outline" size={24} color="#8B5CF6" />
                <Text style={styles.footerText}>
                  Your profile information helps connect you with like-minded community members and provides personalized ADHD resources.
                </Text>
              </LinearGradient>
            </View>

            <View style={styles.bottomPadding} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
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