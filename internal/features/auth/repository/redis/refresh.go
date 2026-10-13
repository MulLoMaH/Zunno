package auth_redis_repository

import (
	"context"
	"errors"
	"time"

	"github.com/redis/go-redis/v9"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
)

type RefreshRepository struct {
	client *redis.Client
}

func NewRefreshRepository(client *redis.Client) *RefreshRepository {
	return &RefreshRepository{client: client}
}

func (r *RefreshRepository) Save(ctx context.Context, jti, userID string, ttl time.Duration) error {
	pipe := r.client.TxPipeline()
	pipe.Set(ctx, "refresh:"+jti, userID, ttl)
	pipe.SAdd(ctx, "user_refresh:"+userID, jti)
	pipe.Expire(ctx, "user_refresh:"+userID, ttl)
	_, err := pipe.Exec(ctx)
	return err
}

func (r *RefreshRepository) GetUserID(ctx context.Context, jti string) (string, error) {
	val, err := r.client.Get(ctx, "refresh:"+jti).Result()
	if errors.Is(err, redis.Nil) {
		return "", core_errors.ErrRefreshNotFound
	}
	return val, err
}

func (r *RefreshRepository) Delete(ctx context.Context, jti string) error {
	userID, err := r.client.Get(ctx, "refresh:"+jti).Result()
	if err == nil {
		r.client.SRem(ctx, "user_refresh:"+userID, jti)
	}
	return r.client.Del(ctx, "refresh:"+jti).Err()
}

func (r *RefreshRepository) DeleteAllForUser(ctx context.Context, userID string) error {
	jtis, err := r.client.SMembers(ctx, "user_refresh:"+userID).Result()
	if err != nil {
		return err
	}
	pipe := r.client.TxPipeline()
	for _, jti := range jtis {
		pipe.Del(ctx, "refresh:"+jti)
	}
	pipe.Del(ctx, "user_refresh:"+userID)
	_, err = pipe.Exec(ctx)
	return err
}
