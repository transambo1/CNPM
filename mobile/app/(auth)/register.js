// app/(auth)/register.js
import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { getFirestore, collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { app } from "../../libs/firebase";

export default function Register() {
    const [firstname, setFirstname] = useState("");
    const [lastname, setLastname] = useState("");
    const [phonenumber, setPhonenumber] = useState("");
    const [password, setPassword] = useState("");
    const [loadingLocal, setLoadingLocal] = useState(false);
    const router = useRouter();
    const db = getFirestore(app);

    const handleRegister = async () => {
        if (!firstname || !lastname || !phonenumber || !password) {
            Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin!");
            return;
        }
        setLoadingLocal(true);
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("phonenumber", "==", phonenumber));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                Alert.alert("Lỗi", "Số điện thoại đã tồn tại!");
                setLoadingLocal(false);
                return;
            }

            await addDoc(usersRef, {
                firstname,
                lastname,
                phonenumber,
                password,
                role: "customer",
                username: firstname + " " + lastname,
                address: "",
            });

            Alert.alert("Thành công!", "Tạo tài khoản thành công!");
            router.replace("/login");
        } catch (error) {
            console.error(error);
            Alert.alert("Lỗi", "Không thể đăng ký. Thử lại sau!");
        } finally {
            setLoadingLocal(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
            <Text style={styles.title}>Tạo tài khoản</Text>
            <TextInput style={styles.input} placeholder="Họ" value={firstname} onChangeText={setFirstname} placeholderTextColor="#888" />
            <TextInput style={styles.input} placeholder="Tên" value={lastname} onChangeText={setLastname} placeholderTextColor="#888" />
            <TextInput style={styles.input} placeholder="Số điện thoại" value={phonenumber} keyboardType="phone-pad" onChangeText={setPhonenumber} placeholderTextColor="#888" />
            <TextInput style={styles.input} placeholder="Mật khẩu" secureTextEntry value={password} onChangeText={setPassword} placeholderTextColor="#888" />
            <TouchableOpacity style={styles.registerButton} disabled={loadingLocal} onPress={handleRegister}>
                {loadingLocal ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.registerButtonText}>ĐĂNG KÝ</Text>}
            </TouchableOpacity>
            <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Đã có tài khoản? </Text>
                <TouchableOpacity onPress={() => router.push("/login")}>
                    <Text style={[styles.loginText, styles.loginLink]}>Đăng nhập</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

/* styles same as before */
const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, textAlign: 'center', color: '#333' },
    input: { height: 50, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 15, paddingHorizontal: 15, backgroundColor: '#f9f9f9' },
    registerButton: { backgroundColor: '#007AFF', paddingVertical: 15, borderRadius: 8, alignItems: 'center' },
    registerButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    loginContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
    loginText: { color: '#555', fontSize: 14 },
    loginLink: { color: '#007AFF', fontWeight: 'bold' },
});
