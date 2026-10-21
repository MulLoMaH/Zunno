package telegram

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

type Client struct {
	token string
}

func NewClient(token string) *Client {
	return &Client{token: token}
}

func (c *Client) SendMessage(ctx context.Context, chatID int64, text string) error {
	if c.token == "" {
		return nil // Бот не настроен, тихо выходим
	}

	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", c.token)
	body := map[string]any{
		"chat_id":    chatID,
		"text":       text,
		"parse_mode": "HTML",
	}

	jsonBody, _ := json.Marshal(body)
	req, _ := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("telegram send: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("telegram api returned status %d", resp.StatusCode)
	}
	return nil
}
