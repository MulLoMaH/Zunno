package domain

import (
	"fmt"
	"regexp"
	"time"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	"github.com/google/uuid"
)

type User struct {
	Currency string
	ID           uuid.UUID
	Version      int64
	FullName     string
	Age          int
	PhoneNumber  string
	PasswordHash string
	CreatedAt    time.Time
}

func NewUser(id uuid.UUID, version int64, fullName string, age int, phoneNumber string, passwordHash string) User {
	return User{
		ID:           id,
		Version:      version,
		FullName:     fullName,
		Age:          age,
		PhoneNumber:  phoneNumber,
		PasswordHash: passwordHash,
		CreatedAt:    time.Now(),
	}
}

func NewUserUninitialized(fullName string, age int, phoneNumber string, passwordHash string) User {
	return User{
		ID:           uuid.New(),
		Version:      UninitializedVersion,
		FullName:     fullName,
		Age:          age,
		PhoneNumber:  phoneNumber,
		PasswordHash: passwordHash,
		CreatedAt:    time.Now(),
	}
}

func NewUserResponse(
	id uuid.UUID,
	version int64,
	fullName string,
	age int,
	phoneNumber string,
	createdAt time.Time,
) User {
	return User{
		ID:          id,
		Version:     version,
		FullName:    fullName,
		Age:         age,
		PhoneNumber: phoneNumber,
		CreatedAt:   createdAt,
	}
}

func (u *User) Validate() error {
	if err := u.ValidateProfile(); err != nil {
		return err
	}

	passwordHashLength := len([]rune(u.PasswordHash))
	if passwordHashLength < 8 || passwordHashLength > 100 {
		return fmt.Errorf(
			"password hash must be between 8 and 100 characters %d: %w",
			passwordHashLength,
			core_errors.ErrInvalidArgument,
		)
	}

	return nil
}

func (u *User) ValidateProfile() error {
	fullNameLength := len([]rune(u.FullName))
	if fullNameLength < 3 || fullNameLength > 100 {
		return fmt.Errorf(
			"full name must be between 3 and 100 characters %d: %w",
			fullNameLength,
			core_errors.ErrInvalidArgument,
		)
	}

	phoneNumberLength := len([]rune(u.PhoneNumber))
	if phoneNumberLength < 10 || phoneNumberLength > 15 {
		return fmt.Errorf(
			"phone number must be between 10 and 15 characters %d: %w",
			phoneNumberLength,
			core_errors.ErrInvalidArgument,
		)
	}

	re := regexp.MustCompile(`^\+[0-9]+$`)
	if !re.MatchString(u.PhoneNumber) {
		return fmt.Errorf(
			"phone number must be in the format +[0-9]: %w",
			core_errors.ErrInvalidArgument,
		)
	}

	if u.Age < 18 || u.Age > 100 {
		return fmt.Errorf(
			"age must be between 18 and 100: %w",
			core_errors.ErrInvalidArgument,
		)
	}

	return nil
}
