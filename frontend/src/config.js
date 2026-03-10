// Centralized configuration for the frontend
const API_HOST = import.meta.env.VITE_API_HOST || 'localhost';
const API_PORT = import.meta.env.VITE_API_PORT || '5001';

// In production, Vite might be on HTTPS while backend is on HTTP or vice-versa
// For now, we follow the current project's assumption of HTTP
export const API_URL = `https://app.shoveitin.me`;
