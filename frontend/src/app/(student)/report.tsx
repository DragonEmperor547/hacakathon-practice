import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { COLORS } from '@/constants/theme';
import { Category, Complaint } from '@/types';
import {
  createComplaint,
  fetchCampusLocations,
  findSimilarComplaints,
  getComplaintReference,
  toggleComplaintUpvote,
  uploadComplaintImage,
} from '@/lib/api';
import {
  ArrowLeftIcon,
  CameraIcon,
  CATEGORY_ICONS,
  CloseIcon,
  GalleryIcon,
} from '@/components/Icons';
import { SimilarIssuesSheet } from '@/components/SimilarIssuesSheet';
import { SuccessModal } from '@/components/SuccessModal';

const CATEGORIES: Category[] = [
  'Lighting',
  'Furniture',
  'Water Leakage',
  'Cleanliness',
  'Equipment',
  'Network',
];

export default function ReportScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [category, setCategory] = useState<Category>('Lighting');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  // Location suggestions from backend
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);

  // Duplicate Prevention & Similar Issues
  const [similarIssues, setSimilarIssues] = useState<Complaint[]>([]);
  const [showSimilarSheet, setShowSimilarSheet] = useState(false);
  const [bypassSimilarCheck, setBypassSimilarCheck] = useState(false);

  // Success Modal
  const [submittedComplaint, setSubmittedComplaint] = useState<Complaint | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchCampusLocations().then((locs) => {
      const formatted = locs.map((l) => `${l.building}, ${l.room || l.floor}`);
      setLocationSuggestions(formatted);
    });
  }, []);

  const handlePickImage = async () => {
    if (photos.length >= 4) {
      alert('You can upload up to 4 photos.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access photos is needed.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]?.base64) {
      const base64Uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setPhotos((prev) => [...prev, base64Uri].slice(0, 4));
    }
  };

  const handleTakePhoto = async () => {
    if (photos.length >= 4) {
      alert('You can upload up to 4 photos.');
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Camera permission is required.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]?.base64) {
      const base64Uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setPhotos((prev) => [...prev, base64Uri].slice(0, 4));
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Please provide a short problem title.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please describe what is wrong.');
      return;
    }
    if (!location.trim()) {
      setErrorMsg('Please specify the location.');
      return;
    }
    if (!user) {
      setErrorMsg('You must be logged in to report a problem.');
      return;
    }

    // Step 1: Check for similar issues nearby (Figma duplicate prevention flow)
    if (!bypassSimilarCheck) {
      const matches = await findSimilarComplaints(category, location);
      if (matches.length > 0) {
        setSimilarIssues(matches);
        setShowSimilarSheet(true);
        return;
      }
    }

    executeSubmission();
  };

  const executeSubmission = async () => {
    setLoading(true);
    setShowSimilarSheet(false);

    try {
      let uploadedImageUrl: string | null = null;
      if (photos.length > 0 && photos[0].startsWith('data:image')) {
        try {
          uploadedImageUrl = await uploadComplaintImage(user!.id, photos[0]);
        } catch (uploadErr) {
          console.warn('Image upload failed, submitting without image:', uploadErr);
        }
      }

      const newComplaint = await createComplaint({
        user_id: user!.id,
        title: title.trim(),
        description: description.trim(),
        category,
        location: location.trim(),
        image_url: uploadedImageUrl,
      });

      setSubmittedComplaint(newComplaint);
      setShowSuccessModal(true);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpvoteExisting = async (existing: Complaint) => {
    if (!user) return;
    try {
      await toggleComplaintUpvote(existing.id, user.id);
      setShowSimilarSheet(false);
      router.replace(`/(student)/complaint/${existing.id}`);
    } catch (e) {
      console.error('Failed to upvote existing:', e);
    }
  };

  const handleContinueFiling = () => {
    setBypassSimilarCheck(true);
    setShowSimilarSheet(false);
    executeSubmission();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeftIcon size={18} color={COLORS.textPrimary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.topBarTitle}>Report a problem</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <Text style={styles.pageTitle}>Report a problem</Text>
        <Text style={styles.pageSubtitle}>
          Tell us what’s wrong and where. A clear report helps the right team respond faster.
        </Text>

        {/* Suggestion Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerIcon}>ℹ️</Text>
          <Text style={styles.bannerText}>
            Check similar nearby issues first to avoid duplicate reports.
          </Text>
        </View>

        {errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* 1. Category Selection */}
        <Text style={styles.sectionHeading}>What kind of problem is it?</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryCard,
                  isSelected && styles.categoryCardSelected,
                ]}
                activeOpacity={0.75}
                onPress={() => setCategory(cat)}
              >
                <Text style={styles.categoryIcon}>{CATEGORY_ICONS[cat]}</Text>
                <Text
                  style={[
                    styles.categoryLabel,
                    isSelected && styles.categoryLabelSelected,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 2. Problem Title */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Problem Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Broken light in corridor"
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </View>

        {/* 3. Description */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Describe the problem</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Water is dripping steadily from the ceiling tile near the lab entrance. The floor is becoming slippery."
            placeholderTextColor={COLORS.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* 4. Location */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="Example: Block B, Room 204 or Science Hall, Lab 3"
            placeholderTextColor={COLORS.textMuted}
            value={location}
            onChangeText={setLocation}
          />

          {/* Quick Location Suggestion Chips */}
          {locationSuggestions.length > 0 && !location && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.suggestionScroll}
            >
              {locationSuggestions.slice(0, 5).map((locStr, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.suggestionChip}
                  onPress={() => setLocation(locStr)}
                >
                  <Text style={styles.suggestionChipText}>📍 {locStr}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* 5. Add Photos (Up to 4) */}
        <View style={styles.fieldGroup}>
          <View style={styles.photoHeader}>
            <Text style={styles.label}>Add photos</Text>
            <Text style={styles.photoSubtext}>Up to 4 · JPG or PNG</Text>
          </View>

          <View style={styles.photoButtonsRow}>
            <TouchableOpacity
              style={styles.photoBtn}
              activeOpacity={0.75}
              onPress={handleTakePhoto}
            >
              <CameraIcon size={18} color={COLORS.primary} />
              <Text style={styles.photoBtnText}>Take photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.photoBtn}
              activeOpacity={0.75}
              onPress={handlePickImage}
            >
              <GalleryIcon size={18} color={COLORS.primary} />
              <Text style={styles.photoBtnText}>Gallery</Text>
            </TouchableOpacity>
          </View>

          {/* Photos Preview Grid */}
          {photos.length > 0 && (
            <View style={styles.previewGrid}>
              {photos.map((uri, index) => (
                <View key={index} style={styles.previewItem}>
                  <Image source={{ uri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => handleRemovePhoto(index)}
                  >
                    <CloseIcon size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Submit Report Button */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>Submit report</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Duplicate Prevention Sheet */}
      <SimilarIssuesSheet
        visible={showSimilarSheet}
        issues={similarIssues}
        onClose={() => setShowSimilarSheet(false)}
        onUpvoteExisting={handleUpvoteExisting}
        onContinueFiling={handleContinueFiling}
      />

      {/* Report Submitted Success Modal */}
      {submittedComplaint && (
        <SuccessModal
          visible={showSuccessModal}
          referenceCode={getComplaintReference(submittedComplaint)}
          onViewComplaint={() => {
            setShowSuccessModal(false);
            router.replace(`/(student)/complaint/${submittedComplaint.id}`);
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  pageSubtitle: {
    fontSize: 13.5,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginBottom: 14,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    marginBottom: 20,
  },
  bannerIcon: {
    fontSize: 16,
  },
  bannerText: {
    fontSize: 12.5,
    color: COLORS.primary,
    fontWeight: '600',
    flex: 1,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  categoryCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
  },
  categoryIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  categoryLabelSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  suggestionScroll: {
    marginTop: 8,
  },
  suggestionChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 6,
  },
  suggestionChipText: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoSubtext: {
    fontSize: 11.5,
    color: COLORS.textMuted,
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 12,
  },
  photoBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  previewItem: {
    position: 'relative',
    width: 70,
    height: 70,
    borderRadius: 10,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
