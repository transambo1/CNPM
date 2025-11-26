import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
} from "firebase/firestore";
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

    // ⚠️ Kiểm tra nếu không phải toàn số
    if (!/^[0-9]+$/.test(phonenumber)) {
      Alert.alert("Lỗi", "Số điện thoại chỉ được chứa số!");
      return;
    }

    setLoadingLocal(true);

    try {
      const usersRef = collection(db, "users");

      // 🔍 Kiểm tra trùng số điện thoại
      const q = query(usersRef, where("phonenumber", "==", phonenumber));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        Alert.alert("Lỗi", "Số điện thoại đã tồn tại! Vui lòng nhập số khác.");
        setLoadingLocal(false);
        return;
      }

      // ✅ Nếu chưa trùng → thêm mới vào Firestore
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
      Alert.alert("Lỗi", "Không thể đăng ký. Vui lòng thử lại sau!");
    } finally {
      setLoadingLocal(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <Text style={styles.title}>Tạo tài khoản</Text>

      <TextInput
        style={styles.input}
        placeholder="Họ"
        value={firstname}
        onChangeText={setFirstname}
        placeholderTextColor="#888"
      />

      <TextInput
        style={styles.input}
        placeholder="Tên"
        value={lastname}
        onChangeText={setLastname}
        placeholderTextColor="#888"
      />

      <TextInput
        style={styles.input}
        placeholder="Số điện thoại"
        value={phonenumber}
        keyboardType="phone-pad"
        onChangeText={setPhonenumber}
        placeholderTextColor="#888"
      />

      <TextInput
        style={styles.input}
        placeholder="Mật khẩu"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholderTextColor="#888"
      />

      <TouchableOpacity
        style={styles.registerButton}
        disabled={loadingLocal}
        onPress={handleRegister}
      >
        {loadingLocal ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.registerButtonText}>ĐĂNG KÝ</Text>
        )}
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
    color: "#FF7A00", // cam chủ đạo
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

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  registerButton: {
    backgroundColor: "#FF7A00",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",

    shadowColor: "#FF7A00",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginTop: 4,
  },

  registerButtonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.5,
  },

  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 26,
  },

  loginText: {
    color: "#555",
    fontSize: 14,
  },

  loginLink: {
    color: "#FF7A00",
    fontWeight: "700",
    marginLeft: 4,
  },
});

