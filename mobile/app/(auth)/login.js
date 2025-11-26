// app/(auth)/login.js
import React, { useState } from 'react';
import {
    View, Text, TextInput, StyleSheet, Alert, ActivityIndicator,
    TouchableOpacity, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { app } from '../../libs/firebase';
import { useAuth } from '../../libs/AuthContext';

const Login = () => {
    const [phonenumber, setPhonenumber] = useState('');
    const [password, setPassword] = useState('');
    const [loadingLocal, setLoadingLocal] = useState(false);
    const router = useRouter();
    const { login } = useAuth();

    const handleLogin = async () => {
        if (!phonenumber || !password) {
            Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại và mật khẩu');
            return;
        }
        setLoadingLocal(true);
        try {
            const db = getFirestore(app);
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('phonenumber', '==', phonenumber));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                Alert.alert('Đăng nhập thất bại', 'Số điện thoại không tồn tại.');
                setLoadingLocal(false);
                return;
            }

            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();

            if (userData.password === password) {
                const userForContext = {
                    id: userDoc.id,
                    phonenumber: userData.phonenumber,
                    firstname: userData.firstname,
                    lastname: userData.lastname,
                    address: userData.address,
                    role: userData.role,
                    username: userData.username,
                    email: userData.email,
                    restaurantId: userData.restaurantId ?? null,
                    restaurantName:
                        userData.restaurantName ??
                        userData.restaurant?.name ??
                        null,
                };
                await login(userForContext); // lưu vào context + AsyncStorage
                // vào màn hình phù hợp với phân quyền
                if (userData.role === 'restaurant') {
                    router.replace('/restaurant-admin');
                } else if (userData.role === 'admin') {
                    router.replace('/admin-overview');
                } else {
                    router.replace('/'); // nếu (tabs)/index là root, điều hướng về root path
                }
            } else {
                Alert.alert('Đăng nhập thất bại', 'Sai mật khẩu.');
            }
        } catch (error) {
            console.error('Lỗi đăng nhập: ', error);
            Alert.alert('Lỗi', 'Đã xảy ra lỗi. Vui lòng thử lại.');
        } finally {
            setLoadingLocal(false);
        }
    };

    const goToRegister = () => {
        router.push('/register'); // public route
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
            <Text style={styles.title}>Đăng nhập</Text>
            <TextInput style={styles.input} placeholder="Số điện thoại" value={phonenumber} onChangeText={setPhonenumber} keyboardType="phone-pad" placeholderTextColor="#888" />
            <TextInput style={styles.input} placeholder="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#888" />
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loadingLocal}>
                {loadingLocal ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.loginButtonText}>ĐĂNG NHẬP</Text>}
            </TouchableOpacity>
            <View style={styles.registerContainer}>
                <Text style={styles.registerText}>Chưa có tài khoản? </Text>
                <TouchableOpacity onPress={goToRegister}><Text style={[styles.registerText, styles.registerLink]}>Tạo tài khoản mới</Text></TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        padding: 24,
        backgroundColor: "#FFFFFF",
    },

    title: {
        fontSize: 30,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 32,
        color: "#FF7A00",          // cam thương hiệu
        letterSpacing: 0.5,
    },

    input: {
        height: 52,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        paddingHorizontal: 16,
        marginBottom: 16,
        fontSize: 15,
        backgroundColor: "#FAFAFA",

        // Shadow nhẹ
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
    },

    loginButton: {
        backgroundColor: "#FF7A00",      // cam
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",

        // bóng nhẹ xịn
        shadowColor: "#FF7A00",
        shadowOpacity: 0.3,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
        marginTop: 4,
    },

    loginButtonText: {
        color: "#FFF",
        fontWeight: "700",
        fontSize: 16,
        letterSpacing: 0.5,
    },

    registerContainer: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 26,
    },

    registerText: {
        fontSize: 14,
        color: "#555",
    },

    registerLink: {
        color: "#FF7A00",
        fontWeight: "700",
        marginLeft: 4,
    },
});

export default Login;
