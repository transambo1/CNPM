// ✅ AUTO DRONE SIMULATION – P1 Straight Route with Waypoints
// Drone ID: 3 | Speed: 35 km/h | Order: KHcQSA3pHqM12tl7CQwU

import { initializeApp } from "firebase/app";
import {
    getFirestore,
    doc,
    getDoc,
    updateDoc,
} from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyB8A18L-TC1L-d85dN0Ge2LZ1Hcx_h6h2w",
    authDomain: "cnpm-6896a.firebaseapp.com",
    projectId: "cnpm-6896a",
    storageBucket: "cnpm-6896a.appspot.com",
    messagingSenderId: "116295716489",
    appId: "1:116295716489:web:80d51992691c2b17c18058",
    measurementId: "G-L7CFX3S5DJ"
};

// -------------------- CONFIG ------------------------
const DRONE_ID = "2";
const ORDER_ID = "1gsWKEh725b3Kwa05BMn";
const SPEED_KMH = 30; // NORMAL SPEED
// -----------------------------------------------------

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Sleep helper
const wait = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Generate waypoints between 2 coordinates
 */
function generateWaypoints(start, end, numPoints = 8) {
    const waypoints = [];
    for (let i = 1; i <= numPoints; i++) {
        const lat = start.latitude + ((end.latitude - start.latitude) * i) / (numPoints + 1);
        const lng = start.longitude + ((end.longitude - start.longitude) * i) / (numPoints + 1);
        waypoints.push({ latitude: lat, longitude: lng });
    }
    return waypoints;
}

async function simulateDrone() {
    console.log("🚁 Starting drone simulation...");

    // 1️⃣ Get order
    const orderRef = doc(db, "orders", ORDER_ID);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) return console.log("❌ Order not found!");

    const order = orderSnap.data();

    // 2️⃣ Get restaurant info
    const restaurantRef = doc(db, "restaurants", order.restaurantId);
    const restaurantSnap = await getDoc(restaurantRef);
    if (!restaurantSnap.exists()) return console.log("❌ Restaurant not found!");

    const restaurantLocation = {
        latitude: restaurantSnap.data().latitude,
        longitude: restaurantSnap.data().longitude,
    };

    const customerLocation = {
        latitude: order.customer.latitude,
        longitude: order.customer.longitude,
    };

    console.log("🏁 Start:", restaurantLocation);
    console.log("🎯 Destination:", customerLocation);

    // 3️⃣ Generate waypoints
    const waypoints = generateWaypoints(restaurantLocation, customerLocation, 8);

    // 4️⃣ Move through waypoints
    for (let i = 0; i < waypoints.length; i++) {
        await updateDoc(doc(db, "drones", DRONE_ID), {
            latitude: waypoints[i].latitude,
            longitude: waypoints[i].longitude,
            status: "Đang giao",
            speed: SPEED_KMH,
        });

        console.log(`📍 Drone moved to waypoint ${i + 1}/${waypoints.length}`, waypoints[i]);
        await wait(1000);
    }

    // 5️⃣ Final destination
    await updateDoc(doc(db, "drones", DRONE_ID), {
        latitude: customerLocation.latitude,
        longitude: customerLocation.longitude,
        status: "Đã đến nơi",
        speed: 0,
    });

    console.log("✅ Drone reached the destination!");
    process.exit();
}

simulateDrone();
