
// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBJFN0ZyrBRdjSIz0I3uG5W7NcugN9wU2w",
  authDomain: "college-website-27cf1.firebaseapp.com",
  databaseURL: "https://college-website-27cf1-default-rtdb.firebaseio.com",
  projectId: "college-website-27cf1",
  storageBucket: "college-website-27cf1.firebasestorage.app",
  messagingSenderId: "622259084207",
  appId: "1:622259084207:web:73cbf66c2e8cf5d1716d5a",
  measurementId: "G-Q9SEHZZLY5"
};

// Initialize Firebase - only initialize once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const db = getFirestore(app, 'nagora');
const storage = getStorage(app);
const auth = getAuth(app);

// Analytics initialization - lazy and client-side only
let analytics = null;

/**
 * Get Analytics instance - only initializes in browser environment
 * Call this function when you need to use analytics
 */
export const getAnalyticsInstance = async () => {
  // Only initialize in browser environment
  if (typeof window === 'undefined') {
    return null;
  }
  
  if (!analytics) {
    const { getAnalytics, isSupported } = await import('firebase/analytics');
    
    // Check if analytics is supported in this environment
    const supported = await isSupported();
    if (supported) {
      analytics = getAnalytics(app);
    }
  }
  
  return analytics;
};

export { app, db, storage, auth };