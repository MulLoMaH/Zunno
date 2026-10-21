package user_service

import (
	"context"
	"crypto/rand"
	"fmt"
	"time"

	"github.com/google/uuid"
)

const (
	telegramLinkCodeTTL    = 15 * time.Minute
	telegramLinkCodeLength = 6
	// Без I, O, 0, 1 — чтобы юзер не путал при ручном вводе
	telegramLinkAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
)

// GenerateTelegramLinkCode создаёт одноразовый код привязки Telegram и сохраняет его в БД с TTL.
func (s *UserService) GenerateTelegramLinkCode(
	ctx context.Context,
	userID uuid.UUID,
) (string, time.Time, error) {
	code, err := generateTelegramLinkCode()
	if err != nil {
		return "", time.Time{}, fmt.Errorf("generate link code: %w", err)
	}
	expiresAt := time.Now().Add(telegramLinkCodeTTL)
	if err := s.UsersRepository.SetTelegramLinkCode(ctx, userID, code, expiresAt); err != nil {
		return "", time.Time{}, fmt.Errorf("save link code: %w", err)
	}
	return code, expiresAt, nil
}

// UnlinkTelegram снимает привязку chat_id от аккаунта.
func (s *UserService) UnlinkTelegram(ctx context.Context, userID uuid.UUID) error {
	return s.UsersRepository.ClearTelegramChatID(ctx, userID)
}

// generateTelegramLinkCode — крипто-случайный код из 6 символов.
// Алфавит = 32 символа, 256 % 32 == 0 — смещение по модулю равномерное, без bias.
func generateTelegramLinkCode() (string, error) {
	buf := make([]byte, telegramLinkCodeLength)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	for i := range buf {
		buf[i] = telegramLinkAlphabet[int(buf[i])%len(telegramLinkAlphabet)]
	}
	return string(buf), nil
}
