import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

// FIREBASE PROD
const firebaseConfig = {
  apiKey: "AIzaSyDTWjmyZL0qkBihz5UhBU0YoA6IUL7xRWo",
  authDomain: "pelada-lavape.firebaseapp.com",
  projectId: "pelada-lavape",
  storageBucket: "pelada-lavape.firebasestorage.app",
  messagingSenderId: "251414215162",
  appId: "1:251414215162:web:7651dfa1037231d5564c43",
  measurementId: "G-9TGQ22F976"
}


// FIREBASE DEV
// const firebaseConfig = {
//   apiKey: "AIzaSyB_q7ZK4rArSil1GUaviNYXogev0PKXSMw",
//   authDomain: "pelada-dev.firebaseapp.com",
//   projectId: "pelada-dev",
//   storageBucket: "pelada-dev.firebasestorage.app",
//   messagingSenderId: "90312447912",
//   appId: "1:90312447912:web:e2ec01e386ea4f450fef9d",
//   measurementId: "G-M1Q0T94S2M"
// };

// Inicializa Firebase
const app = initializeApp(firebaseConfig)

const auth = getAuth(app)
const db = getFirestore(app)

export { auth, db }
