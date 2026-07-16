package router

import (
	"net/http"
	"os"

	"myapp/internal/handler"
	"myapp/internal/middleware"
)

func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		frontendURL := os.Getenv("FRONTEND_URL")
		
		allowedOrigin := "https://selfcaresinners.com"
		if frontendURL != "" {
			allowedOrigin = frontendURL
		} else if origin != "" {
			allowedOrigin = origin
		}
				
		w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func SetupRouter(authHandler *handler.AuthHandler) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/auth/register", authHandler.Register)
	mux.HandleFunc("/auth/login", authHandler.Login)
	mux.HandleFunc("/auth/verify", authHandler.Verify)

	// Example protected route
	mux.Handle("/auth/me", middleware.JWTAuthMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// handle me
	})))

	// Public store catalog mock
	mux.HandleFunc("/public/store", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"items": [], "message": "Store catalog mock"}`))
	})

	return CORSMiddleware(mux)
}
