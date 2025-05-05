import React from "react";
import { useState, useEffect } from "react";
import { View, Text, SafeAreaView, StyleSheet, Pressable, Modal, TextInput, Switch, Alert, ActivityIndicator } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import OTPVerificationScreen from "./OTPVerificationScreen";
import { syncUserWithFirebase } from '../firebase'; 
import API_URL from "./API_URL";

const LoginScreen = ({ navigation }) => {
    const [registerModalVisible, setRegisterModalVisible] = useState(false);
    const [loginModalVisible, setLoginModalVisible] = useState(false);
    const [otpModalVisible, setOtpModalVisible] = useState(false);
    const [phoneExists, setPhoneExists] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [newUser, setNewUser] = useState({ 
        name: '', 
        phone_number: '', 
        username: '',
        password: '',
        is_verified: false,
    });

    const [loginCredentials, setLoginCredentials] = useState({
        username: '',
        password: '',
    });

    useEffect(() => {
        const checkLoginStatus = async () => {
            try {
                const token = await AsyncStorage.getItem('accessToken');
                if (token) {
                    navigation.navigate('Main');
                }
            } catch (error) {
                console.error("Error checking login status:", error);
            }
        };

        checkLoginStatus();
    }, [navigation]);

    const createUser = async () => {
        try {
            const response = await fetch(`${API_URL}/api/create_user/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newUser),
            });
            const data = await response.json();
            console.log("Response from server:", data);

            if (response.ok) {
                return { success: true, data };
            } else {
                return { success: false, error: data.error || "Unknown error" };
            }

        } catch (error) {
            console.error("Error creating user:", error);
            return { success: false, error: "Network error" };
        }
    };

    const handleInputChange = (name, value) => {
        setNewUser({ ...newUser, [name]: value });
    };

    const handleLoginInputChange = (name, value) => {
        setLoginCredentials({ ...loginCredentials, [name]: value });   
    };

    const handlePhoneNumberBlur = async () => {
        if (newUser.phone_number) {
            setIsLoading(true);
            const exists = await checkUserExists(newUser.phone_number);
            setPhoneExists(exists);
            setIsLoading(false);
        }
    };

    const checkUserExists = async (phoneNumber) => {
        try {
            const response = await fetch(`${API_URL}/api/check_user/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phone_number: phoneNumber }),
            });
            const data = await response.json();
            return data.exists;
        } catch (error) {
            console.error("Error checking user:", error);
            return false;
        }
    };

    const addUser = async () => {
        if (!newUser.name || !newUser.phone_number || !newUser.username || !newUser.password) {
            Alert.alert("Error", "Please fill out all fields");
            return;
        }
        
        setIsLoading(true);

        const exists = await checkUserExists(newUser.phone_number);
        
        if (exists) {

            const result = await createUser();
            
            if (result.success) {
                setRegisterModalVisible(false);
                Alert.alert("Success", "You've been registered!");

                await handleLogin(true);
            } else {
                if (result.error === 'User not verified') {
                    setRegisterModalVisible(false);
                    setOtpModalVisible(true);
                } else {
                    Alert.alert("Error", result.error || "Failed to register user");
                }
            }
        } else {
            setRegisterModalVisible(false);
            setOtpModalVisible(true);
        }
        
        setIsLoading(false);
    };

    const handleVerificationComplete = async () => {
        try {
            setIsLoading(true);
            setOtpModalVisible(false);
    
            const result = await createUser();
    
            if (result?.success !== false) {
                setNewUser({
                    name: '',
                    phone_number: '',
                    username: '',
                    password: '',
                    is_verified: false,
                });
                Alert.alert("Success", "You've been verified and registered!");

                await handleLogin(true);
            } else {
                Alert.alert("Error", result.error || "Failed to register after verification");
            }
        } catch (error) {
            Alert.alert("Error", "Something went wrong during verification.");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async (isAutoLogin = false) => {
        const credentials = isAutoLogin ? {
            username: newUser.username,
            password: newUser.password
        } : loginCredentials;

        if (!credentials.username || !credentials.password) {
            Alert.alert("Error", "Please fill out all fields");
            return;
        }

        setIsLoading(true);
        
        try {
            const response = await fetch(`${API_URL}/api/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log("Login response:", data);
                
                if (data.access && data.refresh) {
                    await storeUserData(data);
                    
                    await syncUserWithFirebase();
                    
                    navigateAfterLogin();
                } 
                else {
                    await getJWTToken(credentials);
                }
            } else {
                await getJWTToken(credentials);
            }
        } catch (error) {
            console.error("Error logging in:", error);
            Alert.alert("Error", "Network error");
        } finally {
            setIsLoading(false);
        }
    };

    const getJWTToken = async (credentials) => {
        try {
            const response = await fetch(`${API_URL}/api/token/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
            });
            
            const data = await response.json();
            
            if (response.ok) {
                await getUserData(credentials.username, data);
            } else {
                Alert.alert("Error", data.detail || "Login failed");
            }
        } catch (error) {
            console.error("Error getting JWT token:", error);
            Alert.alert("Error", "Failed to authenticate");
        }
    };

    const getUserData = async (username, tokenData) => {

        try {
            await storeUserData({
                ...tokenData,
                username: username,
            });

            await syncUserWithFirebase();
            
            navigateAfterLogin();
        } catch (error) {
            console.error("Error getting user data:", error);
            Alert.alert("Error", "Failed to get user data");
        }
    };

    const storeUserData = async (data) => {
        try {
            if (data.access) {
                await AsyncStorage.setItem('accessToken', data.access);
            }
            if (data.refresh) {
                await AsyncStorage.setItem('refreshToken', data.refresh);
            }

            const userData = {
                id: data.id,
                name: data.name || data.username,
                username: data.username,
                phone_number: data.phone_number || '',
                is_verified: data.is_verified !== undefined ? data.is_verified : true
            };
            
            await AsyncStorage.setItem('userData', JSON.stringify(userData));
        } catch (error) {
            console.error("Error storing user data:", error);
            throw error;
        }
    };

    const navigateAfterLogin = () => {
        setLoginModalVisible(false);
        setRegisterModalVisible(false);
        
        Alert.alert("Success", "Login successful!");
        
        navigation.navigate('Main');
    };

    return (
        <SafeAreaView style={styles.container}>
            {isLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="tomato" />
                </View>
            )}
            
            <View style={styles.section}>
                <Text style={styles.title}>DisasterApp</Text>

                <Pressable 
                    onPress={() => setRegisterModalVisible(true)}
                    style={styles.button}
                    disabled={isLoading}
                >
                    <Text style={styles.buttonText}>Sign Up</Text>
                </Pressable>

                <Pressable 
                    onPress={() => setLoginModalVisible(true)}
                    style={styles.button}
                    disabled={isLoading}
                >
                    <Text style={styles.buttonText}>Login</Text>
                </Pressable>

                {/* Register Modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={registerModalVisible}
                    onRequestClose={() => setRegisterModalVisible(false)}
                >
                    <View style={styles.centeredView}>
                        <View style={styles.modalView}>
                            <Text style={{fontWeight: "bold", fontSize: 18}}>Register</Text>
                            <View style={styles.form}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Your Name"
                                    value={newUser.name}
                                    onChangeText={(text) => handleInputChange('name', text)}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Phone Number"
                                    value={newUser.phone_number}
                                    onBlur={handlePhoneNumberBlur}
                                    keyboardType="phone-pad"
                                    onChangeText={(text) => handleInputChange('phone_number', text)}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Username"
                                    value={newUser.username}
                                    onChangeText={(text) => handleInputChange('username', text)}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Password"
                                    value={newUser.password}
                                    secureTextEntry={true}
                                    onChangeText={(text) => handleInputChange('password', text)}      
                                />
                            </View>
                            <View style={styles.modalButtons}>
                                <Pressable
                                    style={[styles.button, styles.buttonClose]}
                                    onPress={() => setRegisterModalVisible(false)}
                                    disabled={isLoading}
                                >
                                    <Text style={styles.textStyle}>Close</Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.button, styles.buttonRegister]}
                                    onPress={addUser}
                                    disabled={isLoading}
                                >
                                    <Text style={styles.textStyle}>Submit</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Login Modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={loginModalVisible}
                    onRequestClose={() => setLoginModalVisible(false)}
                >
                    <View style={styles.centeredView}>
                        <View style={styles.modalView}>
                            <Text style={{fontWeight: "bold", fontSize: 18}}>Login</Text>
                            <View style={styles.form}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Username"
                                    value={loginCredentials.username}
                                    onChangeText={(text) => handleLoginInputChange('username', text)}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Password"
                                    value={loginCredentials.password}
                                    secureTextEntry={true}
                                    onChangeText={(text) => handleLoginInputChange('password', text)}      
                                />
                            </View>
                            <View style={styles.modalButtons}>
                                <Pressable
                                    style={[styles.button, styles.buttonClose]}
                                    onPress={() => setLoginModalVisible(false)}
                                    disabled={isLoading}
                                >
                                    <Text style={styles.textStyle}>Close</Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.button, styles.buttonRegister]}
                                    onPress={() => handleLogin(false)}
                                    disabled={isLoading}
                                >
                                    <Text style={styles.textStyle}>Submit</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </Modal>
                           
                {/* OTP Verification Modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={otpModalVisible}
                    onRequestClose={() => setOtpModalVisible(false)}
                >
                    <View style={styles.centeredView}>
                        <View style={styles.modalView}>
                            <OTPVerificationScreen
                                phoneNumber={newUser.phone_number}
                                onVerificationComplete={handleVerificationComplete}
                                onCancel={() => {
                                    setOtpModalVisible(false);
                                    setRegisterModalVisible(true);
                                }}
                            />
                        </View>
                    </View>
                </Modal>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    title: {
        fontSize: 40,
        fontWeight: "bold",
        color: "tomato",
    },
    section: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 20,
    },
    button: {
        backgroundColor: "tomato",
        padding: 10,
        borderRadius: 20,
        width: 200,
        alignItems: "center",
    },
    buttonText: {
        color: "white",
        fontSize: 20,
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
});

export default LoginScreen;