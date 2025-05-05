import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useState, useEffect} from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../pages/API_URL';

export default function VolunteerMap() {

  const [volunteerLocations, setVolunteerLocations] = useState([{ Volunteers: [] }]);
  const [currentLocation, setCurrentLocation] = useState(null);

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

      const fetchVolunteers = async () => {
          try {
              const response = await fetch(`${API_URL}/api/volunteers/`,{
                  method: 'GET',
                  headers: {
                      'Content-Type': 'application/json',
                  },
              });
              const data = await response.json();
              setVolunteerLocations(data);


          } catch (error) {
              console.error("Error fetching volunteers:", error);
          }
      };
      fetchLocation();
      fetchVolunteers();
  }, []); 

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

            {volunteerLocations.Volunteers && 
              volunteerLocations.Volunteers.map((vl, index) => (
                <Marker
                  key={index}
                  coordinate={{
                    latitude: parseFloat(vl.location.split(',')[0].trim()),
                    longitude: parseFloat(vl.location.split(',')[1].trim()),
                  }}
                  title={`${vl.name} (${vl.phone_number})`}
                  description={vl.task ? `${vl.task}` : "No task assigned"}
                />
              ))
            }

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