import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, Image, TouchableOpacity, SafeAreaView} from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";
import * as Location from 'expo-location';
import axios from 'axios';


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
  ];

const API_KEY = "bcae35948e7ca89c4ad35f3e4122eec1";

const ResourcesScreen = ({navigation}) => {

    return (
        <View style={styles.container}>
            <View style={styles.resourceIcons}>
                <View style={styles.row}>

                    <TouchableOpacity 
                        style={styles.resourceIcon}
                        onPress={() => navigation.navigate("Hospital")}>
                        <Image
                            source={require("../images/hospital.png")}
                            style={{ width: 150, height: 150}}
                        />   
                        <Text style={styles.resourceIconText}>Hospital</Text>
                    </TouchableOpacity>    

                    <TouchableOpacity 
                        style={styles.resourceIcon}
                        onPress={() => navigation.navigate("Volunteer")}>
                        <Image
                            source={require("../images/volunteer.png")}
                            style={{ width: 150, height: 150}}
                        />   
                        <Text style={styles.resourceIconText}>Volunteer</Text>
                    </TouchableOpacity> 
                </View>

                <View style={styles.row}>
                    <TouchableOpacity 
                        style={styles.resourceIcon}
                        onPress={() => navigation.navigate("Food")}>
                        <Image
                            source={require("../images/food.png")}
                            style={{ width: 150, height: 150}}
                        />   
                        <Text style={styles.resourceIconText}>Food</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.resourceIcon}
                        onPress={() => navigation.navigate("Shelter")}>
                        <Image
                            source={require("../images/shelter.png")}
                            style={{ width: 150, height: 150}}
                        />   
                        <Text style={styles.resourceIconText}>Shelter</Text>
                    </TouchableOpacity>                            
                </View>
            </View>        
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    map: {
        width: '100%',
        height: '100%',
    },

    cityName: { 
        fontWeight: "bold", 
        fontSize: 14 
    },
    resourceIcons: {
        flex: 1,
        marginTop: "25%",
    },

    row: {
        display: "flex",
        flexDirection: "row",
        marginBottom: 20,
        padding: 20,
        justifyContent: "space-between",
    },

    resourceIcon: {
        flex: 1,
        flexDirection: "column",
        gap: 10,
        alignItems: "center",
    },

    resourceIconText: {
        fontSize: 20,
        fontWeight: "bold",
        textAlign: "center",
    },

});

export default ResourcesScreen;