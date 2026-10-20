package telegram

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type Update struct {
	UpdateID int64    `json:"update_id"`
	Message  *Message `json:"message,omitempty"`
}

type Message struct {
	MessageID int64  `json:"message_id"`
	Text      string `json:"text"`
	Chat      Chat   `json:"chat"`
}

type Chat struct {
	ID int64 `json:"id"`
}

type getUpdatesResponse struct {
	OK          bool     `json:"ok"`
	Result      []Update `json:"result"`
	Description string   `json:"description,omitempty"`
}

// GetUpdates — long polling: сервер держит запрос до timeoutSec секунд, если апдейтов нет.
// Таймаут клиента = timeoutSec + 10 сек на страховку от «зависшей» сети.
func (c *Client) GetUpdates(ctx context.Context, offset int64, timeoutSec int) ([]Update, error) {
	if c.token == "" {
		return nil, nil
	}

	reqCtx, cancel := context.WithTimeout(ctx, time.Duration(timeoutSec+10)*time.Second)
	defer cancel()

	url := fmt.Sprintf("https://api.telegram.org/bot%s/getUpdates", c.token)
	body := map[string]any{
		"offset":          offset,
		"timeout":         timeoutSec,
		"allowed_updates": []string{"message"},
	}
	jsonBody, _ := json.Marshal(body)

	req, _ := http.NewRequestWithContext(reqCtx, "POST", url, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("telegram getUpdates: %w", err)
	}
	defer resp.Body.Close()

	var out getUpdatesResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, fmt.Errorf("telegram getUpdates decode: %w", err)
	}
	if !out.OK {
		return nil, fmt.Errorf("telegram getUpdates: %s", out.Description)
	}
	return out.Result, nil
}
