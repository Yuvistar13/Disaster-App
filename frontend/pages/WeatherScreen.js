import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView } from "react-native";
import MapView, { Marker, UrlTile, Callout } from "react-native-maps";
import * as Location from 'expo-location';
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CITIES = [
  { name: "London", latitude: 51.5074, longitude: -0.1278 },
  { name: "Birmingham", latitude: 52.4862, longitude: -1.8904 },
  { name: "Manchester", latitude: 53.4839, longitude: -2.2446 },
  { name: "Glasgow", latitude: 55.8642, longitude: -4.2518 },
  { name: "Liverpool", latitude: 53.4084, longitude: -2.9916 },
  { name: "Leeds", latitude: 53.8008, longitude: -1.5491 },
  { name: "Sheffield", latitude: 53.3811, longitude: -1.4701 },
  { name: "Edinburgh", latitude: 55.9533, longitude: -3.1883 },
  { name: "Bristol", latitude: 51.4545, longitude: -2.5879 },
  { name: "Newcastle", latitude: 54.9783, longitude: -1.6174 },
  { name: "Cardiff", latitude: 51.4816, longitude: -3.1791 },
  { name: "Belfast", latitude: 54.5973, longitude: -5.9301 },
  { name: "Verona", latitude: 45.4384, longitude: 10.9916 },
];

const capitalizeWords = (str) => {
  return str.replace(/\b\w/g, char => char.toUpperCase());
};

// Move API key to an environment variable in a real app
const API_KEY = "bcae35948e7ca89c4ad35f3e4122eec1"; 

