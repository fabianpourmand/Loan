import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

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

      {params.fileUri && (
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
          <Text style={styles.extractionNote}>
            Note: Extraction endpoint (A-03) not yet implemented. Fields below
            show sample data.
          </Text>
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
});
