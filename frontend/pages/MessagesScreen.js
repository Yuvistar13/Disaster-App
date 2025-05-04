import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  serverTimestamp,
  updateDoc,
  getDocs,
  increment
} from 'firebase/firestore';
import { formatRelative } from 'date-fns';
import { db, auth, syncUserWithFirebase} from '../firebase';


const Stack = createStackNavigator();

// New Chat Screen - To start a new conversation
const NewChatScreen = ({ navigation, route }) => {
  const { currentUser } = route.params;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Query all users except the current user
        const q = query(
          collection(db, 'users'),
          where('uid', '!=', currentUser.uid)
        );
        
        const querySnapshot = await getDocs(q);
        const userData = querySnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        }));
        
        console.log(`Found ${userData.length} users`);
        setUsers(userData);
      } catch (error) {
        console.error("Error fetching users:", error);
        setError("Failed to load users. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, [currentUser]);

  const startConversation = async (otherUser) => {
    try {
      // Check if a conversation already exists between these users
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      let existingConversation = null;
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.participants.includes(otherUser.uid)) {
          existingConversation = {
            id: doc.id,
            ...data
          };
        }
      });
      
      if (existingConversation) {
        // Conversation exists, navigate to it
        console.log('Existing conversation found:', existingConversation.id);
        navigation.navigate('Chat', {
          conversationId: existingConversation.id,
          userId: currentUser.uid,
          otherUserId: otherUser.uid,
          userName: otherUser.displayName
        });
      } else {
        // No conversation exists, create a new one when the first message is sent
        console.log('No existing conversation, creating new one');
        navigation.navigate('Chat', {
          userId: currentUser.uid,
          otherUserId: otherUser.uid,
          userName: otherUser.displayName
        });
      }
    } catch (error) {
      console.error("Error starting conversation:", error);
      Alert.alert(
        "Error",
        "Failed to start conversation. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="tomato" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (users.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.emptyListText}>No users found</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={item => item.uid}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.userItem}
            onPress={() => startConversation(item)}
          >
            <Image
              source={{ uri: item.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.displayName || 'User')}&background=random` }}
              style={styles.avatar}
            />
            <View>
              <Text style={styles.userName}>{item.displayName || 'Unknown User'}</Text>
              {item.username && <Text style={styles.userDetail}>@{item.username}</Text>}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

// Individual Chat Screen
const ChatScreen = ({ route, navigation }) => {
  const { conversationId, userId, otherUserId, userName } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState(null);
  const flatListRef = useRef(null);

  // Mark conversation as read when entering
  useEffect(() => {
    const markAsRead = async () => {
      if (conversationId) {
        try {
          const conversationRef = doc(db, 'conversations', conversationId);
          await updateDoc(conversationRef, {
            [`unreadCount.${userId}`]: 0
          });
          console.log('Conversation marked as read');
        } catch (err) {
          console.error('Failed to mark conversation as read:', err);
        }
      }
    };
    
    markAsRead();
  }, [conversationId, userId]);

  // Subscribe to messages
  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      return;
    }

    try {
      const q = query(
        collection(db, `conversations/${conversationId}/messages`),
        orderBy('createdAt', 'asc')
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const messagesData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            text: data.text,
            createdAt: data.createdAt?.toDate() || new Date(),
            senderId: data.senderId
          };
        });
        
        setMessages(messagesData);
        setLoading(false);
      }, err => {
        console.error('Error fetching messages:', err);
        setError('Failed to load messages');
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error('Failed to set up messages listener:', err);
      setError('Failed to load messages');
      setLoading(false);
    }
  }, [conversationId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sendingMessage) return;
    
    const messageText = newMessage.trim();
    setNewMessage('');
    setSendingMessage(true);
    
    try {
      // Check if conversation exists, if not create it
      let conversationDocRef;
      let actualConversationId = conversationId;
      
      if (!conversationId) {
        // Create new conversation
        console.log('Creating new conversation between', userId, 'and', otherUserId);
        conversationDocRef = await addDoc(collection(db, 'conversations'), {
          participants: [userId, otherUserId],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: messageText,
          unreadCount: {
            [userId]: 0,
            [otherUserId]: 1
          }
        });
        actualConversationId = conversationDocRef.id;
        console.log('Created conversation with ID:', actualConversationId);
      } else {
        conversationDocRef = doc(db, 'conversations', conversationId);
        // Update conversation metadata
        await updateDoc(conversationDocRef, {
          updatedAt: serverTimestamp(),
          lastMessage: messageText,
          [`unreadCount.${otherUserId}`]: increment(1)
        });
      }
      
      // Add message to conversation
      const messageRef = await addDoc(collection(db, `conversations/${actualConversationId}/messages`), {
        text: messageText,
        createdAt: serverTimestamp(),
        senderId: userId
      });
      console.log('Message sent with ID:', messageRef.id);
      
      // If this was a new conversation, update navigation params
      if (!conversationId) {
        navigation.setParams({ conversationId: actualConversationId });
      }
      
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert(
        "Message Not Sent",
        "There was a problem sending your message. Please try again.",
        [{ text: "OK" }]
      );
      // Restore the message text so the user can try again
      setNewMessage(messageText);
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="tomato" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      keyboardVerticalOffset={90}
    >
      {messages.length === 0 ? (
        <View style={styles.emptyChat}>
          <Text style={styles.emptyChatText}>No messages yet</Text>
          <Text style={styles.emptyChatSubtext}>Send a message to start the conversation</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesContainer}
          renderItem={({ item }) => (
            <View style={[
              styles.messageItem,
              item.senderId === userId ? styles.sentMessage : styles.receivedMessage
            ]}>
              <Text style={styles.messageText}>{item.text}</Text>
              <Text style={styles.messageTime}>
                {formatRelative(item.createdAt, new Date())}
              </Text>
            </View>
          )}
        />
      )}
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          multiline
          maxLength={500}
        />
        <TouchableOpacity 
          style={[
            styles.sendButton,
            (!newMessage.trim() || sendingMessage) && styles.sendButtonDisabled 
          ]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || sendingMessage}
        >
          {sendingMessage ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

// List all conversations
const ConversationsScreen = ({ navigation, route }) => {
  const { currentUser } = route.params;
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUser || !currentUser.uid) {
      setError("No user information available");
      setLoading(false);
      return;
    }

    const userId = currentUser.uid;
    console.log("Fetching conversations for user:", userId);

    try {
      // Query for conversations where the current user is a participant
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId)
      );

      const unsubscribe = onSnapshot(q, async (querySnapshot) => {
        console.log(`Found ${querySnapshot.docs.length} conversations`);
        const conversationsData = [];
        
        const promises = querySnapshot.docs.map(async (docSnapshot) => {
          const conversationData = docSnapshot.data();
          const otherParticipantId = conversationData.participants.find(id => id !== userId);
          
          // Skip if couldn't find other participant (shouldn't happen in normal cases)
          if (!otherParticipantId) return null;
          
          // Get the other user's information
          try {
            // FIX: Use correct syntax for doc()
            const userDocRef = doc(db, 'users', otherParticipantId);
            const userDoc = await getDoc(userDocRef);
            
            if (!userDoc.exists()) {
              console.warn(`User ${otherParticipantId} not found in database`);
              return {
                id: docSnapshot.id,
                otherUser: {
                  uid: otherParticipantId,
                  displayName: 'Unknown User',
                  photoURL: null
                },
                lastMessage: conversationData.lastMessage || 'No messages yet',
                timestamp: conversationData.updatedAt?.toDate() || new Date(),
                unreadCount: conversationData.unreadCount?.[userId] || 0
              };
            }
            
            const userData = userDoc.data();
            
            return {
              id: docSnapshot.id,
              otherUser: {
                uid: otherParticipantId,
                displayName: userData?.displayName || 'Unknown User',
                photoURL: userData?.photoURL || null,
                username: userData?.username
              },
              lastMessage: conversationData.lastMessage || 'No messages yet',
              timestamp: conversationData.updatedAt?.toDate() || new Date(),
              unreadCount: conversationData.unreadCount?.[userId] || 0
            };
          } catch (err) {
            console.error("Error fetching user data:", err);
            return null;
          }
        });
        
        const results = await Promise.all(promises);
        const validResults = results.filter(item => item !== null);
        
        // Sort conversations by timestamp (newest first)
        validResults.sort((a, b) => b.timestamp - a.timestamp);
        setConversations(validResults);
        setLoading(false);
      }, error => {
        console.error("Error listening to conversations:", error);
        setError("Failed to load conversations. Please try again.");
        setLoading(false);
      });

      // Cleanup subscription on unmount
      return () => unsubscribe();
    } catch (err) {
      console.error("Failed to set up conversations listener:", err);
      setError("Failed to load conversations. Please try again.");
      setLoading(false);
    }
  }, [currentUser]);

  const goToChat = (conversationId, otherUser) => {
    navigation.navigate('Chat', {
      conversationId,
      userId: currentUser.uid,
      otherUserId: otherUser.uid,
      userName: otherUser.displayName
    });
  };

  const startNewChat = () => {
    // FIX: Use proper navigation - access the navigation provided via props
    navigation.navigate('NewChat', { currentUser });
  };

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="tomato" />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.emptyListText}>No conversations yet</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={startNewChat}
        >
          <Text style={styles.buttonText}>Start a new chat</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.conversationItem,
              item.unreadCount > 0 && styles.unreadConversation
            ]}
            onPress={() => goToChat(item.id, item.otherUser)}
          >
            <Image
              source={{ uri: item.otherUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.otherUser.displayName)}&background=random` }}
              style={styles.avatar}
            />
            <View style={styles.conversationDetails}>
              <View style={styles.conversationHeader}>
                <Text style={styles.userName}>{item.otherUser.displayName}</Text>
                <Text style={styles.timestamp}>
                  {formatRelative(item.timestamp, new Date())}
                </Text>
              </View>
              <View style={styles.messagePreviewContainer}>
                <Text 
                  style={[
                    styles.messagePreview,
                    item.unreadCount > 0 && styles.unreadText
                  ]}
                  numberOfLines={1}
                >
                  {item.lastMessage}
                </Text>
                {item.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={startNewChat}
      >
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>

    </View>
  );
};

