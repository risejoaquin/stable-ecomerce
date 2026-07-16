package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	
	"myapp/internal/model"
	"myapp/internal/repository"
)

type AuthService struct {
	userRepo     *repository.UserRepository
	emailService *EmailService
}

func NewAuthService(userRepo *repository.UserRepository, emailService *EmailService) *AuthService {
	return &AuthService{
		userRepo:     userRepo,
		emailService: emailService,
	}
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"full_name"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (s *AuthService) Register(ctx context.Context, req RegisterRequest) (*model.User, error) {
	existingUser, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		return nil, err
	}
	if existingUser != nil {
		return nil, errors.New("email already exists")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		return nil, err
	}

	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return nil, err
	}
	verificationToken := hex.EncodeToString(tokenBytes)

	now := time.Now()
	user := &model.User{
		ID:                uuid.New(),
		Email:             req.Email,
		PasswordHash:      string(hash),
		FullName:          req.FullName,
		VerificationToken: &verificationToken,
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}
	verificationLink := fmt.Sprintf("%s/verify?token=%s", frontendURL, verificationToken)

	go func() {
		err := s.emailService.SendVerificationEmail(user.Email, user.FullName, verificationLink)
		if err != nil {
			log.Printf("Failed to send verification email to %s: %v", user.Email, err)
		}
	}()

	return user, nil
}

func (s *AuthService) VerifyEmail(ctx context.Context, token string) error {
	user, err := s.userRepo.FindByVerificationToken(ctx, token)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("invalid or expired token")
	}

	return s.userRepo.VerifyUser(ctx, user.ID)
}

func (s *AuthService) Login(ctx context.Context, req LoginRequest) (string, *model.User, error) {
	user, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		return "", nil, err
	}
	if user == nil {
		return "", nil, errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return "", nil, errors.New("invalid credentials")
	}

	if user.VerifiedAt == nil {
		return "", nil, errors.New("Email no verificado. Revisa tu correo.")
	}

	token, err := s.generateJWT(user)
	if err != nil {
		return "", nil, err
	}

	return token, user, nil
}

func (s *AuthService) generateJWT(user *model.User) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return "", errors.New("JWT_SECRET not configured")
	}

	claims := jwt.MapClaims{
		"user_id": user.ID.String(),
		"email":   user.Email,
		"exp":     time.Now().Add(time.Hour * 1).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
