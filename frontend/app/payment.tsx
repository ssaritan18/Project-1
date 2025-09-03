import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSubscription } from '../src/context/SubscriptionContext';

export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const { upgradeToPremium } = useSubscription();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<'card' | 'apple' | 'google'>('card');
  
  // Card form state
  const [cardForm, setCardForm] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: '',
  });

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Upgrade to premium
      await upgradeToPremium();
      
      Alert.alert(
        '🎉 Payment Successful!',
        'Welcome to Premium! You now have access to all premium features. Enjoy your ad-free ADHD support experience!',
        [
          {
            text: 'Start Using Premium',
            onPress: () => {
              // Navigate to main app
              router.replace('/');
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert(
        'Payment Failed',
        'There was an issue processing your payment. Please check your payment details and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCardNumber = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    // Add spaces every 4 digits
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    return formatted.substring(0, 19); // Limit to 16 digits + 3 spaces
  };

  const formatExpiry = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    // Add slash after 2 digits
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f172a']}
      style={styles.container}
    >
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <LinearGradient
          colors={['#8B5CF6', '#EC4899', '#F97316']}
          style={styles.headerGradient}
        >
          <Text style={styles.headerTitle}>👑 Complete Your Premium Upgrade</Text>
          <Text style={styles.headerSubtitle}>
            Join thousands of ADHD users already using premium features
          </Text>
        </LinearGradient>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Summary */}
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.1)', 'rgba(236, 72, 153, 0.1)']}
          style={styles.summaryCard}
        >
          <Text style={styles.summaryTitle}>📋 Order Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>ADHDers Social Club Premium</Text>
            <Text style={styles.summaryValue}>$4.99</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Billing Period</Text>
            <Text style={styles.summaryValue}>Monthly</Text>
          </View>
          
          <View style={styles.summaryDivider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Total Today</Text>
            <Text style={styles.summaryTotalValue}>$4.99</Text>
          </View>
          
          <Text style={styles.summaryNote}>
            ✨ Cancel anytime • 🔄 Auto-renews monthly • 📱 Instant access
          </Text>
        </LinearGradient>

        {/* Payment Methods */}
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>💳 Payment Method</Text>
          
          <View style={styles.paymentMethods}>
            {/* Credit Card */}
            <TouchableOpacity
              style={[styles.paymentMethod, selectedPayment === 'card' && styles.selectedPayment]}
              onPress={() => setSelectedPayment('card')}
            >
              <View style={styles.paymentMethodContent}>
                <Text style={styles.paymentMethodIcon}>💳</Text>
                <Text style={styles.paymentMethodText}>Credit/Debit Card</Text>
              </View>
              {selectedPayment === 'card' && <Ionicons name="checkmark-circle" size={20} color="#10B981" />}
            </TouchableOpacity>

            {/* Apple Pay */}
            <TouchableOpacity
              style={[styles.paymentMethod, selectedPayment === 'apple' && styles.selectedPayment]}
              onPress={() => setSelectedPayment('apple')}
            >
              <View style={styles.paymentMethodContent}>
                <Text style={styles.paymentMethodIcon}>🍎</Text>
                <Text style={styles.paymentMethodText}>Apple Pay</Text>
                <Text style={styles.recommendedBadge}>Recommended</Text>
              </View>
              {selectedPayment === 'apple' && <Ionicons name="checkmark-circle" size={20} color="#10B981" />}
            </TouchableOpacity>

            {/* Google Pay */}
            <TouchableOpacity
              style={[styles.paymentMethod, selectedPayment === 'google' && styles.selectedPayment]}
              onPress={() => setSelectedPayment('google')}
            >
              <View style={styles.paymentMethodContent}>
                <Text style={styles.paymentMethodIcon}>🔍</Text>
                <Text style={styles.paymentMethodText}>Google Pay</Text>
              </View>
              {selectedPayment === 'google' && <Ionicons name="checkmark-circle" size={20} color="#10B981" />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Card Form (only show if card is selected) */}
        {selectedPayment === 'card' && (
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.1)', 'rgba(168, 85, 247, 0.1)']}
            style={styles.cardForm}
          >
            <Text style={styles.cardFormTitle}>💳 Card Details</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Card Number</Text>
              <TextInput
                style={styles.formInput}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor="#666"
                value={cardForm.number}
                onChangeText={(text) => setCardForm({...cardForm, number: formatCardNumber(text)})}
                keyboardType="numeric"
                maxLength={19}
              />
            </View>
            
            <View style={styles.formRow}>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>Expiry Date</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="MM/YY"
                  placeholderTextColor="#666"
                  value={cardForm.expiry}
                  onChangeText={(text) => setCardForm({...cardForm, expiry: formatExpiry(text)})}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
              
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>CVV</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="123"
                  placeholderTextColor="#666"
                  value={cardForm.cvv}
                  onChangeText={(text) => setCardForm({...cardForm, cvv: text.replace(/\D/g, '').substring(0, 4)})}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Cardholder Name</Text>
              <TextInput
                style={styles.formInput}
                placeholder="John Doe"
                placeholderTextColor="#666"
                value={cardForm.name}
                onChangeText={(text) => setCardForm({...cardForm, name: text})}
                autoCapitalize="words"
              />
            </View>
          </LinearGradient>
        )}

        {/* Premium Features Reminder */}
        <LinearGradient
          colors={['rgba(16, 185, 129, 0.1)', 'rgba(5, 150, 105, 0.1)']}
          style={styles.featuresCard}
        >
          <Text style={styles.featuresTitle}>🎯 What You're Getting:</Text>
          <View style={styles.featuresList}>
            <Text style={styles.featureItem}>✨ Completely ad-free experience</Text>
            <Text style={styles.featureItem}>🎯 Unlimited focus sessions</Text>
            <Text style={styles.featureItem}>📊 Advanced analytics & insights</Text>
            <Text style={styles.featureItem}>👥 Unlimited friends & connections</Text>
            <Text style={styles.featureItem}>🏆 Priority customer support</Text>
            <Text style={styles.featureItem}>🎨 Premium themes & customization</Text>
          </View>
        </LinearGradient>

        {/* Payment Button */}
        <TouchableOpacity
          style={styles.paymentButton}
          onPress={handlePayment}
          disabled={isProcessing || (selectedPayment === 'card' && (!cardForm.number || !cardForm.expiry || !cardForm.cvv || !cardForm.name))}
        >
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.paymentButtonGradient}
          >
            <Text style={styles.paymentButtonText}>
              {isProcessing 
                ? 'Processing Payment...' 
                : selectedPayment === 'card'
                  ? '💳 Pay $4.99/month'
                  : selectedPayment === 'apple'
                    ? '🍎 Pay with Apple Pay'
                    : '🔍 Pay with Google Pay'
              }
            </Text>
            {!isProcessing && <Ionicons name="arrow-forward" size={20} color="#fff" />}
          </LinearGradient>
        </TouchableOpacity>

        {/* Security & Trust */}
        <View style={styles.trustSection}>
          <Text style={styles.trustTitle}>🔒 Your Payment is Secure</Text>
          <View style={styles.trustFeatures}>
            <Text style={styles.trustItem}>🛡️ 256-bit SSL encryption</Text>
            <Text style={styles.trustItem}>💳 PCI DSS compliant</Text>
            <Text style={styles.trustItem}>🔄 Cancel anytime</Text>
            <Text style={styles.trustItem}>📱 Instant activation</Text>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 16,
  },
  headerGradient: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  
  // Order Summary
  summaryCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  summaryTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    color: '#E5E7EB',
    fontSize: 14,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    marginVertical: 12,
  },
  summaryTotalLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  summaryTotalValue: {
    color: '#8B5CF6',
    fontSize: 18,
    fontWeight: '900',
  },
  summaryNote: {
    color: '#10B981',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
  
  // Payment Methods
  paymentSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  paymentMethods: {
    gap: 12,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedPayment: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentMethodIcon: {
    fontSize: 20,
  },
  paymentMethodText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  recommendedBadge: {
    backgroundColor: '#10B981',
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  
  // Card Form
  cardForm: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  cardFormTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formGroupHalf: {
    flex: 1,
    marginBottom: 16,
  },
  formLabel: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    fontSize: 16,
  },
  
  // Features
  featuresCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  featuresTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Payment Button
  paymentButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  paymentButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  paymentButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  
  // Trust
  trustSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  trustTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  trustFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  trustItem: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
});