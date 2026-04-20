import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    // Initial theme from localStorage or system preference
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('minichat_theme');
        if (saved) return saved;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    useEffect(() => {
        // Persist theme
        localStorage.setItem('minichat_theme', theme);
        
        // Update document class
        const root = window.document.documentElement;
        root.classList.remove('light-theme', 'dark-theme');
        root.classList.add(`${theme}-theme`);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
