import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; 
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack"; 
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";


import LoginScreen from "./pages/LoginScreen";
import WeatherScreen from "./pages/WeatherScreen";
import ResourcesScreen from "./pages/ResourcesScreen";
import VolunteerScreen from "./pages/VolunteerScreen";
import MessagesScreen from "./pages/MessagesScreen";
import LogoutScreen from "./pages/LogoutScreen";

import HospitalMap from "./MapScreens/HospitalMap";
import VolunteerMap from "./MapScreens/VolunteerMap";
import FoodMap from "./MapScreens/FoodMap";
import ShelterMap from "./MapScreens/ShelterMap";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const CustomHeader = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safeArea}> 
      <View style={styles.header}>
        <Text style={styles.headerText}>DisasterApp</Text>
        <View style={styles.iconContainer}>
          <TouchableOpacity onPress={() => navigation.navigate("Messages")}>
            <Ionicons name="chatbubbles-outline" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("Volunteer Management")}>
            <MaterialIcons name="volunteer-activism" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === "Weather") {
          iconName = focused ? "sunny" : "sunny-outline";
        } else if (route.name === "Resources") {
          iconName = focused ? "book" : "book-outline";
        } else if (route.name === "Account") {
          iconName = focused ? "person" : "person-outline";
        }
        return <Ionicons name={iconName} size={size} color={color} />;
      },
    })}
    tabBarOptions={{
      activeTintColor: "tomato",
      inactiveTintColor: "gray",
    }}
  >
    <Tab.Screen name="Weather" component={WeatherScreen} />
    <Tab.Screen name="Resources" component={ResourcesScreen} />
    <Tab.Screen name="Account" component={LogoutScreen} />
  </Tab.Navigator>
);

const AppStack = () => {

  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {

    const clearTokens = async () => {
      try {
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('refreshToken');
        await AsyncStorage.removeItem('userData');
      } catch (error) {
        console.error("Error clearing tokens:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    clearTokens();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="Main" 
        options={({ navigation }) => ({
          header: () => <CustomHeader navigation={navigation} />,
        })}
      >
        {props =>(
          <TabNavigator {...props} currentUser={currentUser}/>
        )}
      </Stack.Screen>
      <Stack.Screen name="Messages" component={MessagesScreen} options={{ headerShown: false }}/>
      <Stack.Screen name="Volunteer Management" component={VolunteerScreen} />
      <Stack.Screen name="Hospital" component={HospitalMap} />
      <Stack.Screen name="Volunteer" component={VolunteerMap} />
      <Stack.Screen name="Food" component={FoodMap} />
      <Stack.Screen name="Shelter" component={ShelterMap} />
    </Stack.Navigator>
  );
};


export default function App() {
  return (
    <NavigationContainer>
      <AppStack />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "tomato", 
  },
  header: {
    height: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  headerText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  iconContainer: {
    flexDirection: "row",
    gap: 20,
  },
  screen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