// Main Messages Screen
const MessagesScreen = ({ route, navigation }) => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get the current user from route params or AsyncStorage
  useEffect(() => {
    const setupFirebase = async () => {
      try {
        
        // This will sync the authenticated user with Firebase
        const user = await syncUserWithFirebase();
        console.log("Firebase user synced:", user);
        
        if (user) {
          setFirebaseUser(user);
        } else {
          // If no user is returned, there might be an issue with authentication
          console.warn("No user found in Firebase sync");
        }
      } catch (error) {
        console.error("Firebase initialization error:", error);
        Alert.alert(
          "Authentication Error",
          "There was a problem connecting to the messaging service. Please try again later.",
          [{ text: "OK" }]
        );
      } finally {
        setIsLoading(false);
      }
    };
    
    setupFirebase();
  }, []);
  
  if (isLoading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="tomato" />
        <Text style={styles.loadingText}>Connecting to messaging service...</Text>
      </View>
    );
  }
  
  if (!firebaseUser) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>User not authenticated</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.buttonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName="ConversationsList"
      screenOptions={{
        headerStyle: {
          backgroundColor: 'tomato',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="ConversationsList"
        component={ConversationsScreen}
        initialParams={{ currentUser: firebaseUser }}
        options={{ 
          title: 'Messages',
        }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({ 
          title: route.params?.userName || 'Chat',
          headerBackTitle: 'Back'
        })}
      />
      <Stack.Screen
        name="NewChat"
        component={NewChatScreen}
        options={{ title: 'New Chat' }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  headerButton: {
    marginRight: 15,
  },
  headerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: 'tomato',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyListText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: 'tomato',
    textAlign: 'center',
    marginBottom: 10,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  unreadConversation: {
    backgroundColor: '#f0f7ff',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  conversationDetails: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  messagePreviewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messagePreview: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  unreadText: {
    fontWeight: 'bold',
    color: '#333',
  },
  unreadBadge: {
    backgroundColor: 'tomato',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  unreadBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  messagesContainer: {
    padding: 10,
    paddingBottom: 20,
  },
  messageItem: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 15,
    marginVertical: 5,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
    borderBottomRightRadius: 0,
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    borderBottomLeftRadius: 0,
  },
  messageText: {
    fontSize: 16,
  },
  messageTime: {
    fontSize: 10,
    color: '#666',
    alignSelf: 'flex-end',
    marginTop: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 20,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: 'tomato',
    borderRadius: 25,
    padding: 10,
    marginLeft: 10,
    height: 50,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ffaa99',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  userItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  userDetail: {
    fontSize: 14,
    color: '#666',
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyChatText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  emptyChatSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },

  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'tomato',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  floatingButtonText: {
    color: 'white',
    fontSize: 30,
    fontWeight: 'bold',
  },
});

export default MessagesScreen;