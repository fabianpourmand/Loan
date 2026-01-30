import { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function CaptureScreen() {
  const router = useRouter();
  const [cameraMode, setCameraMode] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const handlePickPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      if (file) {
        // Navigate to confirm with file info
        router.push({
          pathname: '/confirm',
          params: {
            fileUri: file.uri,
            fileName: file.name,
            mimeType: file.mimeType || 'application/pdf',
            fileSize: file.size?.toString() || '0',
          },
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick PDF file');
      console.error('PDF picker error:', error);
    }
  };

  const handleTakePhoto = async () => {
    if (!permission) {
      return;
    }

    if (!permission.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Permission Denied', 'Camera access is required to take photos.');
        return;
      }
    }

    setCameraMode(true);
  };

  const handleCapturePhoto = async () => {
    if (!cameraRef.current) {
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync();
      if (photo) {
        setCameraMode(false);

        // Navigate to confirm with image info
        router.push({
          pathname: '/confirm',
          params: {
            imageUri: photo.uri,
            imageName: `photo_${Date.now()}.jpg`,
            mimeType: 'image/jpeg',
            imageWidth: photo.width?.toString() || '0',
            imageHeight: photo.height?.toString() || '0',
          },
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture photo');
      console.error('Camera capture error:', error);
      setCameraMode(false);
    }
  };

  const handleUseSampleStatement = () => {
    // Mock extracted fields for Phase II placeholder
    const mockData = {
      principalBalance: '300000',
      noteRate: '6.5',
      scheduledPI: '1896.20',
      escrow: '450.00',
      nextDueDate: '2026-02-01',
      maturityDate: '2056-01-01',
    };

    // Navigate to confirm with mocked data
    router.push({
      pathname: '/confirm',
      params: mockData,
    });
  };

  if (cameraMode) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} ref={cameraRef} facing="back">
          <View style={styles.cameraControls}>
            <Pressable
              style={styles.cancelButton}
              onPress={() => setCameraMode(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={styles.captureButton}
              onPress={handleCapturePhoto}
            >
              <Text style={styles.buttonText}>Capture</Text>
            </Pressable>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Capture Statement</Text>

      <Pressable style={styles.button} onPress={handleTakePhoto}>
        <Text style={styles.buttonText}>Take Photo</Text>
      </Pressable>

      <Pressable style={styles.button} onPress={handlePickPDF}>
        <Text style={styles.buttonText}>Pick PDF</Text>
      </Pressable>

      <Pressable
        style={[styles.button, styles.secondaryButton]}
        onPress={handleUseSampleStatement}
      >
        <Text style={styles.buttonText}>Use sample statement</Text>
      </Pressable>

      <Text style={styles.note}>
        Phase II: Camera capture (A-01), PDF import (A-02), and extraction API
        (A-03) integrated. Tap Extract on the confirm screen.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 12,
    minWidth: 250,
  },
  secondaryButton: {
    backgroundColor: '#5AC8FA',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  note: {
    fontSize: 12,
    color: '#666',
    marginTop: 32,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  captureButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
});
