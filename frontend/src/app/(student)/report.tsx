import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { createComplaint, uploadComplaintImage } from '@/lib/api';
import { Category } from '@/types';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Chips } from '@/components/Chips';
import { InlineMessage } from '@/components/InlineMessage';
import { COLORS, LAYOUT } from '@/constants/theme';

const CATEGORIES: Category[] = [
  'Lighting',
  'Furniture',
  'Water Leakage',
  'Cleanliness',
  'Equipment',
  'Network',
];

export default function ReportProblemScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('Lighting');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handlePickImage = async (source: 'gallery' | 'camera') => {
    try {
      const permissionResult =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setErrorMsg(
          source === 'camera'
            ? 'Permission to use the camera is required!'
            : 'Permission to access photo gallery is required!'
        );
        return;
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        if (asset.base64) {
          setImageBase64(asset.base64);
        }
        setErrorMsg(null);
      }
    } catch (err: any) {
      setErrorMsg('Failed to pick image: ' + err.message);
    }
  };

  const handleRemoveImage = () => {
    setImageUri(null);
    setImageBase64(null);
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      setErrorMsg('User authentication error.');
      return;
    }

    if (!title.trim()) {
      setErrorMsg('Please enter a title for the problem.');
      return;
    }
    if (!location.trim()) {
      setErrorMsg('Please specify the location.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please provide a description.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let uploadedPublicUrl: string | null = null;
      if (imageBase64) {
        uploadedPublicUrl = await uploadComplaintImage(user.id, imageBase64);
      }

      await createComplaint({
        user_id: user.id,
        title: title.trim(),
        category,
        location: location.trim(),
        description: description.trim(),
        image_url: uploadedPublicUrl,
      });

      setSuccessMsg('Complaint submitted successfully!');
      setTimeout(() => {
        router.replace('/(student)');
      }, 1200);
    } catch (err: any) {
      console.error('Submit error:', err);
      setErrorMsg(err.message || 'Failed to submit complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report a Campus Problem</Text>
        </View>

        {errorMsg ? <InlineMessage type="error" message={errorMsg} /> : null}
        {successMsg ? <InlineMessage type="success" message={successMsg} /> : null}

        <Input
          label="Problem Title *"
          placeholder="e.g. Broken light bulb in hallway"
          value={title}
          onChangeText={(text: string) => {
            setTitle(text);
            setErrorMsg(null);
          }}
        />

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Category *</Text>
          <Chips
            options={CATEGORIES}
            selectedValue={category}
            onSelect={(val: string) => setCategory(val as Category)}
          />
        </View>

        <Input
          label="Location *"
          placeholder="e.g. Block B, 2nd Floor, Room 204"
          value={location}
          onChangeText={(text: string) => {
            setLocation(text);
            setErrorMsg(null);
          }}
        />

        <Input
          label="Description *"
          placeholder="Describe the issue in detail so maintenance team can fix it quickly..."
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={(text: string) => {
            setDescription(text);
            setErrorMsg(null);
          }}
          style={styles.textArea}
        />

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Attach Photo (Optional)</Text>
          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
              <TouchableOpacity style={styles.removeImageBtn} onPress={handleRemoveImage}>
                <Text style={styles.removeImageText}>✕ Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.uploadRow}>
              <TouchableOpacity
                style={[styles.uploadBox, styles.uploadBoxFlex]}
                onPress={() => handlePickImage('gallery')}
              >
                <Text style={styles.uploadIcon}>🖼️</Text>
                <Text style={styles.uploadText}>Upload Image</Text>
                <Text style={styles.uploadSubtext}>Select photo from device</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.uploadBox, styles.uploadBoxFlex]}
                onPress={() => handlePickImage('camera')}
              >
                <Text style={styles.uploadIcon}>📷</Text>
                <Text style={styles.uploadText}>Take Photo</Text>
                <Text style={styles.uploadSubtext}>Use your camera</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Button
          title="Submit Complaint"
          onPress={handleSubmit}
          loading={submitting}
          style={styles.submitBtn}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingVertical: 24,
    paddingHorizontal: LAYOUT.paddingHorizontal,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  card: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: COLORS.cardBackground,
    borderRadius: LAYOUT.cardRadius,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  header: {
    marginBottom: 20,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  backText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  uploadRow: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadBoxFlex: {
    flex: 1,
  },
  uploadBox: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  uploadSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    gap: 8,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: COLORS.inputBg,
  },
  removeImageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  removeImageText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },
  submitBtn: {
    marginTop: 12,
  },
});
