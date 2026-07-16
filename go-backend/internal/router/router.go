package router

import (
	"net/http"

	"myapp/internal/handler"
	"myapp/internal/middleware"
)

func SetupRouter(authHandler *handler.AuthHandler) *http.ServeMux {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/auth/register", authHandler.Register)
	mux.HandleFunc("/api/auth/login", authHandler.Login)
	mux.HandleFunc("/api/auth/verify", authHandler.Verify)

	// Example protected route
	mux.Handle("/api/auth/me", middleware.JWTAuthMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// handle me
	})))

	return mux
}