const WeatherScreen = () => {
  const [location, setLocation] = useState(null);
  const [weatherData, setWeatherData] = useState({});
  const [activeLayer, setActiveLayer] = useState("temp_new"); // Default to temperature layer
  
  // Available weather layers
  const weatherLayers = {
    temp_new: "Temperature",
    precipitation_new: "Precipitation",
    wind_new: "Wind",
    pressure_new: "Pressure"
  };

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.log("Location permission denied");
          return;
        }

        const userLocation = await Location.getCurrentPositionAsync({});
        setLocation(userLocation.coords);
        await AsyncStorage.setItem('userLocation', JSON.stringify(userLocation.coords));

      } catch (error) {
        console.log("Error getting location:", error);
      }
    };

    const fetchWeather = async () => {
      let data = {};
      for (const city of CITIES) {
        try {
          const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?lat=${city.latitude}&lon=${city.longitude}&appid=${API_KEY}&units=metric`
          );
          data[city.name] = {
            temp: response.data.main.temp,
            description: capitalizeWords(response.data.weather[0].description),
            wind: response.data.wind,
            rain: response.data.rain?.["1h"] || 0,
            pressure: response.data.main,
            icon: response.data.weather[0].icon
          };
        } catch (error) {
          console.log(`Error fetching weather for ${city.name}:`, error);
        }
      }
      setWeatherData(data);
    };

    fetchLocation();
    fetchWeather();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Layer selection buttons */}
      <View style={styles.layerButtons}>
        {Object.entries(weatherLayers).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.layerButton,
              activeLayer === key && styles.activeLayerButton
            ]}
            onPress={() => setActiveLayer(key)}
          >
            <Text style={[
              styles.layerButtonText, 
              activeLayer === key ? styles.activeLayerButtonText : null
            ]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <MapView
        style={styles.map}
        region={location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 5,
          longitudeDelta: 5,
        } : {
          latitude: 54.0, // Center of UK
          longitude: -2.0,
          latitudeDelta: 10,
          longitudeDelta: 10,
        }}
      >
        {/* Weather layer from OpenWeatherMap */}
        <UrlTile
          urlTemplate={`https://tile.openweathermap.org/map/${activeLayer}/{z}/{x}/{y}.png?appid=${API_KEY}`}
          maximumZ={19}
          tileSize={256}
          zIndex={1}
          opacity={0.6}
        />

        {/* User's location marker */}
        {location && (
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            pinColor="blue"
            title="Your Location"
          />
        )}

        {/* City markers with temperature display */}
        { activeLayer=="temp_new" && (CITIES.map((city) => (
          <Marker
            key={city.name}
            coordinate={{
              latitude: city.latitude,
              longitude: city.longitude,
            }}
            title={city.name}
            description={weatherData[city.name] ? 
              `${weatherData[city.name].temp.toFixed(1)}°C, ${weatherData[city.name].description}` : 
              "Loading..."}
          >
            {/* Small temperature label directly on the map */}
            {weatherData[city.name] && (
              <View style={styles.tempLabel}>
                <Text style={styles.tempText}>
                  {weatherData[city.name].temp.toFixed(1)}°C
                </Text>
              </View>
            )}
            

          </Marker>
        )))}

        { activeLayer=="precipitation_new" && (CITIES.map((city) => (
          <Marker
            key={city.name}
            coordinate={{
              latitude: city.latitude,
              longitude: city.longitude,
            }}
            title={city.name}
            description={weatherData[city.name] ? 
              `${weatherData[city.name].rain} mm, ${weatherData[city.name].description}` : 
              "Loading..."}
          >
            {/* Small temperature label directly on the map */}
            {weatherData[city.name] && (
              <View style={styles.tempLabel}>
                <Text style={styles.tempText}>
                  {weatherData[city.name].rain.toFixed(1)} mm
                </Text>
              </View>
            )}
            

          </Marker>
        )))}

        { activeLayer=="wind_new" && (CITIES.map((city) => (
          <Marker
            key={city.name}
            coordinate={{
              latitude: city.latitude,
              longitude: city.longitude,
            }}
            title={city.name}
            description={weatherData[city.name] ? 
              `${weatherData[city.name].wind.speed} m/s, ${weatherData[city.name].wind.deg}°` : 
              "Loading..."}
          >
            {/* Small wind label directly on the map */}
            {weatherData[city.name] && (
              <View style={styles.tempLabel}>
                <Text style={styles.tempText}>
                  {weatherData[city.name].wind.speed.toFixed(1)} m/s
                </Text>
              </View>
            )}
            

          </Marker>
        )))}

        { activeLayer=="pressure_new" && (CITIES.map((city) => (
          <Marker
            key={city.name}
            coordinate={{
              latitude: city.latitude,
              longitude: city.longitude,
            }}
            title={city.name}
            description={weatherData[city.name] ? 
              `Sea Level: ${weatherData[city.name].pressure.sea_level} hPa, Ground Level: ${weatherData[city.name].pressure.grnd_level} hPa` : 
              "Loading..."}
          >
            {/* Small temperature label directly on the map */}
            {weatherData[city.name] && (
              <View style={styles.tempLabel}>
                <Text style={styles.tempText}>
                  {weatherData[city.name].pressure.pressure} hPa
                </Text>
              </View>
            )}
            

          </Marker>
        )))}
      </MapView>

      {/* Weather information legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>
          {weatherLayers[activeLayer]} Layer
        </Text>
        <Text style={styles.legendInfo}>
          {activeLayer === "temp_new" && "Blue: Cold • Red: Hot"}
          {activeLayer === "precipitation_new" && "Green: Light • Red: Heavy"}
          {activeLayer === "clouds_new" && "White: Few • Dark: Many"}
          {activeLayer === "wind_new" && "Green: Light • Orange: Strong"}
          {activeLayer === "pressure_new" && "Blue: Low • Red: High"}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  layerButtons: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 10,
    padding: 5,
  },
  layerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  activeLayerButton: {
    backgroundColor: '#007AFF',
  },
  layerButtonText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  activeLayerButtonText: {
    color: 'white',
  },
  tempLabel: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  tempText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  calloutBubble: {
    width: 160,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  calloutInfo: {
    fontSize: 14,
    marginBottom: 2,
  },
  legend: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  legendTitle: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  legendInfo: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default WeatherScreen;