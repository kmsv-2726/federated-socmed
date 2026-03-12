// Centralized API base URL — reads from localStorage (set when user picks a server),
// falls back to env variable or default.
export const getApiBaseUrl = () => {
    return localStorage.getItem('selectedServerApi') 
        || import.meta.env.VITE_API_BASE_URL 
        || "https://food-api-3hzj.onrender.com/api";
};
