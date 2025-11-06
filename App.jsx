import { StatusBar, useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SplashScreen from './src/screens/SplashScreen.jsx';
import BuyerList from './src/screens/BuyerList.jsx';
import BuyerDetail from './src/screens/BuyerDetail.jsx';
import SellerDetail from './src/screens/SellerDetail.jsx';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

const Stack = createNativeStackNavigator();

function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="BuyerList" component={BuyerList} />
        <Stack.Screen name="BuyerDetail" component={BuyerDetail} />
        <Stack.Screen name="SellerDetail" component={SellerDetail} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
