package com.oik.common.utils;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

import java.util.Collections;

/**
 * Redis限流器
 */
@Component
public class RedisRateLimiter {
    private final RedisTemplate<String, Object> redisTemplate;

    public RedisRateLimiter(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * 令牌桶限流
     * @param key 限流key
     * @param capacity 桶容量
     * @param rate 令牌产生速率(个/秒)
     * @param tokens 请求令牌数
     * @return 是否允许通过
     */
    public boolean tryAcquire(String key, int capacity, int rate, int tokens) {
        String script =
                "local key = KEYS[1]\n" +
                        "local capacity = tonumber(ARGV[1])\n" +
                        "local rate = tonumber(ARGV[2])\n" +
                        "local tokens = tonumber(ARGV[3])\n" +
                        "local now = tonumber(ARGV[4])\n" +
                        "\n" +
                        "local last_tokens = tonumber(redis.call('hget', key, 'tokens') or capacity)\n" +
                        "local last_time = tonumber(redis.call('hget', key, 'time') or now)\n" +
                        "\n" +
                        "local delta = math.max(0, now - last_time)\n" +
                        "local new_tokens = math.min(capacity, last_tokens + delta * rate)\n" +
                        "\n" +
                        "if new_tokens < tokens then\n" +
                        "    return 0\n" +
                        "else\n" +
                        "    redis.call('hset', key, 'tokens', new_tokens - tokens)\n" +
                        "    redis.call('hset', key, 'time', now)\n" +
                        "    return 1\n" +
                        "end";

        DefaultRedisScript<Long> redisScript = new DefaultRedisScript<>();
        redisScript.setScriptText(script);
        redisScript.setResultType(Long.class);

        Long result = redisTemplate.execute(redisScript,
                Collections.singletonList(key),
                String.valueOf(capacity),
                String.valueOf(rate),
                String.valueOf(tokens),
                String.valueOf(System.currentTimeMillis() / 1000));
        return result != null && result == 1;
    }
}
