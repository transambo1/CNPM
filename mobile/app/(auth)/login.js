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
    /* copy styles từ file bạn đang dùng */
    container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, textAlign: 'center', color: '#333' },
    input: { height: 50, borderColor: '#ddd', borderWidth: 1, borderRadius: 8, marginBottom: 15, paddingHorizontal: 15, fontSize: 16, backgroundColor: '#f9f9f9' },
    loginButton: { backgroundColor: '#007AFF', paddingVertical: 15, borderRadius: 8, alignItems: 'center' },
    loginButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    registerContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
    registerText: { fontSize: 14, color: '#555' },
    registerLink: { color: '#007AFF', fontWeight: 'bold' },
});

export default Login;
