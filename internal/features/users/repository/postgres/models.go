package users_postgres_repository

import (
	"time"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	"github.com/google/uuid"
)

type UserModel struct {
	Currency string
	ID           uuid.UUID
	Version      int64
	FullName     string
	Age          int
	PhoneNumber  string
	PasswordHash string
	CreatedAt    time.Time
}

// type UserModelResponse struct {
// 	ID           uuid.UUID
// 	FullName     string
// 	Age          int
// 	PhoneNumber  string
// }

func userDomainFromModels(users []UserModel) []domain.User {
	userDomains := make([]domain.User, len(users))

	for i, user := range users {
		userDomains[i] = domain.NewUserResponse(
			user.ID,
			user.Version,
			user.FullName,
			user.Age,
			user.PhoneNumber,
			user.CreatedAt,
		)
	}

	return userDomains
}
