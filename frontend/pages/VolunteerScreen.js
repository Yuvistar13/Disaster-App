import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, Pressable, Modal, Switch, Alert } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VolunteerCopyScreen = () => {
    const [currentLocation, setCurrentLocation] = useState(null);
    const [volunteers, setVolunteers] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);

    const [newVolunteer, setNewVolunteer] = useState({ 
        location: '', 
        task: '',
        availability: false 
    });

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
                const response = await fetch('http://192.168.0.67:8000/api/volunteers/', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                const data = await response.json();
                console.log("Fetched volunteers:", data);
                setVolunteers(data);
            } catch (error) {
                console.error("Error fetching volunteers:", error);
            }
        };
        
        fetchLocation();
        fetchVolunteers();
    }, []);

    const createVolunteer = async () => {
        try {
            const token = await AsyncStorage.getItem('accessToken');

            const volunteerData = {
                ...newVolunteer,
                location: currentLocation ? `${currentLocation.latitude},${currentLocation.longitude}` : '', // or better format if needed
            };
            
            const response = await fetch('http://192.168.0.67:8000/api/volunteers/create/', {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(volunteerData),
            });
            
            const data = await response.json();

            if (!response.ok) {
                Alert.alert("You have already registered as a volunteer!");
            }

            console.log("Volunteer created:", data);
            setModalVisible(false);

        } catch (error) {
        console.error("Error creating volunteer:", error);
        }
    };

    const handleInputChange = (name, value) => {
        setNewVolunteer({ ...newVolunteer, [name]: value });
    };

    const handleRemoveVolunteer = async () => {

        Alert.alert(
            "Are you sure you want to remove yourself as a volunteer?",
            "This action cannot be undone.",
            [
                {
                    text: "Cancel",
                    onPress: () => console.log("Cancel Pressed"),
                    style: "cancel"
                },
                {
                    text: "OK",
                    onPress: () => removeVolunteer()
                }
            ]
        );
    }

    const removeVolunteer = async () => {
        try{
            const userData = await AsyncStorage.getItem('userData');
            const user = JSON.parse(userData);

            const volunteer = volunteers.Volunteers.find(v => v.user_id === user.id);

            if (!volunteer) {
                Alert.alert("You are not a registered volunteer!");
                return;
            }
    
            const response = await fetch(`http://192.168.0.67:8000/api/volunteers/remove/${volunteer.id}/`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
    
            if (response.ok) {
                Alert.alert("You have been removed as a volunteer.");
            } else {
                Alert.alert("Failed to remove volunteer.");
            }
    
        } catch (error) {
            console.error("Error removing volunteer:", error);
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.subHeader}>Current Volunteers</Text>
                <View style={styles.headings}>
                    <Text style={styles.heading}>Name</Text>
                    <Text style={styles.heading}>Phone Number</Text>
                    <Text style={styles.heading}>Availability</Text>
                    <Text style={styles.heading}>Task</Text>
                </View>
                <View>
                    <FlatList
                        style={styles.listContainer}
                        data={volunteers.Volunteers}
                        keyExtractor={(item, index) => `${item.id || ''}-${index}`}
                        renderItem={({ item }) => (
                            <View style={styles.row}>
                                <Text style={styles.cell}>{item.name}</Text>
                                <Text style={styles.cell}>{item.phone_number}</Text>
                                <Text style={styles.cell}>{item.availability ? "Yes" : "No"}</Text>
                                <Text style={styles.cell}>{item.task}</Text>
                            </View>
                        )}
                    />
                </View>
            </View>
            
            {/* Registration Modal */}
            <View style={styles.centeredView}>
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={styles.centeredView}>
                        <View style={styles.modalView}>
                            <View style={styles.form}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Task Description"
                                    value={newVolunteer.task}
                                    onChangeText={(text) => handleInputChange('task', text)}
                                />
                                <View style={styles.switchContainer}>
                                    <Text style={{ marginBottom: 10 }}>Available?</Text>
                                    <Switch
                                        value={newVolunteer.availability}
                                        onValueChange={(value) => handleInputChange('availability', value)}
                                    />
                                </View>
                            </View>
                            <View style={styles.modalButtons}>
                                <Pressable
                                    style={[styles.button, styles.buttonClose]}
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Text style={styles.textStyle}>Close</Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.button, styles.buttonRegister]}
                                    onPress={createVolunteer}
                                >
                                    <Text style={styles.textStyle}>Submit</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </Modal>

                <View style={styles.volunteerButtons}>
                    <Pressable
                        style={[styles.button, styles.buttonOpen]}
                        onPress={() => setModalVisible(true)}
                    >
                        <Text style={styles.textStyle}>Volunteer</Text>
                    </Pressable>

                    <Pressable
                        style={[styles.button, styles.buttonOpen]}
                        onPress={handleRemoveVolunteer}
                    >
                        <Text style={styles.textStyle}>Remove</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        flex: 1,
    },
    header: {
        textAlign: 'center',
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
    },
    section: {
        marginBottom: 30,
        borderBottomColor: 'red',
        borderBottomWidth: 2,
        padding: 20,
    },
    subHeader: {
        fontSize: 20,
        marginBottom: 10,
        color: '#333',
        fontWeight: 'bold',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        height: 'max-content',
        alignItems: 'center',
    },
    headings: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        fontWeight: 'bold',
    },
    cell: {
        flex: 1,
        color: '#555',
    },
    heading: {
        flex: 1,
        color: 'black',
        fontSize: 14,
        fontWeight: 'bold',
    },
    form: {
        marginTop: 10,
        width: '100%',
    },
    input: {
        padding: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        marginBottom: 20,
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    button: {
        borderRadius: 20,
        padding: 10,
        elevation: 2,
    },
    modalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 25,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '80%',
    },
    buttonOpen: {
        backgroundColor: 'tomato',
        width: '90%',
    },
    buttonClose: {
        backgroundColor: 'tomato',
        width: '30%',
    },
    buttonRegister: {
        backgroundColor: 'tomato',
        width: '40%',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    textStyle: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 18,
    },
    modalText: {
        marginBottom: 15,
        textAlign: 'center',
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    listContainer: {
        height: 500,
    },

    volunteerButtons: {
        gap: 10,
        marginBottom: 20,
        width: '100%',
        alignItems: 'center',
    },
});

export default VolunteerCopyScreen;