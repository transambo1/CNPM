// libs/AuthContext.tsx
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';

import { app } from './firebase';

type User = {
    id: string;
    firstname?: string;
    lastname?: string;
    phonenumber?: string;
    role?: string;
    address?: string;
    username?: string;
    email?: string;
};

type AuthContextType = {
    user: User | null;
    loading: boolean;
    login: (userData: User) => Promise<void>;
    logout: () => Promise<void>;
    updateUser: (updates: Partial<User>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: async () => { },
    logout: async () => { },
    updateUser: async () => { },
});

export function useAuth() {
    return useContext(AuthContext);
}

type AuthProviderProps = {
    children: ReactNode;
};

const STORAGE_KEY = 'MY_APP_USER_V1';

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Load user từ AsyncStorage khi app start
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const raw = await AsyncStorage.getItem(STORAGE_KEY);
                if (!mounted) return;
                if (raw) {
                    setUser(JSON.parse(raw) as User);
                }
            } catch (e) {
                console.warn('Failed to load user from storage', e);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const login = async (userData: User) => {
        setUser(userData);
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
        } catch (e) {
            console.warn('Failed to save user to storage', e);
        }
        setLoading(false);
    };

    const logout = async () => {
        setUser(null);
        try {
            await AsyncStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            console.warn('Failed to remove user from storage', e);
        }
        setLoading(false);
    };

    const updateUser = async (updates: Partial<User>) => {
        if (!user) return;

        const nextUser = { ...user, ...updates };
        setUser(nextUser);

        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
        } catch (e) {
            console.warn('Failed to update user in storage', e);
        }

        try {
            const db = getFirestore(app);
            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, updates);
        } catch (e) {
            console.warn('Failed to update user profile in Firestore', e);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}
