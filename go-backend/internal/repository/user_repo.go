package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"myapp/internal/model"
)

type UserRepository struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*model.User, error) {
	query := `SELECT id, email, password_hash, full_name, verification_token, verified_at, created_at, updated_at FROM users WHERE email = $1`
	var user model.User
	err := r.db.QueryRow(ctx, query, email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.FullName,
		&user.VerificationToken, &user.VerifiedAt, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) FindByVerificationToken(ctx context.Context, token string) (*model.User, error) {
	query := `SELECT id, email, password_hash, full_name, verification_token, verified_at, created_at, updated_at FROM users WHERE verification_token = $1`
	var user model.User
	err := r.db.QueryRow(ctx, query, token).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.FullName,
		&user.VerificationToken, &user.VerifiedAt, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) Create(ctx context.Context, user *model.User) error {
	query := `INSERT INTO users (id, email, password_hash, full_name, verification_token, created_at, updated_at) 
	          VALUES ($1, $2, $3, $4, $5, $6, $7)`
	_, err := r.db.Exec(ctx, query, user.ID, user.Email, user.PasswordHash, user.FullName, user.VerificationToken, user.CreatedAt, user.UpdatedAt)
	return err
}

func (r *UserRepository) VerifyUser(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE users SET verified_at = $1, verification_token = NULL, updated_at = $2 WHERE id = $3`
	_, err := r.db.Exec(ctx, query, time.Now(), time.Now(), id)
	return err
}
