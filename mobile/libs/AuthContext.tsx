// libs/AuthContext.tsx
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type User = {
    id: string;
    firstname?: string;
    lastname?: string;
    phonenumber?: string;
    role?: string;
    address?: string;
    username?: string;
};

type AuthContextType = {
    user: User | null;
    loading: boolean;
    login: (userData: User) => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: async () => { },
    logout: async () => { },
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

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
