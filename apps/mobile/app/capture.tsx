import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';

export default function CaptureScreen() {
  const router = useRouter();

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
        // Note: Extraction endpoint (A-03) not implemented yet
        // For now, just show file info and use sample data
        router.push({
          pathname: '/confirm',
          params: {
            fileUri: file.uri,
            fileName: file.name,
            mimeType: file.mimeType || 'application/pdf',
            fileSize: file.size?.toString() || '0',
            // Include sample data for now (extraction placeholder)
            principalBalance: '300000',
            noteRate: '6.5',
            scheduledPI: '1896.20',
            escrow: '450.00',
            nextDueDate: '2026-02-01',
            maturityDate: '2056-01-01',
          },
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick PDF file');
      console.error('PDF picker error:', error);
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Capture Statement</Text>
      <Text style={styles.placeholder}>
        [Camera placeholder - Not implemented yet]
      </Text>

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
        Phase II: PDF import (A-02) functional. Camera capture (A-01) and
        extraction endpoint (A-03) coming next.
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
  placeholder: {
    fontSize: 16,
    color: '#999',
    marginBottom: 16,
    fontStyle: 'italic',
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
});
