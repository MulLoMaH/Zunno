package telegram

import (
	"context"
	"strings"

	"go.uber.org/zap"
)

// LinkCodeHandler — коллбек, который резолвит код и привязывает chat_id.
// Реализация живёт вне core/telegram (в main.go), чтобы не тащить features в core.
type LinkCodeHandler func(ctx context.Context, code string, chatID int64) error

// Poller делает long-polling getUpdates и реагирует на /start <code>.
// Offset хранится в памяти: после рестарта первая итерация «поглощает»
// старые апдейты и не обрабатывает их повторно.
type Poller struct {
	client *Client
	onLink LinkCodeHandler
	logger *zap.Logger
}

func NewPoller(client *Client, onLink LinkCodeHandler, logger *zap.Logger) *Poller {
	return &Poller{client: client, onLink: onLink, logger: logger}
}

// Run блокирует горутину до отмены ctx. При ошибке сети возвращает ошибку —
// вызывающий main решает, retry'ить или завершаться.
func (p *Poller) Run(ctx context.Context) error {
	// Первый запрос: «проглатываем» всё, что накопилось до старта.
	var offset int64
	initial, err := p.client.GetUpdates(ctx, 0, 0)
	if err != nil {
		return err
	}
	if len(initial) > 0 {
		offset = initial[len(initial)-1].UpdateID + 1
		p.logger.Debug("telegram poller: skipped stale updates", zap.Int64("offset", offset))
	}

	for {
		select {
		case <-ctx.Done():
			return nil
		default:
		}

		updates, err := p.client.GetUpdates(ctx, offset, 30)
		if err != nil {
			if ctx.Err() != nil {
				return nil
			}
			return err
		}
		for _, u := range updates {
			offset = u.UpdateID + 1
			p.handle(ctx, u)
		}
	}
}

func (p *Poller) handle(ctx context.Context, u Update) {
	if u.Message == nil {
		return
	}
	chatID := u.Message.Chat.ID
	text := strings.TrimSpace(u.Message.Text)
	if text == "" {
		return
	}

	parts := strings.Fields(text)
	cmd := parts[0]
	if i := strings.Index(cmd, "@"); i >= 0 {
		cmd = cmd[:i] // /start@zunno_bot → /start
	}

	if cmd != "/start" {
		return
	}

	if len(parts) < 2 {
		_ = p.client.SendMessage(ctx, chatID,
			"👋 Привет! Откройте веб-приложение Zunno → «Привязать Telegram» → отправьте мне /start с кодом.")
		return
	}

	code := strings.ToUpper(parts[1])
	if err := p.onLink(ctx, code, chatID); err != nil {
		p.logger.Info("telegram link failed",
			zap.String("code", code),
			zap.Int64("chat_id", chatID),
			zap.Error(err),
		)
		_ = p.client.SendMessage(ctx, chatID,
			"❌ Код не найден или истёк. Сгенерируйте новый в приложении.")
		return
	}

	p.logger.Info("telegram linked", zap.Int64("chat_id", chatID))
	_ = p.client.SendMessage(ctx, chatID,
		"✅ Аккаунт успешно привязан к Zunno.\nТеперь вы будете получать уведомления о тратах и событиях.")
}
