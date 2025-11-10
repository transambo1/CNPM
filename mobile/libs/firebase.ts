import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// Bạn có thể import thêm các dịch vụ khác như getFirestore

// TODO: Thay thế bằng cấu hình Firebase của bạn
const firebaseConfig = {
    apiKey: "AIzaSyB8A18L-TC1L-d85dN0Ge2LZ1Hcx_h6h2w",
    authDomain: "cnpm-6896a.firebaseapp.com",
    projectId: "cnpm-6896a",
    storageBucket: "cnpm-6896a.appspot.com",
    messagingSenderId: "116295716489",
    appId: "1:116295716489:web:80d51992691c2b17c18058",
    measurementId: "G-L7CFX3S5DJ"
};

// Khởi tạo Firebase
// --- SỬA LỖI LÀ ĐÂY ---
// Thêm "export" vào đầu
export const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
