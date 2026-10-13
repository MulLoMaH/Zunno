package user_transport_http

import (
	"time"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	"github.com/google/uuid"
)

type UserDTOResponse struct {
	ID          uuid.UUID `json:"id"`
	Version     int64     `json:"version"`
	FullName    string    `json:"full_name"`
	Age         int       `json:"age"`
	PhoneNumber string    `json:"phone_number"`
	CreatedAt   time.Time `json:"created_at"`
}

func userDTOFromDomain(user domain.User) UserDTOResponse {
	return UserDTOResponse{
		ID:          user.ID,
		Version:     user.Version,
		FullName:    user.FullName,
		Age:         user.Age,
		PhoneNumber: user.PhoneNumber,
		CreatedAt:   user.CreatedAt,
	}
}

func usersDTOsFromDomains(users []domain.User) []UserDTOResponse {
	dtos := make([]UserDTOResponse, len(users))
	for i, user := range users {
		dtos[i] = userDTOFromDomain(user)
	}
	return dtos
}
