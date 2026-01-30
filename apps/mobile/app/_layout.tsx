import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#f5f5f5',
        },
        headerTintColor: '#000',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Loanalize',
        }}
      />
      <Stack.Screen
        name="capture"
        options={{
          title: 'Capture Statement',
        }}
      />
      <Stack.Screen
        name="confirm"
        options={{
          title: 'Confirm Details',
        }}
      />
    </Stack>
  );
}
