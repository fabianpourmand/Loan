import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

// Helper: Determine file type and name from URI
function getFileInfo(uri: string, providedMimeType?: string): { name: string; type: string } {
  const fileName = uri.split('/').pop() || `file_${Date.now()}`;

  if (providedMimeType) {
    return { name: fileName, type: providedMimeType };
  }

  // Fallback: infer from extension
  if (uri.endsWith('.pdf')) {
    return { name: fileName, type: 'application/pdf' };
  } else if (uri.endsWith('.png')) {
    return { name: fileName, type: 'image/png' };
  } else if (uri.endsWith('.jpg') || uri.endsWith('.jpeg')) {
    return { name: fileName, type: 'image/jpeg' };
  }

  return { name: fileName, type: 'image/jpeg' }; // Default fallback
}

export default function ConfirmScreen() {
  const params = useLocalSearchParams<{
    principalBalance: string;
    noteRate: string;
    scheduledPI: string;
    escrow?: string;
    nextDueDate: string;
    maturityDate?: string;
    fileUri?: string;
    fileName?: string;
    mimeType?: string;
    fileSize?: string;
    imageUri?: string;
    imageName?: string;
    imageWidth?: string;
    imageHeight?: string;
  }>();
  const router = useRouter();

  // Editable fields
  const [principalBalance, setPrincipalBalance] = useState(
    params.principalBalance || ''
  );
  const [noteRate, setNoteRate] = useState(params.noteRate || '');
  const [scheduledPI, setScheduledPI] = useState(params.scheduledPI || '');
  const [escrow, setEscrow] = useState(params.escrow || '');
  const [nextDueDate, setNextDueDate] = useState(params.nextDueDate || '');
  const [maturityDate, setMaturityDate] = useState(params.maturityDate || '');

  // Assumption mode: "monthly" or "daily"
  const [assumptionMode, setAssumptionMode] = useState<'monthly' | 'daily'>(
    'monthly'
  );

  // Extraction state
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  // Number of fields extracted in last run (null = not run yet)
  const [extractedCount, setExtractedCount] = useState<number | null>(null);

  const handleExtract = async () => {
    // Determine which URI to use (imageUri or fileUri)
    const sourceUri = params.imageUri || params.fileUri;
    if (!sourceUri) {
      setExtractError('No file to extract from');
      return;
    }

    setIsExtracting(true);
    setExtractError(null);

    try {
      const { name, type } = getFileInfo(sourceUri, params.mimeType);

      // Build FormData
      const formData = new FormData();
      formData.append('file', {
        uri: sourceUri,
        name,
        type,
      } as any);

      // Get extraction API URL from env or default to localhost
      const extractUrl =
        process.env.EXPO_PUBLIC_EXTRACT_URL || 'http://localhost:8009';

      const response = await fetch(`${extractUrl}/v1/extract`, {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Extraction failed: ${response.status} ${response.statusText}`);
      }

      const api = await response.json();
      const apiFields = api?.fields ?? {};

      const pickValue = (x: any) => {
        if (typeof x === 'string') return x;
        if (x && typeof x.value === 'string') return x.value;
        return '';
      };

      const FIELD_MAP: Record<string, string> = {
        principal_balance: 'principalBalance',
        note_rate: 'noteRate',
        scheduled_pi: 'scheduledPI',
        escrow: 'escrow',
        next_due_date: 'nextDueDate',
        maturity_date: 'maturityDate',
      };

      let updated = 0;
      const updates: Partial<Record<string, string>> = {};

      for (const [apiKey, localKey] of Object.entries(FIELD_MAP)) {
        const incoming = pickValue(apiFields[apiKey]).toString().trim();
        if (!incoming) continue; // don't set blanks

        // get existing value for localKey
        const existing = String(
          (localKey === 'principalBalance' ? principalBalance :
            localKey === 'noteRate' ? noteRate :
            localKey === 'scheduledPI' ? scheduledPI :
            localKey === 'escrow' ? escrow :
            localKey === 'nextDueDate' ? nextDueDate :
            localKey === 'maturityDate' ? maturityDate : '') ?? ''
        ).trim();

        if (existing) continue; // don't overwrite user edits

        updates[localKey] = incoming;
        updated++;
      }

      // Apply updates once
      if (updates.principalBalance) setPrincipalBalance(updates.principalBalance);
      if (updates.noteRate) setNoteRate(updates.noteRate);
      if (updates.scheduledPI) setScheduledPI(updates.scheduledPI);
      if (updates.escrow) setEscrow(updates.escrow);
      if (updates.nextDueDate) setNextDueDate(updates.nextDueDate);
      if (updates.maturityDate) setMaturityDate(updates.maturityDate);

      // Update extract status
      setExtractedCount(updated);
      if (updated === 0) {
        setExtractError('No fields extracted');
      } else {
        setExtractError(null);
      }

      console.log('Extraction successful:', api);
    } catch (error) {
      console.error('Extraction error:', error);
      setExtractError(
        error instanceof Error ? error.message : 'Failed to extract fields'
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleContinue = () => {
    // Phase II placeholder: Would save to AsyncStorage here
    console.log('Saving loan profile:', {
      principalBalance,
      noteRate,
      scheduledPI,
      escrow,
      nextDueDate,
      maturityDate,
      assumptionMode,
    });
    alert('Loan profile saved (placeholder)');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Confirm & Edit Details</Text>
      <Text style={styles.subtitle}>
        Review the extracted fields and adjust as needed
      </Text>

      {params.imageUri && (
        <View style={styles.fileInfo}>
          <Text style={styles.fileInfoTitle}>Captured Photo</Text>
          <Image
            source={{ uri: params.imageUri }}
            style={styles.imagePreview}
            resizeMode="contain"
          />
          <Text style={styles.fileInfoText}>
            <Text style={styles.fileInfoLabel}>Name: </Text>
            {params.imageName || 'photo.jpg'}
          </Text>
          <Text style={styles.fileInfoText}>
            <Text style={styles.fileInfoLabel}>Type: </Text>
            {params.mimeType || 'image/jpeg'}
          </Text>
          {params.imageWidth && params.imageHeight && (
            <Text style={styles.fileInfoText}>
              <Text style={styles.fileInfoLabel}>Dimensions: </Text>
              {params.imageWidth} x {params.imageHeight}
            </Text>
          )}
          <Text style={styles.fileInfoText}>
            <Text style={styles.fileInfoLabel}>URI: </Text>
            {params.imageUri.length > 50
              ? `...${params.imageUri.slice(-50)}`
              : params.imageUri}
          </Text>

          <Pressable
            style={[styles.extractButton, isExtracting && styles.extractButtonDisabled]}
            onPress={handleExtract}
            disabled={isExtracting}
          >
            {isExtracting ? (
              <View style={styles.extractButtonContent}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.extractButtonText}>Extracting...</Text>
              </View>
            ) : (
              <Text style={styles.extractButtonText}>Extract Fields</Text>
            )}
          </Pressable>

          {extractError && (
            <Text style={styles.errorText}>{extractError}</Text>
          )}
          {extractedCount !== null && (
            <Text style={styles.extractionSuccess}>{`Extracted ${extractedCount} fields`}</Text>
          )}
        </View>
      )}

      {params.fileUri && !params.imageUri && (
        <View style={styles.fileInfo}>
          <Text style={styles.fileInfoTitle}>Selected File</Text>
          <Text style={styles.fileInfoText}>
            <Text style={styles.fileInfoLabel}>Name: </Text>
            {params.fileName}
          </Text>
          <Text style={styles.fileInfoText}>
            <Text style={styles.fileInfoLabel}>Type: </Text>
            {params.mimeType}
          </Text>
          <Text style={styles.fileInfoText}>
            <Text style={styles.fileInfoLabel}>Size: </Text>
            {params.fileSize ? `${(parseInt(params.fileSize) / 1024).toFixed(1)} KB` : 'Unknown'}
          </Text>
          <Text style={styles.fileInfoText}>
            <Text style={styles.fileInfoLabel}>URI: </Text>
            {params.fileUri.length > 50
              ? `...${params.fileUri.slice(-50)}`
              : params.fileUri}
          </Text>

          <Pressable
            style={[styles.extractButton, isExtracting && styles.extractButtonDisabled]}
            onPress={handleExtract}
            disabled={isExtracting}
          >
            {isExtracting ? (
              <View style={styles.extractButtonContent}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.extractButtonText}>Extracting...</Text>
              </View>
            ) : (
              <Text style={styles.extractButtonText}>Extract Fields</Text>
            )}
          </Pressable>

          {extractError && (
            <Text style={styles.errorText}>{extractError}</Text>
          )}
          {extractedCount !== null && (
            <Text style={styles.extractionSuccess}>{`Extracted ${extractedCount} fields`}</Text>
          )}
        </View>
      )}

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Principal Balance</Text>
          <TextInput
            style={styles.input}
            value={principalBalance}
            onChangeText={setPrincipalBalance}
            keyboardType="numeric"
            placeholder="300000"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Note Rate (%)</Text>
          <TextInput
            style={styles.input}
            value={noteRate}
            onChangeText={setNoteRate}
            keyboardType="decimal-pad"
            placeholder="6.5"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Scheduled P&I Payment</Text>
          <TextInput
            style={styles.input}
            value={scheduledPI}
            onChangeText={setScheduledPI}
            keyboardType="decimal-pad"
            placeholder="1896.20"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Escrow (optional)</Text>
          <TextInput
            style={styles.input}
            value={escrow}
            onChangeText={setEscrow}
            keyboardType="decimal-pad"
            placeholder="450.00"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Next Due Date</Text>
          <TextInput
            style={styles.input}
            value={nextDueDate}
            onChangeText={setNextDueDate}
            placeholder="2026-02-01"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Maturity Date (optional)</Text>
          <TextInput
            style={styles.input}
            value={maturityDate}
            onChangeText={setMaturityDate}
            placeholder="2056-01-01"
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.field}>
          <Text style={styles.label}>Assumption Mode</Text>
          <View style={styles.toggleContainer}>
            <Text
              style={[
                styles.toggleLabel,
                assumptionMode === 'monthly' && styles.toggleLabelActive,
              ]}
            >
              Monthly
            </Text>
            <Switch
              value={assumptionMode === 'daily'}
              onValueChange={(value) =>
                setAssumptionMode(value ? 'daily' : 'monthly')
              }
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={assumptionMode === 'daily' ? '#007AFF' : '#f4f3f4'}
            />
            <Text
              style={[
                styles.toggleLabel,
                assumptionMode === 'daily' && styles.toggleLabelActive,
              ]}
            >
              Daily
            </Text>
          </View>
          <Text style={styles.helpText}>
            {assumptionMode === 'monthly'
              ? 'Standard monthly amortization (most common)'
              : 'Daily simple interest accrual (some lenders use this)'}
          </Text>
        </View>

        <Pressable style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginHorizontal: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  form: {
    padding: 20,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#666',
  },
  toggleLabelActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 40,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  fileInfo: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  fileInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 12,
  },
  fileInfoText: {
    fontSize: 13,
    color: '#334155',
    marginBottom: 6,
  },
  fileInfoLabel: {
    fontWeight: '600',
    color: '#1e293b',
  },
  extractionNote: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 8,
    fontStyle: 'italic',
  },
  extractionSuccess: {
    fontSize: 13,
    color: '#065f46',
    marginTop: 8,
    fontWeight: '600',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#e5e7eb',
  },
  extractButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 6,
    marginTop: 12,
    alignItems: 'center',
  },
  extractButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  extractButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  extractButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginTop: 8,
    fontWeight: '500',
  },
});
