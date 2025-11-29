import { StatusBar, useColorScheme, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useEffect, useState } from 'react';
import { initDatabase } from './src/services/database';
import { migrateDataToSQLite } from './src/services/migration';
import { bootstrapAutoBackupScheduler } from './src/services/autoBackup';
import BuyerList from './src/screens/BuyerList.jsx';
import BuyerDetail from './src/screens/BuyerDetail.jsx';
import SellerDetail from './src/screens/SellerDetail.jsx';
import StatisticsScreen from './src/screens/StatisticsScreen.jsx';
import TransactionsScreen from './src/screens/TransactionsScreen.jsx';
import SettingsScreen from './src/screens/SettingsScreen.jsx';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [dbInitialized, setDbInitialized] = useState(false);

  useEffect(() => {
    // Initialize database and migrate data when app starts
    const initializeApp = async () => {
      try {
        // First initialize the database
        await initDatabase();
        console.log('Database initialized');

        // Then migrate existing data from AsyncStorage
        const migrationResult = await migrateDataToSQLite();
        if (migrationResult.success) {
          if (migrationResult.alreadyMigrated) {
            console.log('Data already migrated');
          } else {
            console.log('Data migrated successfully:', migrationResult);
          }
        } else {
          console.error('Migration failed:', migrationResult.error);
        }

        setDbInitialized(true);

        // Start auto backup scheduler after database is ready
        bootstrapAutoBackupScheduler().catch(error => {
          console.warn('Không thể khởi động bộ hẹn giờ sao lưu', error);
        });
      } catch (error) {
        console.error('Failed to initialize app:', error);
        // Still set to true to allow app to start even if init fails
        setDbInitialized(true);
      }
    };

    initializeApp();
  }, []);

  // Show loading screen while database is initializing
  if (!dbInitialized) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <LinearGradient
        colors={['#f0fdf4', '#dcfce7', '#bbf7d0']}
        style={styles.gradient}
      >
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <AppNavigator />
      </LinearGradient>
    </SafeAreaProvider>
  );
}

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Overview"
        component={BuyerList}
        options={{
          tabBarLabel: 'Tổng quan',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={{
          tabBarLabel: 'Thống kê',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>📊</Text>,
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          tabBarLabel: 'Thu chi',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>💰</Text>,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Cài đặt',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>⚙️</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Main"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="BuyerDetail" component={BuyerDetail} />
        <Stack.Screen name="SellerDetail" component={SellerDetail} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});

export default App;
