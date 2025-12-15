"use client";
import { useState, useEffect } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
    // Initialize state with a function to avoid reading localStorage during server rendering
    const [storedValue, setStoredValue] = useState<T>(initialValue);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        try {
            const item = window.localStorage.getItem(key);
            if (item) {
                setStoredValue(JSON.parse(item));
            } else {
                // If not found, persist the initial value
                window.localStorage.setItem(key, JSON.stringify(initialValue));
            }
            setIsInitialized(true);
        } catch (error) {
            console.error(error);
            setIsInitialized(true);
        }
    }, [key]); // Only re-run if key changes

    const setValue = (value: T | ((val: T) => T)) => {
        try {
            const valueToStore =
                value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            if (typeof window !== "undefined") {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.error(error);
        }
    };

    return [storedValue, setValue, isInitialized] as const;
}
