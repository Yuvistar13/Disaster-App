import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CurrentRenderContext } from '@react-navigation/native';

API_KEY = "AIzaSyBaLnkt5wTku3ztYdbOIaGixkhacrpYceU";

export default function ShelterMap() {

    const [currentLocation, setCurrentLocation] = useState(null);
    const [shelterData, setShelterData] = useState([]);

    useEffect(() => {
        const fetchLocation = async () => {
            try {
                const loc = await AsyncStorage.getItem('userLocation');
                if (loc) {
                    const location = JSON.parse(loc);
                    setCurrentLocation(location);
                } else {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status !== 'granted') {
                        Alert.alert('Permission to access location was denied');
                        return;
                    }

                    const location = await Location.getCurrentPositionAsync({});
                    setCurrentLocation(location.coords);
                    await AsyncStorage.setItem('userLocation', JSON.stringify(location.coords));
                }
            } catch (error) {
                console.log("Error getting location:", error);
            }
        };
  
      fetchLocation();
    }, []); 
    
    useEffect(() => {
        const fetchShelterData = async () => {
            if (!currentLocation) return;
    
            try {
                const response = await fetch(
                    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${currentLocation.latitude},${currentLocation.longitude}&radius=5000&keyword=shelter&key=${API_KEY}`
                );
                const data = await response.json();
                setShelterData(data.results);
            } catch (error) {
                console.error(error);
            }
        };
    
        fetchShelterData();
    }, [currentLocation]); 

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                region={currentLocation ? {
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                    latitudeDelta: 5,
                    longitudeDelta: 5,
                  } : {
                    latitude: 54.0,
                    longitude: -2.0,
                    latitudeDelta: 10,
                    longitudeDelta: 10,
                }}
            >
                {currentLocation && (
                    <Marker
                        coordinate={{
                        latitude: currentLocation.latitude,
                        longitude: currentLocation.longitude,
                        }}
                        pinColor="blue"
                        title="Your Location"
                    />
                )}

                {shelterData.map((shelter, index) => (
                    <Marker
                        key={index}
                        coordinate={{
                            latitude: shelter.geometry.location.lat,
                            longitude: shelter.geometry.location.lng,
                        }}
                        title={shelter.name}
                        description={shelter.vicinity}
                    />
                ))}

            </MapView>
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    map: {
        width: '100%',
        height: '100%',
    },
});